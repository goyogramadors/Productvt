import { describe, expect, it } from 'vitest';
import { computeClockOffsetMs } from './clock-offset';

describe('computeClockOffsetMs', () => {
  it('reproduce el ejemplo numérico de docs/04-SINCRONIZACION.md sección 6.2 (dominante adelantado 3s)', () => {
    const t = Date.parse('2026-09-06T12:00:00.000Z');
    const localTimestampAtCheckpoint = t + 3000; // reloj del dominante adelantado 3s
    const offset = computeClockOffsetMs(new Date(t).toISOString(), localTimestampAtCheckpoint);
    expect(offset).toBe(-3000);
  });

  it('reproduce el ejemplo numérico del espectador atrasado 5s', () => {
    const t = Date.parse('2026-09-06T12:00:00.000Z');
    const localNowAtReceipt = t - 5000; // reloj del espectador atrasado 5s
    const offset = computeClockOffsetMs(new Date(t).toISOString(), localNowAtReceipt);
    expect(offset).toBe(5000);
  });

  it('da 0 cuando el reloj local ya coincide con el del servidor', () => {
    const t = Date.parse('2026-09-06T12:00:00.000Z');
    expect(computeClockOffsetMs(new Date(t).toISOString(), t)).toBe(0);
  });

  it('nowMs corregido converge al mismo instante para ambos relojes desincronizados', () => {
    const t = Date.parse('2026-09-06T12:00:00.000Z');
    const dominantOffset = computeClockOffsetMs(new Date(t).toISOString(), t + 3000);
    const spectatorOffset = computeClockOffsetMs(new Date(t).toISOString(), t - 5000);
    expect((t + 3000) + dominantOffset).toBe(t);
    expect((t - 5000) + spectatorOffset).toBe(t);
  });
});
