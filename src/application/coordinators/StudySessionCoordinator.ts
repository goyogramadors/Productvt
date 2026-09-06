import * as Crypto from 'expo-crypto';

import type { ActiveStudySession, DeviceId } from '@/domain/entities/active-session';
import type { SessionDeviceInfo, StudySession } from '@/domain/entities/study-session';
import { canBeDominant, type DeviceIdentity } from '@/domain/entities/device-identity';
import {
  startStudySession as domainStartStudySession,
  transitionStudyTimer,
} from '@/domain/machines/study-timer-machine';
import type { StudyTimerEvent } from '@/domain/machines/study-timer-events';
import { canStartNewActiveSession } from '@/domain/rules/active-session-guard';
import { materializeStudySession } from '@/domain/rules/materialize-session';
import { evaluateLazyClosure, closeLazySessionIfDue } from '@/domain/coordinators/close-lazy-session';
import { cancelAllIntent } from '@/domain/machines/notification-intents';
import { buildPresetSnapshot } from '@/domain/value-objects/preset-snapshot';
import { buildCategorySnapshot } from '@/domain/value-objects/category-snapshot';
import { getCategory } from '@/repositories/categories/categoryRepository';
import { getPreset } from '@/repositories/presets/presetRepository';
import {
  ActiveSessionRepositoryError,
  checkpointActiveSession,
  closeActiveSession,
  createActiveSession,
  getActiveSession,
} from '@/repositories/active-session/activeSessionRepository';
import { type AsyncResult, err, ok } from '@/types/common';
import { applyNotificationIntents } from '@/features/timer/services/timerNotificationService';
import { playCustomSound } from '@/features/timer/services/timerAudioService';

/**
 * Orquesta el ciclo de vida completo de una sesión de estudio (docs/03-CRONOMETRO.md, tabla T1-T19
 * completa): arranque (transacción `create`), cada evento de la máquina (checkpoint normal o
 * cierre), y la materialización final. Es la ÚNICA capa que combina la máquina de estados pura con
 * `ActiveSessionRepository`, `CategoryRepository`, `PresetRepository` y los servicios de
 * notificación/audio — ningún hook ni componente debe llamar a estos repositorios directamente
 * (decisiones-tomadas.md punto 9).
 *
 * Primitiva de Firestore por tipo de cierre (docs/04-SINCRONIZACION.md sección 3, tabla completa):
 * `dispatchStudyTimerEvent` no decide la primitiva mirando qué `event.type` recibió (T3/T4/T5/T6/T9/
 * T12 pueden VENIR como un evento normal y sin embargo resolver en un cierre por ventana vencida,
 * `guardResponseDeadline` de `study-timer-machine.ts`) — decide con `evaluateLazyClosure`, aplicado
 * sobre el MISMO `active`/`nowMs` de esta llamada: si está "due" (EXPIRE/ZOMBIE_TIMEOUT), usa la
 * transacción condicional `closeLazySessionIfDue` (fila 6, cualquier dispositivo compite); si no,
 * es un cierre normal (`END_SESSION`/`CONFIRM_CANCEL`, fila 5) y usa el `WriteBatch` de
 * `closeActiveSession`.
 */
export class StudySessionCoordinatorError extends Error {}

function nowIso(clockOffsetMs: number): string {
  return new Date(Date.now() + clockOffsetMs).toISOString();
}

function toSessionDeviceInfo(device: DeviceIdentity): SessionDeviceInfo {
  return {
    platform: device.platform,
    deviceName: device.deviceName,
    appVersion: device.appVersion,
    deviceId: device.deviceId,
  };
}

async function loadCategorySnapshot(
  uid: string,
  categoryId: string
): Promise<{ nameSnapshot: string; colorSnapshot: string } | undefined> {
  const result = await getCategory(uid, categoryId);
  if (!result.success || !result.data) return undefined;
  return buildCategorySnapshot(result.data);
}

