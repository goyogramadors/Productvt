import { describe, expect, it } from 'vitest';

import { isoPlusSeconds, makeActiveStudySession, STANDARD_PRESET_SNAPSHOT } from '../__tests__/fixtures';
import { materializeStudySession } from '../rules/materialize-session';
import { startStudySession, transitionStudyTimer } from './study-timer-machine';

/**
 * Casos P1-P12 (docs/03-CRONOMETRO.md sección 13.1) + P30-P36 (secciones 13.5/13.6, cancelación,
 * expiración y zombie) — todos ejercitan directamente `study-timer-machine.ts`.
 */

const START = '2026-09-06T09:00:00.000Z';

describe('P1-P12: transiciones y máquina de estados (sección 4)', () => {
  it('P1: START_SESSION crea el singleton completo', () => {
    const { active } = startStudySession({
      sessionId: 'session-1',
      userId: 'user-1',
      dominantDeviceId: 'device-1',
      name: 'Cálculo 3',
      categoryId: 'category-1',
      presetSnapshot: STANDARD_PRESET_SNAPSHOT,
      deviceInfo: { platform: 'android' },
      nowIso: START,
    });
    expect(active.currentState).toBe('study_running');
    expect(active.cyclesCompleted).toBe(0);
    expect(active.bankRemainingSeconds).toBe(0);
    expect(active.segmentTargetSeconds).toBe(1500);
  });

  it('P2: STUDY_FINISHED registra el primer bloque', () => {
    const active = makeActiveStudySession();
    const now = isoPlusSeconds(START, 1500);
    const result = transitionStudyTimer(active, { type: 'STUDY_FINISHED' }, { nowIso: now });
    if (result.kind !== 'update') throw new Error('expected update');
    expect(result.active.studySegments).toHaveLength(1);
    expect(result.active.cyclesCompleted).toBe(1);
    expect(result.active.effectiveStudySeconds).toBe(1500);
    expect(result.active.currentState).toBe('study_completed_waiting_response');
    expect(result.active.responseDeadlineAt).toBe(isoPlusSeconds(now, 30));
  });

  it('P3: ACK_STUDY_FINISHED abre break_selection con ventana propia', () => {
    const afterStudy = makeActiveStudySession({
      currentState: 'study_completed_waiting_response',
      cyclesCompleted: 1,
      studySegments: [{ start: START, end: isoPlusSeconds(START, 1500), durationSeconds: 1500, cycleNumber: 1 }],
      segmentStartedAt: isoPlusSeconds(START, 1500),
      segmentTargetSeconds: 30,
      responseDeadlineAt: isoPlusSeconds(START, 1530),
    });
    const now = isoPlusSeconds(START, 1510);
    const result = transitionStudyTimer(afterStudy, { type: 'ACK_STUDY_FINISHED' }, { nowIso: now });
    if (result.kind !== 'update') throw new Error('expected update');
    expect(result.active.currentState).toBe('break_selection');
    expect(result.active.segmentStartedAt).toBe(now);
    expect(result.active.responseDeadlineAt).toBe(isoPlusSeconds(now, 30));
  });

  it('P4: CHOOSE_SUGGESTED_BREAK en ciclo regular', () => {
    const active = makeActiveStudySession({
      currentState: 'break_selection',
      cyclesCompleted: 1,
      responseDeadlineAt: isoPlusSeconds(START, 30),
    });
    const result = transitionStudyTimer(active, { type: 'CHOOSE_SUGGESTED_BREAK' }, { nowIso: isoPlusSeconds(START, 10) });
    if (result.kind !== 'update') throw new Error('expected update');
    expect(result.active.currentState).toBe('break_running');
    expect(result.active.segmentTargetSeconds).toBe(300);
  });

  it('P5: CHOOSE_SUGGESTED_BREAK degenera a SKIP_BREAK si grantedSeconds = 0', () => {
    const customPreset = { ...STANDARD_PRESET_SNAPSHOT, shortBreakMinutes: 0, cyclesBeforeLongBreak: 4 };
    const active = makeActiveStudySession({
      currentState: 'break_selection',
      cyclesCompleted: 1, // no múltiplo de 4
      presetSnapshot: customPreset,
      responseDeadlineAt: isoPlusSeconds(START, 30),
    });
    const result = transitionStudyTimer(active, { type: 'CHOOSE_SUGGESTED_BREAK' }, { nowIso: isoPlusSeconds(START, 5) });
    if (result.kind !== 'update') throw new Error('expected update');
    expect(result.active.currentState).toBe('study_running');
    expect(result.active.breakSegments).toEqual([
      expect.objectContaining({ breakType: 'skipped', usedSeconds: 0 }),
    ]);
  });

  it('P6: CHOOSE_CUSTOM_BREAK{0} anexa CustomBreakSelection y también BreakSegment skipped', () => {
    const active = makeActiveStudySession({
      currentState: 'break_selection',
      cyclesCompleted: 1,
      bankRemainingSeconds: 480,
      responseDeadlineAt: isoPlusSeconds(START, 30),
    });
    const now = isoPlusSeconds(START, 5);
    const result = transitionStudyTimer(active, { type: 'CHOOSE_CUSTOM_BREAK', payload: { chosenSeconds: 0 } }, { nowIso: now });
    if (result.kind !== 'update') throw new Error('expected update');
    expect(result.active.customBreakSelections).toEqual([
      expect.objectContaining({ availableSeconds: 780, chosenSeconds: 0 }),
    ]);
    expect(result.active.breakSegments).toEqual([expect.objectContaining({ breakType: 'skipped' })]);
    expect(result.active.currentState).toBe('study_running');
  });

  it('P7: SKIP_BREAK sin CustomBreakSelection', () => {
    const active = makeActiveStudySession({
      currentState: 'break_selection',
      cyclesCompleted: 1,
      bankRemainingSeconds: 480,
      responseDeadlineAt: isoPlusSeconds(START, 30),
    });
    const result = transitionStudyTimer(active, { type: 'SKIP_BREAK' }, { nowIso: isoPlusSeconds(START, 5) });
    if (result.kind !== 'update') throw new Error('expected update');
    expect(result.active.breakSegments).toEqual([expect.objectContaining({ breakType: 'skipped' })]);
    expect(result.active.customBreakSelections).toEqual([]);
  });

  it('P8: END_SESSION desde break_selection cierra sin penalización', () => {
    const segments = Array.from({ length: 4 }, (_, i) => ({
      start: isoPlusSeconds(START, i * 1500),
      end: isoPlusSeconds(START, (i + 1) * 1500),
      durationSeconds: 1500,
      cycleNumber: i + 1,
    }));
    const active = makeActiveStudySession({
      currentState: 'break_selection',
      cyclesCompleted: 4,
      effectiveStudySeconds: 6000,
      studySegments: segments,
      responseDeadlineAt: isoPlusSeconds(START, 30),
    });
    const now = isoPlusSeconds(START, 5);
    const result = transitionStudyTimer(active, { type: 'END_SESSION' }, { nowIso: now });
    if (result.kind !== 'close') throw new Error('expected close');
    expect(result.closure.completionReason).toBe('ended_by_user');
    const materialized = materializeStudySession(result.active, result.closure);
    expect(materialized.status).toBe('completed');
    expect(materialized.effectiveStudySeconds).toBe(6000);
  });

  it('P9: BREAK_FINISHED clasifica y abre ventana según el descanso', () => {
    const active = makeActiveStudySession({
      currentState: 'break_running',
      cyclesCompleted: 1,
      segmentStartedAt: START,
      segmentTargetSeconds: 300,
    });
    const now = isoPlusSeconds(START, 300);
    const result = transitionStudyTimer(active, { type: 'BREAK_FINISHED' }, { nowIso: now });
    if (result.kind !== 'update') throw new Error('expected update');
    expect(result.active.breakSegments).toEqual([
      expect.objectContaining({ breakType: 'short', usedSeconds: 300 }),
    ]);
    expect(result.active.currentState).toBe('break_completed_waiting_response');
    expect(result.active.responseDeadlineAt).toBe(isoPlusSeconds(now, 30));
  });

  it('P10: CONTINUE_STUDY arranca el siguiente bloque', () => {
    const active = makeActiveStudySession({
      currentState: 'break_completed_waiting_response',
      responseDeadlineAt: isoPlusSeconds(START, 30),
    });
    const result = transitionStudyTimer(active, { type: 'CONTINUE_STUDY' }, { nowIso: isoPlusSeconds(START, 5) });
    if (result.kind !== 'update') throw new Error('expected update');
    expect(result.active.currentState).toBe('study_running');
    expect(result.active.segmentTargetSeconds).toBe(1500);
    expect(result.active.responseDeadlineAt).toBeUndefined();
  });

  it('P11: END_SESSION desde break_completed_waiting_response', () => {
    const segments = Array.from({ length: 4 }, (_, i) => ({
      start: isoPlusSeconds(START, i * 1500),
      end: isoPlusSeconds(START, (i + 1) * 1500),
      durationSeconds: 1500,
      cycleNumber: i + 1,
    }));
    const active = makeActiveStudySession({
      currentState: 'break_completed_waiting_response',
      cyclesCompleted: 4,
      effectiveStudySeconds: 6000,
      studySegments: segments,
      responseDeadlineAt: isoPlusSeconds(START, 30),
    });
    const result = transitionStudyTimer(active, { type: 'END_SESSION' }, { nowIso: isoPlusSeconds(START, 5) });
    if (result.kind !== 'close') throw new Error('expected close');
    const materialized = materializeStudySession(result.active, result.closure);
    expect(materialized.status).toBe('completed');
    expect(materialized.completionReason).toBe('ended_by_user');
    expect(materialized.effectiveStudySeconds).toBe(6000);
  });

  it('P12: materialización trivial a idle tras cualquier cierre', () => {
    const active = makeActiveStudySession({ currentState: 'break_selection', responseDeadlineAt: isoPlusSeconds(START, 30) });
    const result = transitionStudyTimer(active, { type: 'END_SESSION' }, { nowIso: isoPlusSeconds(START, 1) });
    if (result.kind !== 'close') throw new Error('expected close');
    // El batch de cierre (fuera de esta función pura) hace set(sessions/{id}) + delete(active/session):
    // el resultado de la máquina nunca incluye un `currentState` terminal (I-13) — solo un `closure`.
    expect(result).not.toHaveProperty('active.currentState', 'session_completed');
    expect(['session_completed', 'session_cancelled', 'session_expired']).toContain(result.closure.terminalState);
  });
});

