import type { ActiveStudySession, DeviceId } from '../entities/active-session';
import { LUNCH_DURATION_SECONDS } from '../entities/active-session';
import type {
  BreakSegment,
  CustomBreakSelection,
  SessionDeviceInfo,
  StudySegment,
} from '../entities/study-session';
import type { PresetSnapshot } from '../value-objects/preset-snapshot';
import { isZombie, type StudySessionClosure } from '../rules/materialize-session';
import {
  buildBreakSegment,
  computeAvailableBreakSeconds,
  computeGrantedBreakSeconds,
  validateCustomBreakChoice,
} from '../rules/break-bank';
import { isLunchAvailable } from '../rules/lunch';
import { resolveBreakResponseWindowSeconds, resolveStudyResponseWindowSeconds } from '../rules/response-window';
import { computeRemainingSeconds } from '../rules/timer-engine';
import {
  cancelAllIntent,
  cancelIntent,
  playSoundIntent,
  scheduleIntent,
  type NotificationIntent,
} from './notification-intents';
import type { StudyTimerEvent } from './study-timer-events';

/**
 * Máquina de estados del cronómetro de estudio (docs/03-CRONOMETRO.md sección 4, tabla T1-T19 —
 * ÚNICA autoridad de qué campo escribe cada transición; este archivo la implementa literalmente,
 * fila por fila, sin parafrasear reglas nuevas). Función pura: no importa React, Firebase ni APIs
 * de dispositivo (ARCHITECTURE.md sección 2/30.4). El tiempo (`nowIso`) siempre se recibe como
 * parámetro — nunca `Date.now()` interno — para que sea 100% testeable de forma determinística.
 *
 * `StudySessionCoordinator` (capa de aplicación) es quien: genera `sessionId`/`deviceId`, decide
 * el `nowIso` real (`Date.now() + clockOffsetMs`, docs/04-SINCRONIZACION.md sección 6), llama a
 * estas funciones, persiste el resultado contra `ActiveSessionRepository`/`SessionRepository`, y
 * ejecuta las `NotificationIntent[]` devueltas contra `timerNotificationService`/`timerAudioService`.
 */

export interface StudyTimerContext {
  nowIso: string;
}

export type StudyTimerTransitionResult =
  /** Checkpoint: `update()` del singleton con el nuevo estado. */
  | { kind: 'update'; active: ActiveStudySession; notifications: NotificationIntent[] }
  /**
   * Cierre (T7/T10/T16/T17/T18): el coordinador construye el documento final con
   * `materializeStudySession(active, closure, categorySnapshot)` y ejecuta el batch
   * `set(sessions/{id})` + `delete(active/session)`. `active` viaja sin cambios: ninguna fila de
   * cierre muta `studySegments`/`effectiveStudySeconds` antes de materializar.
   */
  | { kind: 'close'; active: ActiveStudySession; closure: StudySessionClosure; notifications: NotificationIntent[] }
  /** T14/T15: panel de cancelación local (abrir/cerrar). No hay checkpoint, `currentState` no cambia. */
  | { kind: 'noop' }
  /** Guarda no cumplida (evento inválido para el estado/momento actual). */
  | { kind: 'rejected'; reason: string };

function iso(msFromEpoch: number): string {
  return new Date(msFromEpoch).toISOString();
}

function ms(isoString: string): number {
  return Date.parse(isoString);
}

/** T17: cierre por ventana de respuesta vencida. `endedAt` es el vencimiento exacto, no `now`. */
function buildExpireResult(active: ActiveStudySession, deadlineIso: string): StudyTimerTransitionResult {
  const closure: StudySessionClosure = {
    terminalState: 'session_expired',
    completionReason: 'expired_no_response',
    endedAt: deadlineIso,
  };
  return { kind: 'close', active, closure, notifications: [cancelAllIntent()] };
}

/** Guarda compartida por T3/T4/T5/T6/T7/T9/T10/T12: si el plazo ya venció, EXPIRE gana (sección 8.2/9.2). */
function guardResponseDeadline(
  active: ActiveStudySession,
  nowIso: string
): StudyTimerTransitionResult | null {
  if (!active.responseDeadlineAt) return null;
  if (ms(nowIso) < ms(active.responseDeadlineAt)) return null;
  return buildExpireResult(active, active.responseDeadlineAt);
}

