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
 */
export class InverseSessionCoordinatorError extends Error {}

function nowIso(): string {
  return new Date().toISOString();
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
    nowIso: nowIso(),
  });

  const createResult = await createActiveSession(params.uid, active);
  if (!createResult.success) return err(new InverseSessionCoordinatorError(createResult.error.message));

  await applyNotificationIntents(sessionId, notifications);
  return ok(active);
}

export type InverseTimerDispatchOutcome =
  | { outcome: 'closed'; closedSession: InverseSession }
  | { outcome: 'noop' }
  | { outcome: 'rejected'; reason: string };

export async function dispatchInverseTimerEvent(
  uid: string,
  active: ActiveInverseSession,
  event: InverseTimerEvent
): AsyncResult<InverseTimerDispatchOutcome, InverseSessionCoordinatorError | ActiveSessionRepositoryError> {
  const result = transitionInverseTimer(active, event, { nowIso: nowIso() });

  if (result.kind === 'noop') return ok({ outcome: 'noop' });
  if (result.kind === 'rejected') return ok({ outcome: 'rejected', reason: result.reason });

  const categorySnapshot = await loadCategorySnapshot(uid, result.active.categoryId);
  const materialized = materializeInverseSession(result.active, result.closure, categorySnapshot);
  const closeResult = await closeActiveSession(uid, materialized);
  if (!closeResult.success) return err(closeResult.error);
  await applyNotificationIntents(active.sessionId, result.notifications);
  return ok({ outcome: 'closed', closedSession: materialized });
}