describe('P30-P32: cancelación (sección 8)', () => {
  it('P30: doble confirmación completa cancela conservando bloques previos', () => {
    const segments = Array.from({ length: 3 }, (_, i) => ({
      start: isoPlusSeconds(START, i * 1500),
      end: isoPlusSeconds(START, (i + 1) * 1500),
      durationSeconds: 1500,
      cycleNumber: i + 1,
    }));
    const active = makeActiveStudySession({
      currentState: 'study_running',
      cyclesCompleted: 3,
      effectiveStudySeconds: 4500,
      studySegments: segments,
      segmentStartedAt: isoPlusSeconds(START, 4500),
    });
    const now = isoPlusSeconds(START, 4700); // a mitad del cuarto bloque, sin responseDeadlineAt
    const result = transitionStudyTimer(active, { type: 'CONFIRM_CANCEL' }, { nowIso: now });
    if (result.kind !== 'close') throw new Error('expected close');
    expect(result.closure.terminalState).toBe('session_cancelled');
    const materialized = materializeStudySession(result.active, result.closure);
    expect(materialized.status).toBe('cancelled');
    expect(materialized.effectiveStudySeconds).toBe(4500); // regla vigente D1.b — no 0
    expect(materialized.studySegments).toHaveLength(3);
  });

  it('P31: DISMISS_CANCEL en cualquier punto no cancela nada', () => {
    const active = makeActiveStudySession({ currentState: 'study_running' });
    const dismiss = transitionStudyTimer(active, { type: 'DISMISS_CANCEL' }, { nowIso: isoPlusSeconds(START, 10) });
    const request = transitionStudyTimer(active, { type: 'REQUEST_CANCEL' }, { nowIso: isoPlusSeconds(START, 5) });
    expect(dismiss).toEqual({ kind: 'noop' });
    expect(request).toEqual({ kind: 'noop' });
  });

  it('P32: EXPIRE gana si vence antes del segundo CONFIRM_CANCEL', () => {
    const active = makeActiveStudySession({
      currentState: 'study_completed_waiting_response',
      studySegments: [{ start: START, end: isoPlusSeconds(START, 1500), durationSeconds: 1500, cycleNumber: 1 }],
      cyclesCompleted: 1,
      effectiveStudySeconds: 1500,
      segmentStartedAt: START,
      segmentTargetSeconds: 30,
      responseDeadlineAt: isoPlusSeconds(START, 30),
    });
    // El segundo toque de confirmación llega justo cuando (o después de) vencer la ventana de 30s.
    const now = isoPlusSeconds(START, 30);
    const result = transitionStudyTimer(active, { type: 'CONFIRM_CANCEL' }, { nowIso: now });
    if (result.kind !== 'close') throw new Error('expected close');
    expect(result.closure.terminalState).toBe('session_expired');
    expect(result.closure.completionReason).toBe('expired_no_response');
  });
});

