import type { ActiveInverseSession, DeviceId } from '../entities/active-session';
import { INVERSE_HARD_CAP_FACTOR, INVERSE_REMINDER_INTERVAL_SECONDS } from '../entities/active-session';
import type { SessionDeviceInfo } from '../entities/study-session';
import { isZombie, type InverseSessionClosure } from '../rules/materialize-session';
import { cancelAllIntent, scheduleIntent, type NotificationIntent } from './notification-intents';
import type { InverseTimerEvent } from './inverse-timer-events';

/**
 * Máquina del temporizador inverso (docs/03-CRONOMETRO.md sección 12). Mucho más simple que la de
 * estudio: no hay estados de espera ni `responseDeadlineAt` — solo "corriendo" hasta un cierre
 * (manual, tope duro `2·T`, cancelación simple o zombie).
 */

export interface InverseTimerContext {
  nowIso: string;
}

export type InverseTimerTransitionResult =
  | { kind: 'close'; active: ActiveInverseSession; closure: InverseSessionClosure; notifications: NotificationIntent[] }
  | { kind: 'noop' }
  | { kind: 'rejected'; reason: string };

function iso(msFromEpoch: number): string {
  return new Date(msFromEpoch).toISOString();
}

function ms(isoString: string): number {
  return Date.parse(isoString);
}

export interface StartInverseSessionInput {
  sessionId: string;
  userId: string;
  dominantDeviceId: DeviceId;
  name: string;
  categoryId: string;
  targetDurationSeconds: number;
  deviceInfo: SessionDeviceInfo;
  nowIso: string;
}

/**
 * `START_INVERSE`. La exclusión mutua con una sesión de estudio activa (sección 12.4, I-11) es una
 * consecuencia del mismo singleton `active/session` — la verifica la transacción `create` del
 * coordinador/repositorio, no esta función pura.
 */
export function startInverseSession(input: StartInverseSessionInput): {
  active: ActiveInverseSession;
  notifications: NotificationIntent[];
} {
  const { nowIso, targetDurationSeconds } = input;
  const active: ActiveInverseSession = {
    type: 'inverse',
    sessionId: input.sessionId,
    userId: input.userId,
    dominantDeviceId: input.dominantDeviceId,
    name: input.name,
    categoryId: input.categoryId,
    startedAt: nowIso,
    lastCheckpointAt: nowIso,
    deviceInfo: input.deviceInfo,
    targetDurationSeconds,
    remindersTriggered: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  const hardCapSeconds = targetDurationSeconds * INVERSE_HARD_CAP_FACTOR;
  return {
    active,
    notifications: [
      // Un solo recordatorio "repetible" cada 15 min (infra lo agenda como notificación
      // periódica de `expo-notifications`; no exige respuesta — sección 12.3).
      { action: 'schedule', purpose: 'inverse_reminder', fireAtIso: iso(ms(nowIso) + INVERSE_REMINDER_INTERVAL_SECONDS * 1000) },
      scheduleIntent('inverse_target_reached', iso(ms(nowIso) + targetDurationSeconds * 1000)),
      scheduleIntent('inverse_hard_cap', iso(ms(nowIso) + hardCapSeconds * 1000)),
    ],
  };
}

export function transitionInverseTimer(
  active: ActiveInverseSession,
  event: InverseTimerEvent,
  ctx: InverseTimerContext
): InverseTimerTransitionResult {
  const { nowIso } = ctx;

  switch (event.type) {
    case 'FINISH_INVERSE': {
      const closure: InverseSessionClosure = { status: 'completed', autoFinished: false, endedAt: nowIso };
      return { kind: 'close', active, closure, notifications: [cancelAllIntent()] };
    }

    case 'HARD_CAP_REACHED': {
      const hardCapIso = iso(ms(active.startedAt) + active.targetDurationSeconds * INVERSE_HARD_CAP_FACTOR * 1000);
      if (ms(nowIso) < ms(hardCapIso)) return { kind: 'rejected', reason: 'hard_cap_not_reached' };
      const closure: InverseSessionClosure = { status: 'completed', autoFinished: true, endedAt: hardCapIso };
      return { kind: 'close', active, closure, notifications: [cancelAllIntent()] };
    }

    case 'REQUEST_CANCEL_INVERSE':
    case 'DISMISS_CANCEL_INVERSE':
      // Confirmación simple, puramente local (sección 12.5) — sin checkpoint.
      return { kind: 'noop' };

    case 'CONFIRM_CANCEL_INVERSE': {
      const closure: InverseSessionClosure = { status: 'cancelled', autoFinished: false, endedAt: nowIso };
      return { kind: 'close', active, closure, notifications: [cancelAllIntent()] };
    }

    case 'ZOMBIE_TIMEOUT': {
      if (!isZombie(active, nowIso)) return { kind: 'rejected', reason: 'not_zombie' };
      const hardCapMs = ms(active.startedAt) + active.targetDurationSeconds * INVERSE_HARD_CAP_FACTOR * 1000;
      const endedAt = iso(Math.min(ms(nowIso), hardCapMs));
      const closure: InverseSessionClosure = { status: 'completed', autoFinished: true, endedAt };
      return { kind: 'close', active, closure, notifications: [cancelAllIntent()] };
    }

    default:
      return { kind: 'rejected', reason: 'unknown_event' };
  }
}