/** Aplica notificaciones + (si hay `play_sound`) el audio propio del usuario, si configuró uno. */
async function applyTimerEffects(
  sessionId: string,
  notifications: Parameters<typeof applyNotificationIntents>[1],
  soundEnabled: boolean,
  volume: number,
  clockOffsetMs: number
): Promise<void> {
  await applyNotificationIntents(sessionId, notifications, clockOffsetMs);
  if (soundEnabled && notifications.some((n) => n.action === 'play_sound')) {
    await playCustomSound(volume);
  }
}

export interface StartStudySessionParams {
  uid: string;
  name: string;
  categoryId: string;
  presetId: string;
  device: DeviceIdentity;
  soundEnabled: boolean;
  volume: number;
  /** `productvt.clockOffsetMs` vigente en este dispositivo (docs/04-SINCRONIZACION.md sección 6). */
  clockOffsetMs: number;
}

export async function startStudySession(
  params: StartStudySessionParams
): AsyncResult<ActiveStudySession, StudySessionCoordinatorError> {
  if (!canBeDominant(params.device.platform)) {
    return err(
      new StudySessionCoordinatorError(
        'Este dispositivo no puede iniciar el cronómetro todavía: en esta versión solo Android puede ser el dispositivo dominante.'
      )
    );
  }

  const existingResult = await getActiveSession(params.uid);
  if (!existingResult.success) return err(new StudySessionCoordinatorError(existingResult.error.message));
  if (!canStartNewActiveSession(existingResult.data)) {
    return err(new StudySessionCoordinatorError('Ya hay una sesión activa (de estudio o inversa). Cerrala antes de iniciar otra.'));
  }

  const presetResult = await getPreset(params.uid, params.presetId);
  if (!presetResult.success) return err(new StudySessionCoordinatorError(presetResult.error.message));
  if (!presetResult.data) return err(new StudySessionCoordinatorError('No se encontró la razón de estudio seleccionada.'));

  const sessionId = Crypto.randomUUID();
  const { active, notifications } = domainStartStudySession({
    sessionId,
    userId: params.uid,
    dominantDeviceId: params.device.deviceId as DeviceId,
    name: params.name,
    categoryId: params.categoryId,
    presetSnapshot: buildPresetSnapshot(presetResult.data),
    deviceInfo: toSessionDeviceInfo(params.device),
    nowIso: nowIso(params.clockOffsetMs),
  });

  const createResult = await createActiveSession(params.uid, active);
  if (!createResult.success) return err(new StudySessionCoordinatorError(createResult.error.message));

  await applyTimerEffects(sessionId, notifications, params.soundEnabled, params.volume, params.clockOffsetMs);
  return ok(active);
}

export type StudyTimerDispatchOutcome =
  | { outcome: 'updated'; active: ActiveStudySession }
  | { outcome: 'closed'; closedSession: StudySession }
  /** Cierre perezoso (EXPIRE/ZOMBIE_TIMEOUT) resuelto vía `closeLazySessionIfDue`: no hay un
   * `StudySession` materializado que devolver aquí (se construyó y persistió DENTRO de la
   * transacción, con el `active` recién releído, no con el de esta llamada) — el llamador solo
   * necesita saber que la sesión ya no está activa. */
  | { outcome: 'closed_lazily' }
  | { outcome: 'noop' }
  | { outcome: 'rejected'; reason: string };

export interface DispatchStudyTimerEventParams {
  uid: string;
  active: ActiveStudySession;
  event: StudyTimerEvent;
  soundEnabled: boolean;
  volume: number;
  /** `productvt.clockOffsetMs` vigente en este dispositivo (docs/04-SINCRONIZACION.md sección 6). */
  clockOffsetMs: number;
}

