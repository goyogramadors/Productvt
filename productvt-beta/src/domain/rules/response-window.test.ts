import { describe, expect, it } from 'vitest';

import { resolveBreakResponseWindowSeconds, resolveStudyResponseWindowSeconds } from './response-window';

/** Casos P13-P18 (docs/03-CRONOMETRO.md sección 13.2). */
describe('P13-P18: ventanas de respuesta (sección 3)', () => {
  it('P13: bloque pequeño, ciclo regular → 30 s', () => {
    expect(
      resolveStudyResponseWindowSeconds({ durationSeconds: 1500, cycleNumber: 2, cyclesBeforeLongBreak: 4 })
    ).toBe(30);
  });

  it('P14: bloque pequeño pero agota la cadencia → 10 min (posición, no tamaño)', () => {
    expect(
      resolveStudyResponseWindowSeconds({ durationSeconds: 1500, cycleNumber: 4, cyclesBeforeLongBreak: 4 })
    ).toBe(600);
  });

  it('P15: bloque grande por tamaño, no atado a cadencia → 10 min', () => {
    expect(
      resolveStudyResponseWindowSeconds({ durationSeconds: 5400, cycleNumber: 1, cyclesBeforeLongBreak: 6 })
    ).toBe(600);
  });

  it('P16: descanso corto → 30 s', () => {
    expect(resolveBreakResponseWindowSeconds({ breakType: 'short', usedSeconds: 300 })).toBe(30);
  });

  it('P17: descanso largo → 10 min', () => {
    expect(resolveBreakResponseWindowSeconds({ breakType: 'long', usedSeconds: 2400 })).toBe(600);
  });

  it('P18: descanso custom grande (> 30 min) sin ser long → 10 min igual', () => {
    expect(resolveBreakResponseWindowSeconds({ breakType: 'custom', usedSeconds: 2100 })).toBe(600);
  });
});
