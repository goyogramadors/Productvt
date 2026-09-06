import { describe, expect, it } from 'vitest';

import { isoPlusSeconds, makeActiveInverseSession, makeActiveStudySession } from '../__tests__/fixtures';
import { canStartNewActiveSession } from '../rules/active-session-guard';
import { computeRemindersDue } from '../rules/inverse-timer';
import { materializeInverseSession } from '../rules/materialize-session';
import { transitionInverseTimer } from './inverse-timer-machine';

/** Casos P37-P41 (docs/03-CRONOMETRO.md sección 13.7). */

const START = '2026-09-06T09:00:00.000Z';

describe('P37-P41: temporizador inverso (sección 12)', () => {
  it('P37: recordatorios acumulan cada 15 min sin exigir respuesta', () => {
    expect(computeRemindersDue(2000)).toBe(2);
  });

  it('P38: alcanzar T no cierra la sesión', () => {
    const active = makeActiveInverseSession({ startedAt: START, targetDurationSeconds: 1800 });
    // now = startedAt + T exactamente: el tope duro es 2T (3600s) — todavía muy lejos.
    const now = isoPlusSeconds(START, 1800);
    const result = transitionInverseTimer(active, { type: 'HARD_CAP_REACHED' }, { nowIso: now });
    expect(result).toEqual({ kind: 'rejected', reason: 'hard_cap_not_reached' });
  });

  it('P39: tope duro 2·T autocierra', () => {
    const active = makeActiveInverseSession({ startedAt: START, targetDurationSeconds: 1800 });
    const now = isoPlusSeconds(START, 3600);
    const result = transitionInverseTimer(active, { type: 'HARD_CAP_REACHED' }, { nowIso: now });
    if (result.kind !== 'close') throw new Error('expected close');
    expect(result.closure.autoFinished).toBe(true);
    const materialized = materializeInverseSession(result.active, result.closure);
    expect(materialized.totalElapsedSeconds).toBe(3600);
    expect(materialized.autoFinished).toBe(true);
  });

  it('P40: CONFIRM_CANCEL_INVERSE no exige doble confirmación y no cuenta en estadísticas', () => {
    const active = makeActiveInverseSession({ startedAt: START });
    const result = transitionInverseTimer(active, { type: 'CONFIRM_CANCEL_INVERSE' }, { nowIso: isoPlusSeconds(START, 120) });
    if (result.kind !== 'close') throw new Error('expected close');
    expect(result.closure.status).toBe('cancelled');
    const materialized = materializeInverseSession(result.active, result.closure);
    expect(materialized.status).toBe('cancelled'); // el agregador de ocio (fase de estadísticas) lo excluye
  });

  it('P41: exclusión mutua — no se puede iniciar si ya hay una sesión de estudio activa', () => {
    const existingStudyActive = makeActiveStudySession();
    // START_INVERSE (o START_SESSION) compiten por el mismo singleton `active/session` (sección
    // 12.4, I-11): la transacción `create` del coordinador falla si ya existe cualquiera de los dos.
    expect(canStartNewActiveSession(existingStudyActive)).toBe(false);
    expect(canStartNewActiveSession(null)).toBe(true);
  });
});