/**
 * Aplica UN evento de la máquina de estados y persiste el resultado. Puede ejecutarse tanto desde
 * el dominante (cualquier evento) como desde un espectador (SOLO tiene sentido llamarlo con
 * EXPIRE — sección 4.3 punto 5: "el espectador también participa en el cierre perezoso"; cualquier
 * otro evento de un espectador debería haberse filtrado antes en la UI/hook, pero si llegara aquí
 * de todos modos, un checkpoint normal solo lo acepta `firestore.rules` si `dominantUnchanged()`,
 * lo cual no impide la escritura del lado del cliente pero sí documenta que la disciplina real es
 * de UI, no de reglas — docs/04-SINCRONIZACION.md sección 11, última nota).
 */
export async function dispatchStudyTimerEvent(
  params: DispatchStudyTimerEventParams
): AsyncResult<StudyTimerDispatchOutcome, StudySessionCoordinatorError | ActiveSessionRepositoryError> {
  const nowMsValue = Date.now() + params.clockOffsetMs;
  const result = transitionStudyTimer(params.active, params.event, { nowIso: new Date(nowMsValue).toISOString() });

  if (result.kind === 'noop') return ok({ outcome: 'noop' });
  if (result.kind === 'rejected') return ok({ outcome: 'rejected', reason: result.reason });

  if (result.kind === 'update') {
    const checkpointResult = await checkpointActiveSession(params.uid, result.active);
    if (!checkpointResult.success) return err(checkpointResult.error);
    await applyTimerEffects(params.active.sessionId, result.notifications, params.soundEnabled, params.volume, params.clockOffsetMs);
    return ok({ outcome: 'updated', active: result.active });
  }

  // result.kind === 'close': la primitiva depende de SI esta condición puede competir entre
  // dispositivos (docs/04-SINCRONIZACION.md sección 3) — nunca de qué `event.type` literal llegó
  // (T3/T4/T5/T6/T9/T12 pueden resolver en un cierre por ventana vencida vía `guardResponseDeadline`
  // de `study-timer-machine.ts` sin que el evento recibido haya sido `EXPIRE`). A diferencia de
  // `InverseSessionCoordinator` (que sí puede discriminar por `event.type` porque `FINISH_INVERSE`/
  // `CONFIRM_CANCEL_INVERSE` NUNCA se redirigen), aquí se revalida con `evaluateLazyClosure` sobre
  // el MISMO `active`/`nowMs` que ya usó `transitionStudyTimer` — matemáticamente coincide con
  // `result.closure.completionReason` en todo caso real (`guardResponseDeadline` aplica la misma
  // condición de deadline antes que cualquier otra rama), así que no hay riesgo de que un cierre
  // manual (`ended_by_user`/`cancelled_by_user`) se malinterprete como perezoso.
  const lazyCheck = evaluateLazyClosure(params.active, nowMsValue);
  if (lazyCheck.due) {
    const lazyResult = await closeLazySessionIfDue(params.uid, params.active.sessionId, lazyCheck.computeClosure, nowMsValue);
    if (lazyResult === 'closed' || lazyResult === 'already_closed') {
      await applyTimerEffects(params.active.sessionId, [cancelAllIntent()], params.soundEnabled, params.volume, params.clockOffsetMs);
      return ok({ outcome: 'closed_lazily' });
    }
    // 'not_yet_due': el reloj de este dispositivo se adelantó respecto al servidor; no hacemos nada,
    // la próxima evaluación (tick en vivo o recuperación) lo resolverá con datos más frescos.
    return ok({ outcome: 'noop' });
  }

  // Cierre normal (T7/T10/T16: `END_SESSION`/`CONFIRM_CANCEL`), sin competencia posible -> WriteBatch.
  const categorySnapshot = await loadCategorySnapshot(params.uid, result.active.categoryId);
  const materialized = materializeStudySession(result.active, result.closure, categorySnapshot);
  const closeResult = await closeActiveSession(params.uid, materialized);
  if (!closeResult.success) return err(closeResult.error);
  await applyTimerEffects(params.active.sessionId, result.notifications, params.soundEnabled, params.volume, params.clockOffsetMs);
  return ok({ outcome: 'closed', closedSession: materialized });
}
