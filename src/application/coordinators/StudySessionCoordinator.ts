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
 * completa): arranque (transacción `create`), cada evento de la máquina (checkpoint o cierre), y la
 * materialización final. Es la ÚNICA capa que combina la máquina de estados pura con
 * `ActiveSessionRepository`, `CategoryRepository`, `PresetRepository` y los servicios de
 * notificación/audio — ningún hook ni componente debe llamar a estos repositorios directamente
 * (decisiones-tomadas.md punto 9).
 *
 * LÍMITE DE FASE (4a, no 4b): usa siempre `dominantDeviceId = device.deviceId` del dispositivo que
 * llama; no hay lógica de cesión de control ni lectura de `controlRequest`. `nowIso()` es
 * `Date.now()` sin `clockOffset` — TODO de una línea marcado en `timer-engine.ts`.
 */
export class StudySessionCoordinatorError extends Error {}

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

/** Aplica notificaciones + (si hay `play_sound`) el audio propio del usuario, si configuró uno. */
async function applyTimerEffects(
  sessionId: string,
  notifications: Parameters<typeof applyNotificationIntents>[1],
  soundEnabled: boolean,
  volume: number
): Promise<void> {
  await applyNotificationIntents(sessionId, notifications);
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
    nowIso: nowIso(),
  });

  const createResult = await createActiveSession(params.uid, active);
  if (!createResult.success) return err(new StudySessionCoordinatorError(createResult.error.message));

  await applyTimerEffects(sessionId, notifications, params.soundEnabled, params.volume);
  return ok(active);
}

export type StudyTimerDispatchOutcome =
  | { outcome: 'updated'; active: ActiveStudySession }
  | { outcome: 'closed'; closedSession: StudySession }
  | { outcome: 'noop' }
  | { outcome: 'rejected'; reason: string };

export interface DispatchStudyTimerEventParams {
  uid: string;
  active: ActiveStudySession;
  event: StudyTimerEvent;
  soundEnabled: boolean;
  volume: number;
}

/** Aplica UN evento de la máquina de estados y persiste el resultado (checkpoint o cierre). */
export async function dispatchStudyTimerEvent(
  params: DispatchStudyTimerEventParams
): AsyncResult<StudyTimerDispatchOutcome, StudySessionCoordinatorError | ActiveSessionRepositoryError> {
  const result = transitionStudyTimer(params.active, params.event, { nowIso: nowIso() });

  if (result.kind === 'noop') return ok({ outcome: 'noop' });
  if (result.kind === 'rejected') return ok({ outcome: 'rejected', reason: result.reason });

  if (result.kind === 'update') {
    const checkpointResult = await checkpointActiveSession(params.uid, result.active);
    if (!checkpointResult.success) return err(checkpointResult.error);
    await applyTimerEffects(params.active.sessionId, result.notifications, params.soundEnabled, params.volume);
    return ok({ outcome: 'updated', active: result.active });
  }

  // result.kind === 'close'
  const categorySnapshot = await loadCategorySnapshot(params.uid, result.active.categoryId);
  const materialized = materializeStudySession(result.active, result.closure, categorySnapshot);
  const closeResult = await closeActiveSession(params.uid, materialized);
  if (!closeResult.success) return err(closeResult.error);
  await applyTimerEffects(params.active.sessionId, result.notifications, params.soundEnabled, params.volume);
  return ok({ outcome: 'closed', closedSession: materialized });
}
