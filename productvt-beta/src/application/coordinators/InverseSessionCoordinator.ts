import * as Crypto from 'expo-crypto';

import type { ActiveInverseSession, DeviceId } from '@/domain/entities/active-session';
import type { InverseSession } from '@/domain/entities/inverse-session';
import type { SessionDeviceInfo } from '@/domain/entities/study-session';
import { canBeDominant, type DeviceIdentity } from '@/domain/entities/device-identity';
import {
  startInverseSession as domainStartInverseSession,
  transitionInverseTimer,
} from '@/domain/machines/inverse-timer-machine';
import type { InverseTimerEvent } from '@/domain/machines/inverse-timer-events';
import { canStartNewActiveSession } from '@/domain/rules/active-session-guard';
import { materializeInverseSession } from '@/domain/rules/materialize-session';
import { closeLazySessionIfDue, inverseComputeClosure } from '@/domain/coordinators/close-lazy-session';
import { cancelAllIntent } from '@/domain/machines/notification-intents';
import { buildCategorySnapshot } from '@/domain/value-objects/category-snapshot';
import { getCategory } from '@/repositories/categories/categoryRepository';
import {
  ActiveSessionRepositoryError,
  closeActiveSession,
  createActiveSession,
  getActiveSession,
} from '@/repositories/active-session/activeSessionRepository';
import { type AsyncResult, err, ok } from '@/types/common';
import { applyNotificationIntents } from '@/features/timer/services/timerNotificationService';

/**
 * Equivalente a `StudySessionCoordinator.ts` para el temporizador inverso (docs/03-CRONOMETRO.md
 * sección 12). Más simple: no hay checkpoints incrementales de segmentos, solo arranque, cierre
 * (manual/tope duro/cancelación/zombie) y los recordatorios periódicos (delegados por completo a
 * `timerNotificationService`, que programa una única notificación repetible).
 *
 * Cierre perezoso vs. normal (docs/04-SINCRONIZACION.md sección 3): `HARD_CAP_REACHED` y
 * `ZOMBIE_TIMEOUT` (`closure.autoFinished === true`) pueden competir entre dispositivos —
 * `closeLazySessionIfDue`. `FINISH_INVERSE`/`CONFIRM_CANCEL_INVERSE` (`autoFinished === false`) solo
 * los ejecuta el dominante — `WriteBatch` de `closeActiveSession`.
 */
export class InverseSessionCoordinatorError extends Error {}

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

export interface StartInverseSessionParams {
  uid: string;
  name: string;
  categoryId: string;
  targetDurationSeconds: number;
  device: DeviceIdentity;
  /** `productvt.clockOffsetMs` vigente en este dispositivo (docs/04-SINCRONIZACION.md sección 6). */
  clockOffsetMs: number;
}

export async function startInverseSession(
  params: StartInverseSessionParams
): AsyncResult<ActiveInverseSession, InverseSessionCoordinatorError> {
  if (!canBeDominant(params.device.platform)) {
    return err(
      new InverseSessionCoordinatorError(
        'Este dispositivo no puede iniciar el temporizador todavía: en esta versión solo Android puede ser el dispositivo dominante.'
      )
    );
  }

  const existingResult = await getActiveSession(params.uid);
  if (!existingResult.success) return err(new InverseSessionCoordinatorError(existingResult.error.message));
  if (!canStartNewActiveSession(existingResult.data)) {
    return err(
      new InverseSessionCoordinatorError('Ya hay una sesión activa (de estudio o inversa). Cerrala antes de iniciar otra.')
    );
  }

  const sessionId = Crypto.randomUUID();
  const { active, notifications } = domainStartInverseSession({
    sessionId,
    userId: params.uid,
    dominantDeviceId: params.device.deviceId as DeviceId,
    name: params.name,
    categoryId: params.categoryId,
    targetDurationSeconds: params.targetDurationSeconds,
    deviceInfo: toSessionDeviceInfo(params.device),
    nowIso: nowIso(params.clockOffsetMs),
  });

  const createResult = await createActiveSession(params.uid, active);
  if (!createResult.success) return err(new InverseSessionCoordinatorError(createResult.error.message));

  await applyNotificationIntents(sessionId, notifications, params.clockOffsetMs);
  return ok(active);
}

export type InverseTimerDispatchOutcome =
  | { outcome: 'closed'; closedSession: InverseSession }
  /** Cierre perezoso (`HARD_CAP_REACHED`/`ZOMBIE_TIMEOUT`) resuelto vía `closeLazySessionIfDue` —
   * ver la nota equivalente en `StudySessionCoordinator.StudyTimerDispatchOutcome`. */
  | { outcome: 'closed_lazily' }
  | { outcome: 'noop' }
  | { outcome: 'rejected'; reason: string };

export async function dispatchInverseTimerEvent(
  uid: string,
  active: ActiveInverseSession,
  event: InverseTimerEvent,
  clockOffsetMs = 0
): AsyncResult<InverseTimerDispatchOutcome, InverseSessionCoordinatorError | ActiveSessionRepositoryError> {
  const nowMsValue = Date.now() + clockOffsetMs;
  const result = transitionInverseTimer(active, event, { nowIso: new Date(nowMsValue).toISOString() });

  if (result.kind === 'noop') return ok({ outcome: 'noop' });
  if (result.kind === 'rejected') return ok({ outcome: 'rejected', reason: result.reason });

  // El cierre "auto" (tope duro/zombie) puede competir entre dispositivos; el manual
  // (`FINISH_INVERSE`/`CONFIRM_CANCEL_INVERSE`) no (docs/04-SINCRONIZACION.md sección 3). A
  // diferencia de la máquina de estudio, aquí se decide por el `event.type` LITERAL que llegó —
  // nunca revalidando la condición de forma independiente — porque `transitionInverseTimer` jamás
  // redirige un cierre manual hacia uno de estos dos por su cuenta: un `FINISH_INVERSE` que
  // coincide por casualidad con `elapsed >= 2·T` sigue siendo un cierre manual, no perezoso.
  if (event.type === 'HARD_CAP_REACHED' || event.type === 'ZOMBIE_TIMEOUT') {
    const lazyResult = await closeLazySessionIfDue(uid, active.sessionId, inverseComputeClosure(event.type), nowMsValue);
    if (lazyResult === 'closed' || lazyResult === 'already_closed') {
      await applyNotificationIntents(active.sessionId, [cancelAllIntent()]);
      return ok({ outcome: 'closed_lazily' });
    }
    return ok({ outcome: 'noop' });
  }

  const categorySnapshot = await loadCategorySnapshot(uid, result.active.categoryId);
  const materialized = materializeInverseSession(result.active, result.closure, categorySnapshot);
  const closeResult = await closeActiveSession(uid, materialized);
  if (!closeResult.success) return err(closeResult.error);
  await applyNotificationIntents(active.sessionId, result.notifications, clockOffsetMs);
  return ok({ outcome: 'closed', closedSession: materialized });
}
