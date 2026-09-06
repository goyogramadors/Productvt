import { describe, expect, it } from 'vitest';

import { isLunchAvailable } from './lunch';

/** Casos P23-P25 (docs/03-CRONOMETRO.md sección 13.4) — P26-P29 requieren la máquina de estados
 * completa y viven en `../machines/study-timer-machine.lunch.test.ts`. */
describe('P23-P25: disponibilidad del almuerzo (sección 7.1)', () => {
  it('P23: disponible desde el primer bloque', () => {
    expect(isLunchAvailable(0, false)).toBe(true);
  });

  it('P24: no disponible antes de completar el cooldown', () => {
    expect(isLunchAvailable(2, true)).toBe(false);
  });

  it('P25: disponible de nuevo al llegar exactamente a 3', () => {
    expect(isLunchAvailable(3, true)).toBe(true);
  });
});
