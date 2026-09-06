import { describe, expect, it } from 'vitest';

import { isoPlusSeconds, makeActiveStudySession } from '../__tests__/fixtures';
import { isZombie, materializeStudySession, type StudySessionClosure } from './materialize-session';

const START = '2026-09-06T09:00:00.000Z';

describe('P34-P35: isZombie (sección 9.3)', () => {
  it('P34: false justo antes de las 24h', () => {
    const active = makeActiveStudySession({ lastCheckpointAt: START });
    expect(isZombie(active, isoPlusSeconds(START, 86399))).toBe(false);
  });

  it('P35: true justo después de las 24h', () => {
    const active = makeActiveStudySession({ lastCheckpointAt: START });
    expect(isZombie(active, isoPlusSeconds(START, 86401))).toBe(true);
  });
});

describe('P42: materializeStudySession mapea cada terminalState a su status/completionReason', () => {
  const active = makeActiveStudySession({
    studySegments: [{ start: START, end: isoPlusSeconds(START, 1500), durationSeconds: 1500, cycleNumber: 1 }],
    cyclesCompleted: 1,
    effectiveStudySeconds: 1500,
  });

  const cases: { closure: StudySessionClosure; expectedStatus: string; expectedReason: string }[] = [
    {
      closure: { terminalState: 'session_completed', completionReason: 'ended_by_user', endedAt: START },
      expectedStatus: 'completed',
      expectedReason: 'ended_by_user',
    },
    {
      closure: { terminalState: 'session_expired', completionReason: 'expired_no_response', endedAt: START },
      expectedStatus: 'expired',
      expectedReason: 'expired_no_response',
    },
    {
      closure: { terminalState: 'session_expired', completionReason: 'zombie_timeout_24h', endedAt: START },
      expectedStatus: 'expired',
      expectedReason: 'zombie_timeout_24h',
    },
    {
      closure: { terminalState: 'session_cancelled', completionReason: 'cancelled_by_user', endedAt: START },
      expectedStatus: 'cancelled',
      expectedReason: 'cancelled_by_user',
    },
  ];

  it.each(cases)('$closure.terminalState / $closure.completionReason', ({ closure, expectedStatus, expectedReason }) => {
    const materialized = materializeStudySession(active, closure);
    expect(materialized.status).toBe(expectedStatus);
    expect(materialized.completionReason).toBe(expectedReason);
  });
});
