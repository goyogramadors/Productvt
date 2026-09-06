import type { ActiveInverseSession, ActiveSession, ActiveStudySession } from '../entities/active-session';
import { INVERSE_HARD_CAP_FACTOR, INVERSE_REMINDER_INTERVAL_SECONDS } from '../entities/active-session';
import { scheduleIntent, type NotificationIntent } from '../machines/notification-intents';

/**
 * Reconstruye, de forma pura, las `NotificationIntent[]` que docs/03-CRONOMETRO.md sección 11
 * (estudio) / sección 12.3 (inverso) programaría al "entrar" al `currentState` vigente del
 * singleton — paso 5 de `ActiveSessionRecoveryService` (docs/04-SINCRONIZACION.md sección 8.1):
 * "se reprograman siempre, de forma idempotente (mismo identificador determinístico
 * `${sessionId}:${propósito}`, así que reprogramar una que seguía viva simplemente la reemplaza sin
 * duplicarla)". Solo el dominante llama a esto (sección 4.2: es el único que programa alarmas).
 */

function iso(msFromEpoch: number): string {
  return new Date(msFromEpoch).toISOString();
}

function ms(isoString: string): number {
  return Date.parse(isoString);
}

/** Instante en que termina el tramo en curso, considerando una reanudación tras almuerzo (sección 7.3). */
function segmentFireAtMs(active: ActiveStudySession): number {
  if (active.segmentResumedAt && active.segmentRemainingAtResumeSeconds !== undefined) {
    return ms(active.segmentResumedAt) + active.segmentRemainingAtResumeSeconds * 1000;
  }
  return ms(active.segmentStartedAt) + active.segmentTargetSeconds * 1000;
}

function resolveStudyRescheduleIntents(active: ActiveStudySession): NotificationIntent[] {
  switch (active.currentState) {
    case 'study_running':
      return [scheduleIntent('study_segment_finished', iso(segmentFireAtMs(active)))];
    case 'break_running':
      return [scheduleIntent('break_segment_finished', iso(segmentFireAtMs(active)))];
    case 'lunch_running':
      return [scheduleIntent('lunch_finished', iso(ms(active.segmentStartedAt) + active.segmentTargetSeconds * 1000))];
    case 'study_completed_waiting_response':
      return active.responseDeadlineAt ? [scheduleIntent('study_ack_expiration', active.responseDeadlineAt)] : [];
    case 'break_selection':
      return active.responseDeadlineAt ? [scheduleIntent('break_selection_expiration', active.responseDeadlineAt)] : [];
    case 'break_completed_waiting_response':
      return active.responseDeadlineAt ? [scheduleIntent('break_ack_expiration', active.responseDeadlineAt)] : [];
    default:
      // Estados terminales/idle: nunca deberían llegar aquí (el singleton no existe en esos casos),
      // pero devolver [] es seguro (no programa nada) en vez de lanzar.
      return [];
  }
}

function resolveInverseRescheduleIntents(active: ActiveInverseSession): NotificationIntent[] {
  const startMs = ms(active.startedAt);
  return [
    // `timerNotificationService` reprograma el recordatorio periódico como "cada 15 min desde ahora"
    // sin importar `fireAtIso` (mismo comportamiento que al iniciar la sesión, sección 12.3).
    scheduleIntent('inverse_reminder', iso(startMs + INVERSE_REMINDER_INTERVAL_SECONDS * 1000)),
    scheduleIntent('inverse_target_reached', iso(startMs + active.targetDurationSeconds * 1000)),
    scheduleIntent('inverse_hard_cap', iso(startMs + active.targetDurationSeconds * INVERSE_HARD_CAP_FACTOR * 1000)),
  ];
}

export function resolveRescheduleIntents(active: ActiveSession): NotificationIntent[] {
  return active.type === 'study' ? resolveStudyRescheduleIntents(active) : resolveInverseRescheduleIntents(active);
}
