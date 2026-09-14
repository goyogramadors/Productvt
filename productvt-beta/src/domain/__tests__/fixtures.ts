import type { ActiveInverseSession, ActiveStudySession } from '../entities/active-session';
import type { PresetSnapshot } from '../value-objects/preset-snapshot';

/** Preset `Estándar` as-built usado en todos los ejemplos numéricos de docs/03-CRONOMETRO.md. */
export const STANDARD_PRESET_SNAPSHOT: PresetSnapshot = {
  presetId: 'preset-standard',
  nameSnapshot: 'Estándar',
  studyDurationMinutes: 25,
  shortBreakMinutes: 5,
  cyclesBeforeLongBreak: 4,
  longBreakMinutes: 35,
};

export function isoPlusSeconds(baseIso: string, seconds: number): string {
  return new Date(Date.parse(baseIso) + seconds * 1000).toISOString();
}

const BASE_START = '2026-09-06T09:00:00.000Z';

export function makeActiveStudySession(overrides: Partial<ActiveStudySession> = {}): ActiveStudySession {
  const base: ActiveStudySession = {
    type: 'study',
    sessionId: 'session-1',
    userId: 'user-1',
    dominantDeviceId: 'device-1',
    name: 'Cálculo 3',
    categoryId: 'category-1',
    startedAt: BASE_START,
    lastCheckpointAt: BASE_START,
    deviceInfo: { platform: 'android' },
    presetSnapshot: STANDARD_PRESET_SNAPSHOT,
    currentState: 'study_running',
    segmentStartedAt: BASE_START,
    segmentTargetSeconds: STANDARD_PRESET_SNAPSHOT.studyDurationMinutes * 60,
    cyclesCompleted: 0,
    cyclesSinceLunch: 0,
    lunchUsed: false,
    effectiveStudySeconds: 0,
    bankRemainingSeconds: 0,
    studySegments: [],
    breakSegments: [],
    lunchSegments: [],
    customBreakSelections: [],
    createdAt: BASE_START,
    updatedAt: BASE_START,
  };
  return { ...base, ...overrides };
}

export function makeActiveInverseSession(overrides: Partial<ActiveInverseSession> = {}): ActiveInverseSession {
  const base: ActiveInverseSession = {
    type: 'inverse',
    sessionId: 'inverse-session-1',
    userId: 'user-1',
    dominantDeviceId: 'device-1',
    name: 'Ocio',
    categoryId: 'category-inverse-1',
    startedAt: BASE_START,
    lastCheckpointAt: BASE_START,
    deviceInfo: { platform: 'android' },
    targetDurationSeconds: 1800,
    remindersTriggered: 0,
    createdAt: BASE_START,
    updatedAt: BASE_START,
  };
  return { ...base, ...overrides };
}
