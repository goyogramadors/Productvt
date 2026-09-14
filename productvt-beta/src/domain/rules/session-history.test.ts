import { describe, expect, it } from 'vitest';

import type { InverseSession } from '../entities/inverse-session';
import type { StudySession } from '../entities/study-session';
import {
  compareSessionsByStartedAtDesc,
  filterSessionRecordsByCategory,
  filterSessionRecordsByDateRange,
  mergeSessionRecordsByStartedAtDesc,
  sessionDisplayDurationSeconds,
} from './session-history';
import { STANDARD_PRESET_SNAPSHOT } from '../__tests__/fixtures';

function makeStudySession(overrides: Partial<StudySession> = {}): StudySession {
  return {
    id: 'study-1',
    userId: 'user-1',
    type: 'study',
    name: 'Cálculo 3',
    categoryId: 'category-study-1',
    categoryNameSnapshot: 'Cálculo 3',
    colorSnapshot: '#3A6B54',
    presetSnapshot: STANDARD_PRESET_SNAPSHOT,
    status: 'completed',
    startedAt: '2026-09-06T09:00:00.000Z',
    endedAt: '2026-09-06T10:52:00.000Z',
    effectiveStudySeconds: 6000,
    totalElapsedSeconds: 6720,
    bankRemainingSeconds: 480,
    cyclesCompleted: 4,
    studySegments: [],
    breakSegments: [],
    lunchSegments: [],
    customBreakSelections: [],
    completionReason: 'ended_by_user',
    createdAt: '2026-09-06T09:00:00.000Z',
    updatedAt: '2026-09-06T10:52:00.000Z',
    ...overrides,
  };
}

function makeInverseSession(overrides: Partial<InverseSession> = {}): InverseSession {
  return {
    id: 'inverse-1',
    userId: 'user-1',
    type: 'inverse',
    name: 'Ocio',
    categoryId: 'category-inverse-1',
    categoryNameSnapshot: 'Ocio',
    colorSnapshot: '#616161',
    startedAt: '2026-09-05T20:00:00.000Z',
    endedAt: '2026-09-05T21:00:00.000Z',
    targetDurationSeconds: 3600,
    totalElapsedSeconds: 3600,
    remindersTriggered: 4,
    status: 'completed',
    autoFinished: false,
    createdAt: '2026-09-05T20:00:00.000Z',
    updatedAt: '2026-09-05T21:00:00.000Z',
    ...overrides,
  };
}

describe('sessionDisplayDurationSeconds', () => {
  it('usa effectiveStudySeconds para sesiones de estudio, nunca totalElapsedSeconds', () => {
    const session = makeStudySession({ effectiveStudySeconds: 6000, totalElapsedSeconds: 6720 });
    expect(sessionDisplayDurationSeconds(session)).toBe(6000);
  });

  it('usa totalElapsedSeconds para bloques inversos', () => {
    const session = makeInverseSession({ totalElapsedSeconds: 5400 });
    expect(sessionDisplayDurationSeconds(session)).toBe(5400);
  });
});

describe('compareSessionsByStartedAtDesc', () => {
  it('ordena más reciente primero', () => {
    const older = makeStudySession({ id: 'a', startedAt: '2026-09-01T00:00:00.000Z' });
    const newer = makeStudySession({ id: 'b', startedAt: '2026-09-05T00:00:00.000Z' });
    expect(compareSessionsByStartedAtDesc(newer, older)).toBeLessThan(0);
    expect(compareSessionsByStartedAtDesc(older, newer)).toBeGreaterThan(0);
  });

  it('desempata por id de forma determinística cuando startedAt coincide', () => {
    const a = makeStudySession({ id: 'aaa', startedAt: '2026-09-01T00:00:00.000Z' });
    const b = makeStudySession({ id: 'bbb', startedAt: '2026-09-01T00:00:00.000Z' });
    expect(compareSessionsByStartedAtDesc(b, a)).toBeLessThan(0);
    expect(compareSessionsByStartedAtDesc(a, b)).toBeGreaterThan(0);
  });
});

describe('mergeSessionRecordsByStartedAtDesc', () => {
  it('combina estudio e inverso en una sola lista ordenada por startedAt descendente', () => {
    const study1 = makeStudySession({ id: 'study-1', startedAt: '2026-09-06T09:00:00.000Z' });
    const study2 = makeStudySession({ id: 'study-2', startedAt: '2026-09-04T09:00:00.000Z' });
    const inverse1 = makeInverseSession({ id: 'inverse-1', startedAt: '2026-09-05T20:00:00.000Z' });

    const merged = mergeSessionRecordsByStartedAtDesc([study1, study2], [inverse1]);

    expect(merged.map((s) => s.id)).toEqual(['study-1', 'inverse-1', 'study-2']);
  });

  it('devuelve lista vacía si ambas entradas están vacías', () => {
    expect(mergeSessionRecordsByStartedAtDesc([], [])).toEqual([]);
  });
});

describe('filterSessionRecordsByDateRange', () => {
  const sessions = [
    makeStudySession({ id: 's1', startedAt: '2026-09-01T00:00:00.000Z' }),
    makeStudySession({ id: 's2', startedAt: '2026-09-05T00:00:00.000Z' }),
    makeInverseSession({ id: 's3', startedAt: '2026-09-10T00:00:00.000Z' }),
  ];

  it('sin límites devuelve todo', () => {
    expect(filterSessionRecordsByDateRange(sessions).map((s) => s.id)).toEqual(['s1', 's2', 's3']);
  });

  it('respeta el límite inferior e superior de forma inclusiva', () => {
    const result = filterSessionRecordsByDateRange(
      sessions,
      '2026-09-01T00:00:00.000Z',
      '2026-09-05T00:00:00.000Z'
    );
    expect(result.map((s) => s.id)).toEqual(['s1', 's2']);
  });

  it('excluye todo si el rango no matchea ninguna sesión', () => {
    const result = filterSessionRecordsByDateRange(sessions, '2026-10-01T00:00:00.000Z');
    expect(result).toEqual([]);
  });
});

describe('filterSessionRecordsByCategory', () => {
  const sessions = [
    makeStudySession({ id: 's1', categoryId: 'cat-a' }),
    makeStudySession({ id: 's2', categoryId: 'cat-b' }),
  ];

  it('sin categoryId devuelve una copia de la lista completa', () => {
    const result = filterSessionRecordsByCategory(sessions);
    expect(result).toEqual(sessions);
    expect(result).not.toBe(sessions);
  });

  it('filtra por categoryId exacto', () => {
    expect(filterSessionRecordsByCategory(sessions, 'cat-b').map((s) => s.id)).toEqual(['s2']);
  });
});