describe('P33-P36: expiración y zombie (sección 9)', () => {
  it('P33: EXPIRE en break_selection conserva bloques previos', () => {
    const segments = Array.from({ length: 2 }, (_, i) => ({
      start: isoPlusSeconds(START, i * 1500),
      end: isoPlusSeconds(START, (i + 1) * 1500),
      durationSeconds: 1500,
      cycleNumber: i + 1,
    }));
    const active = makeActiveStudySession({
      currentState: 'break_selection',
      cyclesCompleted: 2,
      effectiveStudySeconds: 3000,
      studySegments: segments,
      segmentStartedAt: isoPlusSeconds(START, 3000),
      segmentTargetSeconds: 30,
      responseDeadlineAt: isoPlusSeconds(START, 3030),
    });
    const now = isoPlusSeconds(START, 3031); // ya vencido
    const result = transitionStudyTimer(active, { type: 'EXPIRE' }, { nowIso: now });
    if (result.kind !== 'close') throw new Error('expected close');
    const materialized = materializeStudySession(result.active, result.closure);
    expect(materialized.status).toBe('expired');
    expect(materialized.effectiveStudySeconds).toBe(3000);
  });

  it('P36: zombie en lunch_running también cierra (no solo estados de espera)', () => {
    const segments = [{ start: START, end: isoPlusSeconds(START, 1500), durationSeconds: 1500, cycleNumber: 1 }];
    const active = makeActiveStudySession({
      currentState: 'lunch_running',
      cyclesCompleted: 1,
      effectiveStudySeconds: 1500,
      studySegments: segments,
      lastCheckpointAt: START,
    });
    const now = isoPlusSeconds(START, 90000);
    const result = transitionStudyTimer(active, { type: 'ZOMBIE_TIMEOUT' }, { nowIso: now });
    if (result.kind !== 'close') throw new Error('expected close');
    expect(result.closure.completionReason).toBe('zombie_timeout_24h');
    const materialized = materializeStudySession(result.active, result.closure);
    expect(materialized.status).toBe('expired');
    expect(materialized.effectiveStudySeconds).toBe(1500);
  });
});
