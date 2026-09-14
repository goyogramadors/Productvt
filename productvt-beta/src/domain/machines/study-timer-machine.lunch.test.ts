import { describe, expect, it } from 'vitest';

import { isoPlusSeconds, makeActiveStudySession } from '../__tests__/fixtures';
import { transitionStudyTimer } from './study-timer-machine';

/** Casos P26-P29 (docs/03-CRONOMETRO.md sección 13.4) — requieren la máquina completa (T11-T13). */

const START = '2026-09-06T09:00:00.000Z';

describe('P26-P29: almuerzo, pausa y retorno (sección 7)', () => {
  it('P26: pausa desde study_running conserva el remanente exacto', () => {
    const active = makeActiveStudySession({
      currentState: 'study_running',
      segmentStartedAt: START,
      segmentTargetSeconds: 1500,
    });
    const lunchStart = isoPlusSeconds(START, 620);
    const paused = transitionStudyTimer(active, { type: 'REQUEST_LUNCH' }, { nowIso: lunchStart });
    if (paused.kind !== 'update') throw new Error('expected update');
    expect(paused.active.pausedSegment?.remainingSeconds).toBe(880);
    expect(paused.active.currentState).toBe('lunch_running');

    const lunchEnd = isoPlusSeconds(lunchStart, 2700);
    const resumed = transitionStudyTimer(paused.active, { type: 'LUNCH_FINISHED' }, { nowIso: lunchEnd });
    if (resumed.kind !== 'update') throw new Error('expected update');
    expect(resumed.active.currentState).toBe('study_running');
    expect(resumed.active.segmentRemainingAtResumeSeconds).toBe(880);
    expect(resumed.active.segmentResumedAt).toBe(lunchEnd);
  });

  it('P27: sin pausedSegment al pedir desde un estado de espera', () => {
    const active = makeActiveStudySession({
      currentState: 'break_selection',
      responseDeadlineAt: isoPlusSeconds(START, 30),
    });
    const result = transitionStudyTimer(active, { type: 'REQUEST_LUNCH' }, { nowIso: isoPlusSeconds(START, 5) });
    if (result.kind !== 'update') throw new Error('expected update');
    expect(result.active.pausedSegment).toBeUndefined();
    expect(result.active.stateBeforeLunch).toBe('break_selection');
  });

  it('P28: ventana reiniciada completa al volver de un almuerzo pedido en break_completed_waiting_response', () => {
    const waitStart = START;
    const active = makeActiveStudySession({
      currentState: 'break_completed_waiting_response',
      breakSegments: [
        { breakType: 'short', grantedSeconds: 300, usedSeconds: 300, bankDeltaSeconds: 0, start: START, end: START, cycleNumber: 1 },
      ],
      segmentStartedAt: waitStart,
      segmentTargetSeconds: 30,
      responseDeadlineAt: isoPlusSeconds(waitStart, 30),
    });
    const lunchStart = isoPlusSeconds(waitStart, 20); // quedaban 10s de los 30s originales
    const paused = transitionStudyTimer(active, { type: 'REQUEST_LUNCH' }, { nowIso: lunchStart });
    if (paused.kind !== 'update') throw new Error('expected update');
    expect(paused.active.stateBeforeLunch).toBe('break_completed_waiting_response');
    expect(paused.active.responseDeadlineAt).toBeUndefined();

    const lunchEnd = isoPlusSeconds(lunchStart, 2700);
    const resumed = transitionStudyTimer(paused.active, { type: 'LUNCH_FINISHED' }, { nowIso: lunchEnd });
    if (resumed.kind !== 'update') throw new Error('expected update');
    expect(resumed.active.currentState).toBe('break_completed_waiting_response');
    // Los 30s completos de nuevo, NO los 10s que quedaban antes del almuerzo.
    expect(resumed.active.responseDeadlineAt).toBe(isoPlusSeconds(lunchEnd, 30));
  });

  it('P29: segundo almuerzo antes del cooldown es rechazado', () => {
    const active = makeActiveStudySession({
      currentState: 'study_running',
      lunchUsed: true,
      cyclesSinceLunch: 1,
    });
    const result = transitionStudyTimer(active, { type: 'REQUEST_LUNCH' }, { nowIso: isoPlusSeconds(START, 5) });
    expect(result).toEqual({ kind: 'rejected', reason: 'lunch_not_available' });
  });
});
