import {
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';

import type { ActiveSession, ControlRequest } from '@/domain/entities/active-session';
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

interface RawActiveSession extends Omit<ActiveSession, 'lastCheckpointAt' | 'controlRequest'> {
  lastCheckpointAt: Timestamp | string | null;
  controlRequest?: RawControlRequest;
}

function timestampToIso(value: Timestamp | string | null | undefined, fallbackIso: string): string {
  if (!value) return fallbackIso;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  return value;
}

/** Convierte el documento crudo leído de Firestore (con `Timestamp`) al `ActiveSession` de dominio (con ISO). */
function fromFirestore(raw: RawActiveSession, readAtIso: string): ActiveSession {
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
    return ok(fromFirestore(raw, nowIso()));
  } catch (error) {
    return err(new ActiveSessionRepositoryError(`No se pudo leer la sesión activa: ${String(error)}`));
  }
}

/** Suscripción en vivo — la usan tanto el dominante (su propio checkpoint) como cualquier espectador. */
export function subscribeActiveSession(
  uid: string,
  onData: (active: ActiveSession | null) => void,
  onError: (error: ActiveSessionRepositoryError) => void
): Unsubscribe {
  return onSnapshot(
    activeSessionDocRef(uid),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const raw = snap.data({ serverTimestamps: 'estimate' }) as unknown as RawActiveSession;
      onData(fromFirestore(raw, nowIso()));
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
 * Cierre (T7/T10/T16/T17/T18 de docs/03-CRONOMETRO.md): batch atómico
 * `set(sessions/{sessionId})` + `delete(active/session)` (docs/02-DOMINIO.md sección 3.4 regla 5).
 * Si el `set` viola `firestore.rules` (Fase 4b) el batch completo falla y el singleton sigue intacto.
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
 * Cierre de una sesión zombie/expirada detectada por CUALQUIER lector (docs/03-CRONOMETRO.md
 * sección 9.2/9.3): misma operación que `closeActiveSession`, expuesta con nombre propio para que
 * `ActiveTimerRecoveryService` deje explícito en el código que no exige ser el dominante
 * (`firestore.rules` de Fase 4b: `allow delete: if isOwner(uid)`, sin más condición).
 */
export const closeStaleActiveSession = closeActiveSession;
