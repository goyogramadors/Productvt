import { describe, expect, it } from 'vitest';

import { STANDARD_PRESET_SNAPSHOT } from '../__tests__/fixtures';
import { buildBreakSegment, resolveBreakType, validateCustomBreakChoice } from './break-bank';

/** Casos P19-P22 (docs/03-CRONOMETRO.md sección 13.3). */
describe('P19-P22: banco de descanso (sección 6)', () => {
  it('P19: E1-E6 completos como una sola prueba parametrizada', () => {
    let bank = 0;
    const steps: { cycleNumber: number; chosen: number; expectedBank: number; expectedType: string }[] = [
      { cycleNumber: 1, chosen: 0, expectedBank: 300, expectedType: 'skipped' },
      { cycleNumber: 2, chosen: 300, expectedBank: 300, expectedType: 'short' },
      { cycleNumber: 3, chosen: 120, expectedBank: 480, expectedType: 'custom' },
      { cycleNumber: 4, chosen: 2400, expectedBank: 480, expectedType: 'long' },
      { cycleNumber: 8, chosen: 2100, expectedBank: 780, expectedType: 'custom' },
      { cycleNumber: 9, chosen: 1080, expectedBank: 0, expectedType: 'custom' },
    ];

    for (const step of steps) {
      const segment = buildBreakSegment({
        cycleNumber: step.cycleNumber,
        presetSnapshot: STANDARD_PRESET_SNAPSHOT,
        usedSeconds: step.chosen,
        start: '2026-09-06T09:00:00.000Z',
        end: '2026-09-06T09:00:00.000Z',
      });
      bank += segment.bankDeltaSeconds;
      expect(bank).toBe(step.expectedBank);
      expect(segment.breakType).toBe(step.expectedType);
    }
  });

  it('P20: resolveBreakType clasifica un largo parcial como custom, no long', () => {
    expect(resolveBreakType(2100, 2400, 4, 4)).toBe('custom');
  });

  it('P21: validateCustomBreakChoice rechaza valores fuera de rango o no enteros', () => {
    expect(validateCustomBreakChoice(-1, 1080)).toBe(false);
    expect(validateCustomBreakChoice(1080.5, 1080)).toBe(false);
    expect(validateCustomBreakChoice(1081, 1080)).toBe(false);
  });

  it('P22: bankDeltaSeconds negativo nunca deja bankRemainingSeconds por debajo de 0', () => {
    const segment = buildBreakSegment({
      cycleNumber: 9, // no múltiplo de 4 -> grantedSeconds = 300
      presetSnapshot: STANDARD_PRESET_SNAPSHOT,
      usedSeconds: 1080,
      start: '2026-09-06T09:00:00.000Z',
      end: '2026-09-06T09:00:00.000Z',
    });
    const bankBefore = 780;
    const bankAfter = bankBefore + segment.bankDeltaSeconds;
    expect(bankAfter).toBe(0);
    expect(bankAfter).toBeGreaterThanOrEqual(0);
  });
});
