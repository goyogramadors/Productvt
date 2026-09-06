import { describe, expect, it } from 'vitest';

import { isoPlusSeconds, makeActiveInverseSession, makeActiveStudySession } from '../__tests__/fixtures';
import { resolveRescheduleIntents } from './notification-recovery';

const START = '2026-09-06T09:00:00.000Z';

/**
 * Paso 5 de `ActiveSessionRecoveryService` (docs/04-SINCRONIZACION.md sección 8.1): reconstruye
 * exactamente lo que docs/03-CRONOMETRO.md sección 11 (estudio) / 12.3 (inverso) programaría al
 * "entrar" al `currentState` vigente.
 */
describe('resolveRescheduleIntents', () => {
  it('study_running: reprograma study_segment_finished en segmentStartedAt + segmentTargetSeconds', () => {
    const active = makeActiveStudySession({ segmentStartedAt: START, segmentTargetSeconds: 1500 });
    const intents = resolveRescheduleIntents(active);
    expect(intents).toEqual([
      { action: 'schedule', purpose: 'study_segment_finished', fireAtIso: isoPlusSeconds(START, 1500) },
    ]);
  });

  it('study_running reanudado tras almuerzo: usa segmentResumedAt + segmentRemainingAtResumeSeconds', () => {
    const resumedAt = isoPlusSeconds(START, 2700);
    const active = makeActiveStudySession({
      segmentStartedAt: START,
      segmentTargetSeconds: 1500,
      segmentResumedAt: resumedAt,
      segmentRemainingAtResumeSeconds: 600,
    });
    const intents = resolveRescheduleIntents(active);
    expect(intents).toEqual([
      { action: 'schedule', purpose: 'study_segment_finished', fireAtIso: isoPlusSeconds(resumedAt, 600) },
    ]);
  });

  it('break_running: reprograma break_segment_finished', () => {
    const active = makeActiveStudySession({
      currentState: 'break_running',
      segmentStartedAt: START,
      segmentTargetSeconds: 300,
    });
    expect(resolveRescheduleIntents(active)).toEqual([
      { action: 'schedule', purpose: 'break_segment_finished', fireAtIso: isoPlusSeconds(START, 300) },
    ]);
  });

  it('lunch_running: reprograma lunch_finished a los 2700s fijos', () => {
    const active = makeActiveStudySession({
      currentState: 'lunch_running',
      segmentStartedAt: START,
      segmentTargetSeconds: 2700,
    });
    expect(resolveRescheduleIntents(active)).toEqual([
      { action: 'schedule', purpose: 'lunch_finished', fireAtIso: isoPlusSeconds(START, 2700) },
    ]);
  });

  it('study_completed_waiting_response: usa responseDeadlineAt directamente', () => {
    const deadline = isoPlusSeconds(START, 30);
    const active = makeActiveStudySession({
      currentState: 'study_completed_waiting_response',
      responseDeadlineAt: deadline,
    });
    expect(resolveRescheduleIntents(active)).toEqual([
      { action: 'schedule', purpose: 'study_ack_expiration', fireAtIso: deadline },
    ]);
  });

  it('break_selection: usa responseDeadlineAt directamente', () => {
    const deadline = isoPlusSeconds(START, 600);
    const active = makeActiveStudySession({ currentState: 'break_selection', responseDeadlineAt: deadline });
    expect(resolveRescheduleIntents(active)).toEqual([
      { action: 'schedule', purpose: 'break_selection_expiration', fireAtIso: deadline },
    ]);
  });

  it('break_completed_waiting_response: usa responseDeadlineAt directamente', () => {
    const deadline = isoPlusSeconds(START, 30);
    const active = makeActiveStudySession({
      currentState: 'break_completed_waiting_response',
      responseDeadlineAt: deadline,
    });
    expect(resolveRescheduleIntents(active)).toEqual([
      { action: 'schedule', purpose: 'break_ack_expiration', fireAtIso: deadline },
    ]);
  });

  it('inverso: reprograma target_reached y hard_cap desde startedAt', () => {
    const active = makeActiveInverseSession({ startedAt: START, targetDurationSeconds: 1800 });
    const intents = resolveRescheduleIntents(active);
    expect(intents).toContainEqual({
      action: 'schedule',
      purpose: 'inverse_target_reached',
      fireAtIso: isoPlusSeconds(START, 1800),
    });
    expect(intents).toContainEqual({
      action: 'schedule',
      purpose: 'inverse_hard_cap',
      fireAtIso: isoPlusSeconds(START, 3600),
    });
    expect(intents.some((i) => i.action === 'schedule' && i.purpose === 'inverse_reminder')).toBe(true);
  });
});