export interface StartStudySessionInput {
  sessionId: string;
  userId: string;
  dominantDeviceId: DeviceId;
  name: string;
  categoryId: string;
  presetSnapshot: PresetSnapshot;
  deviceInfo: SessionDeviceInfo;
  nowIso: string;
}

/**
 * T1: `START_SESSION`. No recibe un `active` previo (lo crea) por eso no vive dentro de
 * `transitionStudyTimer`. Las guardas de existencia (I-11: no hay `active/session` previo; no hay
 * `ActiveInverseSession` activo, sección 12.4) requieren leer Firestore — las verifica
 * `StudySessionCoordinator` con una transacción `create`, no esta función pura. `canBeDominant`
 * (solo Android en V1, docs/02-DOMINIO.md sección 3.5) también la verifica el coordinador antes de
 * llamar aquí.
 */
export function startStudySession(input: StartStudySessionInput): {
  active: ActiveStudySession;
  notifications: NotificationIntent[];
} {
  const { nowIso } = input;
  const segmentTargetSeconds = input.presetSnapshot.studyDurationMinutes * 60;
  const active: ActiveStudySession = {
    type: 'study',
    sessionId: input.sessionId,
    userId: input.userId,
    dominantDeviceId: input.dominantDeviceId,
    name: input.name,
    categoryId: input.categoryId,
    startedAt: nowIso,
    lastCheckpointAt: nowIso,
    deviceInfo: input.deviceInfo,
    presetSnapshot: input.presetSnapshot,
    currentState: 'study_running',
    segmentStartedAt: nowIso,
    segmentTargetSeconds,
    cyclesCompleted: 0,
    cyclesSinceLunch: 0,
    lunchUsed: false,
    effectiveStudySeconds: 0,
    bankRemainingSeconds: 0,
    studySegments: [],
    breakSegments: [],
    lunchSegments: [],
    customBreakSelections: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  return {
    active,
    notifications: [scheduleIntent('study_segment_finished', iso(ms(nowIso) + segmentTargetSeconds * 1000))],
  };
}

/**
 * T2-T19 (salvo T1, ver `startStudySession`, y T19, limpieza local sin checkpoint — sección 4.4).
 * Despacha por `active.currentState` + `event.type`, aplicando literalmente la fila de la tabla de
 * docs/03-CRONOMETRO.md sección 4 que corresponde.
 */
export function transitionStudyTimer(
  active: ActiveStudySession,
  event: StudyTimerEvent,
  ctx: StudyTimerContext
): StudyTimerTransitionResult {
  const { nowIso } = ctx;

  switch (event.type) {
    case 'HYDRATE':
      // Recuperación tras cierre inesperado del dominante: acepta el singleton tal cual sin
      // aplicar ninguna regla de negocio (eso lo hace `ActiveSessionRecoveryService` antes de
      // llamar aquí, comparando `EXPIRE`/`ZOMBIE_TIMEOUT` según corresponda —
      // docs/04-SINCRONIZACION.md sección 8.1). Nota: en la implementación actual, la hidratación
      // real de `timerStore.ts` no pasa por este evento (evitaría re-escribir un checkpoint
      // idéntico en Firestore en cada arranque) — queda aquí para quien construya un reductor local
      // explícito y necesite una transición de dominio para "aceptar lo que diga el servidor".
      return { kind: 'update', active: event.payload.active, notifications: [] };

    case 'STUDY_FINISHED': {
      // T2
      if (active.currentState !== 'study_running') return { kind: 'rejected', reason: 'not_study_running' };
      const deadlineMs = active.segmentResumedAt
        ? ms(active.segmentResumedAt) + (active.segmentRemainingAtResumeSeconds ?? 0) * 1000
        : ms(active.segmentStartedAt) + active.segmentTargetSeconds * 1000;
      if (ms(nowIso) < deadlineMs) return { kind: 'rejected', reason: 'segment_not_finished' };

      const cycleNumber = active.cyclesCompleted + 1;
      const segment: StudySegment = {
        start: active.segmentStartedAt,
        end: nowIso,
        durationSeconds: active.segmentTargetSeconds,
        cycleNumber,
      };
      const windowSeconds = resolveStudyResponseWindowSeconds({
        durationSeconds: segment.durationSeconds,
        cycleNumber,
        cyclesBeforeLongBreak: active.presetSnapshot.cyclesBeforeLongBreak,
      });
      const next: ActiveStudySession = {
        ...active,
        studySegments: [...active.studySegments, segment],
        cyclesCompleted: cycleNumber,
        cyclesSinceLunch: active.cyclesSinceLunch + 1,
        effectiveStudySeconds: active.effectiveStudySeconds + segment.durationSeconds,
        currentState: 'study_completed_waiting_response',
        segmentStartedAt: nowIso,
        segmentTargetSeconds: windowSeconds,
        responseDeadlineAt: iso(ms(nowIso) + windowSeconds * 1000),
        segmentResumedAt: undefined,
        segmentRemainingAtResumeSeconds: undefined,
      };
      return {
        kind: 'update',
        active: next,
        notifications: [
          cancelIntent('study_segment_finished'),
          playSoundIntent('study_finished'),
          scheduleIntent('study_ack_expiration', next.responseDeadlineAt as string),
        ],
      };
    }

    case 'ACK_STUDY_FINISHED': {
      // T3
      if (active.currentState !== 'study_completed_waiting_response') {
        return { kind: 'rejected', reason: 'not_waiting_ack' };
      }
      const expired = guardResponseDeadline(active, nowIso);
      if (expired) return expired;

      const lastSegment = active.studySegments[active.studySegments.length - 1];
      const windowSeconds = resolveStudyResponseWindowSeconds({
        durationSeconds: lastSegment.durationSeconds,
        cycleNumber: lastSegment.cycleNumber,
        cyclesBeforeLongBreak: active.presetSnapshot.cyclesBeforeLongBreak,
      });
      const next: ActiveStudySession = {
        ...active,
        currentState: 'break_selection',
        segmentStartedAt: nowIso,
        segmentTargetSeconds: windowSeconds,
        responseDeadlineAt: iso(ms(nowIso) + windowSeconds * 1000),
      };
      return {
        kind: 'update',
        active: next,
        notifications: [
          cancelIntent('study_ack_expiration'),
          scheduleIntent('break_selection_expiration', next.responseDeadlineAt as string),
        ],
      };
    }

    case 'CHOOSE_SUGGESTED_BREAK': {
      // T4
      if (active.currentState !== 'break_selection') return { kind: 'rejected', reason: 'not_break_selection' };
      const expired = guardResponseDeadline(active, nowIso);
      if (expired) return expired;

      const grantedSeconds = computeGrantedBreakSeconds(active.cyclesCompleted, active.presetSnapshot);
      if (grantedSeconds === 0) return applySkipBreak(active, nowIso);

      const next: ActiveStudySession = {
        ...active,
        currentState: 'break_running',
        segmentStartedAt: nowIso,
        segmentTargetSeconds: grantedSeconds,
        responseDeadlineAt: undefined,
      };
      return {
        kind: 'update',
        active: next,
        notifications: [
          cancelIntent('break_selection_expiration'),
          scheduleIntent('break_segment_finished', iso(ms(nowIso) + grantedSeconds * 1000)),
        ],
      };
    }

    case 'CHOOSE_CUSTOM_BREAK': {
      // T5
      if (active.currentState !== 'break_selection') return { kind: 'rejected', reason: 'not_break_selection' };
      const expired = guardResponseDeadline(active, nowIso);
      if (expired) return expired;

      const grantedSeconds = computeGrantedBreakSeconds(active.cyclesCompleted, active.presetSnapshot);
      const availableSeconds = computeAvailableBreakSeconds(active.bankRemainingSeconds, grantedSeconds);
      const { chosenSeconds } = event.payload;
      if (!validateCustomBreakChoice(chosenSeconds, availableSeconds)) {
        return { kind: 'rejected', reason: 'invalid_custom_break_choice' };
      }

      const selection: CustomBreakSelection = {
        cycleNumber: active.cyclesCompleted,
        availableSeconds,
        chosenSeconds,
        selectedAt: nowIso,
      };

      if (chosenSeconds === 0) {
        const skipped = applySkipBreak(active, nowIso);
        if (skipped.kind !== 'update') return skipped;
        return {
          ...skipped,
          active: { ...skipped.active, customBreakSelections: [...active.customBreakSelections, selection] },
        };
      }

      const next: ActiveStudySession = {
        ...active,
        customBreakSelections: [...active.customBreakSelections, selection],
        currentState: 'break_running',
        segmentStartedAt: nowIso,
        segmentTargetSeconds: chosenSeconds,
        responseDeadlineAt: undefined,
      };
      return {
        kind: 'update',
        active: next,
        notifications: [
          cancelIntent('break_selection_expiration'),
          scheduleIntent('break_segment_finished', iso(ms(nowIso) + chosenSeconds * 1000)),
        ],
      };
    }

    case 'SKIP_BREAK': {
      // T6
      if (active.currentState !== 'break_selection') return { kind: 'rejected', reason: 'not_break_selection' };
      const expired = guardResponseDeadline(active, nowIso);
      if (expired) return expired;
      return applySkipBreak(active, nowIso);
    }

    case 'END_SESSION': {
      // T7 (break_selection) / T10 (break_completed_waiting_response)
      if (active.currentState !== 'break_selection' && active.currentState !== 'break_completed_waiting_response') {
        return { kind: 'rejected', reason: 'end_session_not_available' };
      }
      const expired = guardResponseDeadline(active, nowIso);
      if (expired) return expired;

      const closure: StudySessionClosure = {
        terminalState: 'session_completed',
        completionReason: 'ended_by_user',
        endedAt: nowIso,
      };
      return { kind: 'close', active, closure, notifications: [cancelAllIntent()] };
    }

    case 'BREAK_FINISHED': {
      // T8
      if (active.currentState !== 'break_running') return { kind: 'rejected', reason: 'not_break_running' };
      const deadlineMs = active.segmentResumedAt
        ? ms(active.segmentResumedAt) + (active.segmentRemainingAtResumeSeconds ?? 0) * 1000
        : ms(active.segmentStartedAt) + active.segmentTargetSeconds * 1000;
      if (ms(nowIso) < deadlineMs) return { kind: 'rejected', reason: 'break_not_finished' };

      const usedSeconds = active.segmentTargetSeconds;
      const segment = buildBreakSegment({
        cycleNumber: active.cyclesCompleted,
        presetSnapshot: active.presetSnapshot,
        usedSeconds,
        start: active.segmentStartedAt,
        end: nowIso,
      });
      const windowSeconds = resolveBreakResponseWindowSeconds({
        breakType: segment.breakType,
        usedSeconds: segment.usedSeconds,
      });
      const next: ActiveStudySession = {
        ...active,
        breakSegments: [...active.breakSegments, segment],
        bankRemainingSeconds: active.bankRemainingSeconds + segment.bankDeltaSeconds,
        currentState: 'break_completed_waiting_response',
        segmentStartedAt: nowIso,
        segmentTargetSeconds: windowSeconds,
        responseDeadlineAt: iso(ms(nowIso) + windowSeconds * 1000),
        segmentResumedAt: undefined,
        segmentRemainingAtResumeSeconds: undefined,
      };
      return {
        kind: 'update',
        active: next,
        notifications: [
          cancelIntent('break_segment_finished'),
          playSoundIntent('study_time_alarm'),
          scheduleIntent('break_ack_expiration', next.responseDeadlineAt as string),
        ],
      };
    }

    case 'CONTINUE_STUDY': {
      // T9
      if (active.currentState !== 'break_completed_waiting_response') {
        return { kind: 'rejected', reason: 'not_waiting_break_ack' };
      }
      const expired = guardResponseDeadline(active, nowIso);
      if (expired) return expired;

      const segmentTargetSeconds = active.presetSnapshot.studyDurationMinutes * 60;
      const next: ActiveStudySession = {
        ...active,
        currentState: 'study_running',
        segmentStartedAt: nowIso,
        segmentTargetSeconds,
        responseDeadlineAt: undefined,
      };
      return {
        kind: 'update',
        active: next,
        notifications: [
          cancelIntent('break_ack_expiration'),
          scheduleIntent('study_segment_finished', iso(ms(nowIso) + segmentTargetSeconds * 1000)),
        ],
      };
    }

    case 'REQUEST_LUNCH': {
      // T11 (desde study_running/break_running) / T12 (desde los 3 estados de espera)
      if (!isLunchAvailable(active.cyclesSinceLunch, active.lunchUsed)) {
        return { kind: 'rejected', reason: 'lunch_not_available' };
      }

      if (active.currentState === 'study_running' || active.currentState === 'break_running') {
        const remainingSeconds = computeRemainingSeconds(active, ms(nowIso));
        const cancelPurpose = active.currentState === 'study_running' ? 'study_segment_finished' : 'break_segment_finished';
        const next: ActiveStudySession = {
          ...active,
          pausedSegment: {
            startedAt: active.segmentStartedAt,
            targetSeconds: active.segmentTargetSeconds,
            remainingSeconds,
          },
          stateBeforeLunch: active.currentState,
          currentState: 'lunch_running',
          segmentStartedAt: nowIso,
          segmentTargetSeconds: LUNCH_DURATION_SECONDS,
          lunchUsed: true,
          cyclesSinceLunch: 0,
        };
        return {
          kind: 'update',
          active: next,
          notifications: [
            cancelIntent(cancelPurpose),
            scheduleIntent('lunch_finished', iso(ms(nowIso) + LUNCH_DURATION_SECONDS * 1000)),
          ],
        };
      }

      if (
        active.currentState === 'study_completed_waiting_response' ||
        active.currentState === 'break_selection' ||
        active.currentState === 'break_completed_waiting_response'
      ) {
        const expired = guardResponseDeadline(active, nowIso);
        if (expired) return expired;

        const cancelPurpose =
          active.currentState === 'study_completed_waiting_response'
            ? 'study_ack_expiration'
            : active.currentState === 'break_selection'
              ? 'break_selection_expiration'
              : 'break_ack_expiration';
        const next: ActiveStudySession = {
          ...active,
          stateBeforeLunch: active.currentState,
          currentState: 'lunch_running',
          segmentStartedAt: nowIso,
          segmentTargetSeconds: LUNCH_DURATION_SECONDS,
          responseDeadlineAt: undefined,
          lunchUsed: true,
          cyclesSinceLunch: 0,
        };
        return {
          kind: 'update',
          active: next,
          notifications: [
            cancelIntent(cancelPurpose),
            scheduleIntent('lunch_finished', iso(ms(nowIso) + LUNCH_DURATION_SECONDS * 1000)),
          ],
        };
      }

      return { kind: 'rejected', reason: 'lunch_not_available_from_state' };
    }

    case 'LUNCH_FINISHED': {
      // T13
      if (active.currentState !== 'lunch_running') return { kind: 'rejected', reason: 'not_lunch_running' };
      if (ms(nowIso) < ms(active.segmentStartedAt) + LUNCH_DURATION_SECONDS * 1000) {
        return { kind: 'rejected', reason: 'lunch_not_finished' };
      }
      const returnState = active.stateBeforeLunch;
      if (!returnState) return { kind: 'rejected', reason: 'missing_state_before_lunch' };

      const lunchSegment = {
        start: active.segmentStartedAt,
        end: nowIso,
        durationSeconds: LUNCH_DURATION_SECONDS,
        cycleNumberAtStart: active.cyclesCompleted,
        returnState,
      };
      const baseNext = {
        ...active,
        lunchSegments: [...active.lunchSegments, lunchSegment],
        stateBeforeLunch: undefined,
      };

      if (returnState === 'study_running' || returnState === 'break_running') {
        const remainingSeconds = active.pausedSegment?.remainingSeconds ?? 0;
        const next: ActiveStudySession = {
          ...baseNext,
          currentState: returnState,
          segmentResumedAt: nowIso,
          segmentRemainingAtResumeSeconds: remainingSeconds,
          pausedSegment: undefined,
        };
        const resumePurpose = returnState === 'study_running' ? 'study_segment_finished' : 'break_segment_finished';
        return {
          kind: 'update',
          active: next,
          notifications: [
            cancelIntent('lunch_finished'),
            scheduleIntent(resumePurpose, iso(ms(nowIso) + remainingSeconds * 1000)),
          ],
        };
      }

      // returnState es uno de los 3 estados de espera: ventana reiniciada completa (sección 7.3)
      const lastSegment = active.studySegments[active.studySegments.length - 1];
      const lastBreak = active.breakSegments[active.breakSegments.length - 1];
      const windowSeconds =
        returnState === 'break_completed_waiting_response'
          ? resolveBreakResponseWindowSeconds({
              breakType: lastBreak.breakType,
              usedSeconds: lastBreak.usedSeconds,
            })
          : resolveStudyResponseWindowSeconds({
              durationSeconds: lastSegment.durationSeconds,
              cycleNumber: lastSegment.cycleNumber,
              cyclesBeforeLongBreak: active.presetSnapshot.cyclesBeforeLongBreak,
            });
      const next: ActiveStudySession = {
        ...baseNext,
        currentState: returnState,
        segmentStartedAt: nowIso,
        segmentTargetSeconds: windowSeconds,
        responseDeadlineAt: iso(ms(nowIso) + windowSeconds * 1000),
      };
      const resumePurpose =
        returnState === 'study_completed_waiting_response'
          ? 'study_ack_expiration'
          : returnState === 'break_selection'
            ? 'break_selection_expiration'
            : 'break_ack_expiration';
      return {
        kind: 'update',
        active: next,
        notifications: [cancelIntent('lunch_finished'), scheduleIntent(resumePurpose, next.responseDeadlineAt as string)],
      };
    }

    case 'REQUEST_CANCEL':
    case 'DISMISS_CANCEL':
      // T14/T15: panel puramente local, sin checkpoint (sección 4.3/8.1).
      return { kind: 'noop' };

    case 'CONFIRM_CANCEL': {
      // T16. La doble espera de 15+15s (CANCEL_CONFIRM_WINDOW_SECONDS) la valida el llamador
      // (useCancelStudySession) antes de despachar este evento — no es observable desde `active`.
      const expired = guardResponseDeadline(active, nowIso);
      if (expired) return expired; // EXPIRE gana (sección 8.2)

      const closure: StudySessionClosure = {
        terminalState: 'session_cancelled',
        completionReason: 'cancelled_by_user',
        endedAt: nowIso,
      };
      return { kind: 'close', active, closure, notifications: [cancelAllIntent()] };
    }

    case 'EXPIRE': {
      // T17
      if (!active.responseDeadlineAt) return { kind: 'rejected', reason: 'no_response_deadline' };
      if (ms(nowIso) < ms(active.responseDeadlineAt)) return { kind: 'rejected', reason: 'deadline_not_reached' };
      return buildExpireResult(active, active.responseDeadlineAt);
    }

    case 'ZOMBIE_TIMEOUT': {
      // T18
      if (!isZombie(active, nowIso)) return { kind: 'rejected', reason: 'not_zombie' };
      const closure: StudySessionClosure = {
        terminalState: 'session_expired',
        completionReason: 'zombie_timeout_24h',
        endedAt: active.lastCheckpointAt,
      };
      return { kind: 'close', active, closure, notifications: [cancelAllIntent()] };
    }

    default:
      return { kind: 'rejected', reason: 'unknown_event' };
  }
}

/**
 * T6 (`SKIP_BREAK`) y las ramas `grantedSeconds === 0` (T4) / `chosenSeconds === 0` (T5) producen
 * el mismo `BreakSegment` `skipped`: se factoriza aquí para no triplicar la lógica (sección 4.1,
 * nota de T4/T5; sección 2, nota "SKIP_BREAK y CHOOSE_CUSTOM_BREAK con 0 producen el mismo
 * BreakSegment").
 */
function applySkipBreak(active: ActiveStudySession, nowIso: string): StudyTimerTransitionResult {
  const segment: BreakSegment = buildBreakSegment({
    cycleNumber: active.cyclesCompleted,
    presetSnapshot: active.presetSnapshot,
    usedSeconds: 0,
    start: nowIso,
    end: nowIso,
  });
  const segmentTargetSeconds = active.presetSnapshot.studyDurationMinutes * 60;
  const next: ActiveStudySession = {
    ...active,
    breakSegments: [...active.breakSegments, segment],
    bankRemainingSeconds: active.bankRemainingSeconds + segment.bankDeltaSeconds,
    currentState: 'study_running',
    segmentStartedAt: nowIso,
    segmentTargetSeconds,
    responseDeadlineAt: undefined,
  };
  return {
    kind: 'update',
    active: next,
    notifications: [
      cancelIntent('break_selection_expiration'),
      scheduleIntent('study_segment_finished', iso(ms(nowIso) + segmentTargetSeconds * 1000)),
    ],
  };
}
