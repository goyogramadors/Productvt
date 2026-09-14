import {
  deleteField,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';

import type { ActiveSession, ControlRequest, DeviceId } from '@/domain/entities/active-session';
import type { InverseSession } from '@/domain/entities/inverse-session';
import type { StudySession } from '@/domain/entities/study-session';
import { activeSessionDocRef, sessionDocRef } from '@/infrastructure/firebase/collections';
import { db } from '@/infrastructure/firebase/client';
import { type AsyncResult, err, ok } from '@/types/common';

/**
 * Repositorio del singleton `users/{uid}/active/session` (docs/02-DOMINIO.md sección 2.5/3.4/5.1;
 * decisiones-tomadas.md punto 9). Único archivo que llama a `firebase/firestore` para este
 * documento — `StudySessionCoordinator`/`InverseSessionCoordinator` consumen exclusivamente estas
 * funciones, nunca `firebase/firestore` directo.
 *
 * Reconciliación Firestore ↔ dominio: `lastCheckpointAt` (y `controlRequest.requestedAt`, sin uso
 * todavía en esta fase) se escriben con `serverTimestamp()` y se guardan como `Timestamp` en
 * Firestore, pero el dominio los modela como `string` ISO (docs/02-DOMINIO.md sección 6.1) — este
 * repositorio es la única frontera que convierte en ambos sentidos.
 */
export class ActiveSessionRepositoryError extends Error {}
export class ActiveSessionAlreadyExistsError extends ActiveSessionRepositoryError {}

interface RawControlRequest extends Omit<ControlRequest, 'requestedAt'> {
  requestedAt: Timestamp | string;
}

/** Exportado para `src/domain/coordinators/close-lazy-session.ts`, que relee este mismo documento
 * dentro de su propia transacción y necesita el mismo mapeo Firestore -> dominio. */
export interface RawActiveSession extends Omit<ActiveSession, 'lastCheckpointAt' | 'controlRequest'> {
  lastCheckpointAt: Timestamp | string | null;
  controlRequest?: RawControlRequest;
}

function timestampToIso(value: Timestamp | string | null | undefined, fallbackIso: string): string {
  if (!value) return fallbackIso;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  return value;
}

/**
 * Convierte el documento crudo leído de Firestore (con `Timestamp`) al `ActiveSession` de dominio
 * (con ISO). Exportado (no solo de uso interno) porque `closeLazySessionIfDue`
 * (`src/domain/coordinators/close-lazy-session.ts`) necesita el mismo mapeo para el documento que
 * relee dentro de su propia transacción — es la única otra frontera Firestore->dominio para este
 * singleton, y no debía duplicar esta lógica.
 */
export function activeSessionFromSnapshotData(raw: RawActiveSession, readAtIso: string): ActiveSession {
  const lastCheckpointAt = timestampToIso(raw.lastCheckpointAt, readAtIso);
  const controlRequest = raw.controlRequest
    ? { ...raw.controlRequest, requestedAt: timestampToIso(raw.controlRequest.requestedAt, readAtIso) }
    : undefined;
  return { ...raw, lastCheckpointAt, ...(controlRequest ? { controlRequest } : {}) } as ActiveSession;
}

/**
 * Quita claves con valor `undefined` (top-level) para que `setDoc`/`transaction.set` no fallen —
 * equivale a "campo ausente". Devuelve `Record<string, unknown>` a propósito (no `Partial<T>`):
 * el objeto real siempre trae todos los campos requeridos de `ActiveSession` más
 * `lastCheckpointAt` reemplazado por un `FieldValue`, una forma que el tipo generado de Firestore
 * (`WithFieldValue<ActiveSession>`) no expresa limpiamente para una unión discriminada — el
 * `as unknown as` en cada llamada documenta ese único punto de frontera.
 */
function stripUndefined(value: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    if (value[key] !== undefined) result[key] = value[key];
  }
  return result;
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function getActiveSession(uid: string): AsyncResult<ActiveSession | null, ActiveSessionRepositoryError> {
  try {
    const snap = await getDoc(activeSessionDocRef(uid));
    if (!snap.exists()) return ok(null);
    const raw = snap.data({ serverTimestamps: 'estimate' }) as unknown as RawActiveSession;
    return ok(activeSessionFromSnapshotData(raw, nowIso()));
  } catch (error) {
    return err(new ActiveSessionRepositoryError(`No se pudo leer la sesión activa: ${String(error)}`));
  }
}

/** Metadatos de confirmación del snapshot (docs/04-SINCRONIZACION.md sección 6.1/6.3): `true` solo
 * cuando el documento ya viene confirmado por el servidor — ni un eco optimista de una escritura
 * propia pendiente, ni una lectura servida desde caché offline. Es exactamente la condición que
 * dispara el recálculo de `clockOffsetMs` en `timerStore.ts`, para dominante y espectador por igual
 * (el dominante también está suscrito a este mismo snapshot). */
export interface ActiveSessionSnapshotMeta {
  isConfirmedByServer: boolean;
}

/** Suscripción en vivo — la usan tanto el dominante (su propio checkpoint) como cualquier espectador. */
export function subscribeActiveSession(
  uid: string,
  onData: (active: ActiveSession | null, meta: ActiveSessionSnapshotMeta) => void,
  onError: (error: ActiveSessionRepositoryError) => void
): Unsubscribe {
  return onSnapshot(
    activeSessionDocRef(uid),
    (snap) => {
      const meta: ActiveSessionSnapshotMeta = {
        isConfirmedByServer: !snap.metadata.hasPendingWrites && !snap.metadata.fromCache,
      };
      if (!snap.exists()) {
        onData(null, meta);
        return;
      }
      const raw = snap.data({ serverTimestamps: 'estimate' }) as unknown as RawActiveSession;
      onData(activeSessionFromSnapshotData(raw, nowIso()), meta);
    },
    (error) => onError(new ActiveSessionRepositoryError(`Error de sincronización de la sesión activa: ${String(error)}`))
  );
}

/**
 * Crea el singleton SOLO si no existe (transacción, invariante I-11 de docs/02-DOMINIO.md sección
 * 4). Falla con `ActiveSessionAlreadyExistsError` si ya hay una sesión activa de cualquier `type`
 * — es exactamente la exclusión mutua estudio/ocio de la sección 12.4 de docs/03-CRONOMETRO.md.
 */
export async function createActiveSession(
  uid: string,
  active: ActiveSession
): AsyncResult<void, ActiveSessionRepositoryError> {
  try {
    await runTransaction(db, async (transaction) => {
      const ref = activeSessionDocRef(uid);
      const existing = await transaction.get(ref);
      if (existing.exists()) {
        throw new ActiveSessionAlreadyExistsError('Ya existe una sesión activa para este usuario.');
      }
      const payload = stripUndefined({
        ...active,
        lastCheckpointAt: serverTimestamp(),
        updatedAt: nowIso(),
      });
      transaction.set(ref, payload as unknown as ActiveSession);
    });
    return ok(undefined);
  } catch (error) {
    if (error instanceof ActiveSessionAlreadyExistsError) return err(error);
    return err(new ActiveSessionRepositoryError(`No se pudo crear la sesión activa: ${String(error)}`));
  }
}

/**
 * Checkpoint: reemplaza el documento completo con el nuevo estado (docs/02-DOMINIO.md sección 3.4
 * regla 2). `lastCheckpointAt` siempre se pisa con `serverTimestamp()` aquí, nunca con el valor que
 * traiga `active` — las transiciones de dominio no lo tocan (ver nota en `study-timer-machine.ts`).
 */
export async function checkpointActiveSession(
  uid: string,
  active: ActiveSession
): AsyncResult<void, ActiveSessionRepositoryError> {
  try {
    const payload = stripUndefined({
      ...active,
      lastCheckpointAt: serverTimestamp(),
      updatedAt: nowIso(),
    });
    await setDoc(activeSessionDocRef(uid), payload as unknown as ActiveSession);
    return ok(undefined);
  } catch (error) {
    return err(new ActiveSessionRepositoryError(`No se pudo guardar el checkpoint: ${String(error)}`));
  }
}

/**
 * Cierre NORMAL (T7/T10/T16 de docs/03-CRONOMETRO.md: `END_SESSION`, `CONFIRM_CANCEL`) — SOLO el
 * dominante lo ejecuta, sin ningún otro dispositivo compitiendo por cerrar esta sesión en este
 * instante (docs/04-SINCRONIZACION.md sección 3, fila 5): `WriteBatch` atómico
 * `set(sessions/{sessionId})` + `delete(active/session)` (docs/02-DOMINIO.md sección 3.4 regla 5).
 * Si el `set` viola `firestore.rules` el batch completo falla y el singleton sigue intacto.
 *
 * NUNCA usar esta función para EXPIRE/ZOMBIE_TIMEOUT/HARD_CAP_REACHED (cierre PEREZOSO, fila 6 de
 * esa misma tabla): esos SÍ pueden competir entre dispositivos y exigen la transacción condicional
 * de `closeLazySessionIfDue` (`src/domain/coordinators/close-lazy-session.ts`), no un `WriteBatch`.
 */
export async function closeActiveSession(
  uid: string,
  materialized: StudySession | InverseSession
): AsyncResult<void, ActiveSessionRepositoryError> {
  try {
    const batch = writeBatch(db);
    batch.set(sessionDocRef(uid, materialized.id), materialized);
    batch.delete(activeSessionDocRef(uid));
    await batch.commit();
    return ok(undefined);
  } catch (error) {
    return err(new ActiveSessionRepositoryError(`No se pudo cerrar la sesión activa: ${String(error)}`));
  }
}

/**
 * Solicitud de control (docs/04-SINCRONIZACION.md sección 3 fila 3, sección 5.2): un espectador
 * Android que toca cualquier control deshabilitado dispara esto. `updateDoc` PARCIAL — toca
 * ÚNICAMENTE `controlRequest`/`updatedAt`, nunca el resto del documento (regla de seguridad
 * `onlyControlRequestChanged()`, docs/02-DOMINIO.md sección 5.3): un `setDoc` completo aquí sería
 * incorrecto porque el solicitante puede no tener la última copia exacta del resto del documento.
 */
export async function requestControlOfActiveSession(
  uid: string,
  request: Pick<ControlRequest, 'requesterDeviceId' | 'requesterPlatform' | 'requesterDeviceName'>
): AsyncResult<void, ActiveSessionRepositoryError> {
  try {
    const controlRequest = stripUndefined({
      requesterDeviceId: request.requesterDeviceId,
      requesterPlatform: request.requesterPlatform,
      requesterDeviceName: request.requesterDeviceName,
      requestedAt: serverTimestamp(),
    });
    await updateDoc(activeSessionDocRef(uid), { controlRequest, updatedAt: nowIso() });
    return ok(undefined);
  } catch (error) {
    return err(new ActiveSessionRepositoryError(`No se pudo solicitar el control: ${String(error)}`));
  }
}

/**
 * "No" del dominante (rechaza la solicitud) o retiro de una solicitud propia
 * (docs/04-SINCRONIZACION.md sección 5.4): `updateDoc` parcial que borra `controlRequest` sin tocar
 * `dominantDeviceId` — misma rama de regla que la solicitud original.
 */
export async function cancelControlRequest(uid: string): AsyncResult<void, ActiveSessionRepositoryError> {
  try {
    await updateDoc(activeSessionDocRef(uid), { controlRequest: deleteField(), updatedAt: nowIso() });
    return ok(undefined);
  } catch (error) {
    return err(new ActiveSessionRepositoryError(`No se pudo cancelar la solicitud de control: ${String(error)}`));
  }
}

export type TakeoverOutcome = 'took_control' | 'no_longer_valid';

/**
 * Toma de control (docs/04-SINCRONIZACION.md sección 3 fila 4, sección 5.2/5.3): `runTransaction`
 * que implementa literalmente `validTakeover()` (docs/02-DOMINIO.md sección 5.3) — lee
 * `controlRequest`, valida que `requesterDeviceId` siga siendo el que pide, y si es así escribe el
 * nuevo `dominantDeviceId`, borra `controlRequest` y renueva `lastCheckpointAt` (la toma de control
 * TAMBIÉN es un checkpoint: `validTakeover() && validCheckpoint()`).
 *
 * "El primero que aprieta" (R14) no es una carrera de UI: si el dominante actual (cede el control) y
 * el propio solicitante (se autoconfirma, sección 5.4) ejecutan esta misma función casi al mismo
 * tiempo, Firestore serializa los commits — la segunda transacción relee un documento sin
 * `controlRequest` y `no_longer_valid` no es un error, es "ya se resolvió" (sección 5.3 punto 3).
 */
export async function takeoverActiveSession(
  uid: string,
  requesterDeviceId: DeviceId
): AsyncResult<TakeoverOutcome, ActiveSessionRepositoryError> {
  try {
    const outcome = await runTransaction(db, async (transaction) => {
      const ref = activeSessionDocRef(uid);
      const snap = await transaction.get(ref);
      if (!snap.exists()) return 'no_longer_valid' as const;
      const raw = snap.data() as unknown as RawActiveSession;
      if (!raw.controlRequest || raw.controlRequest.requesterDeviceId !== requesterDeviceId) {
        return 'no_longer_valid' as const;
      }
      transaction.update(ref, {
        dominantDeviceId: requesterDeviceId,
        controlRequest: deleteField(),
        lastCheckpointAt: serverTimestamp(),
        updatedAt: nowIso(),
      });
      return 'took_control' as const;
    });
    return ok(outcome);
  } catch (error) {
    return err(new ActiveSessionRepositoryError(`No se pudo tomar el control: ${String(error)}`));
  }
}
