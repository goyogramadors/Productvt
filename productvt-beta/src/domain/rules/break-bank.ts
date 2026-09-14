import type { BreakSegment, BreakSegmentType } from '../entities/study-session';
import type { PresetSnapshot } from '../value-objects/preset-snapshot';

/**
 * Banco de descanso: fórmulas sin doble conteo (docs/03-CRONOMETRO.md sección 6). Resuelve
 * REV-ALTA-4 (doble conteo) y REV-MEDIA-10 (breakType de un descanso largo parcial). Regla
 * operativa única: el descanso ganado se suma UNA sola vez por bloque completado; el banco solo
 * registra la diferencia entre lo ganado y lo usado, nunca "lo ganado" y luego "lo no usado" por
 * separado (invariante I-4 de docs/02-DOMINIO.md).
 */

/** Descanso que otorga completar el bloque `cycleNumber`: corto siempre, + largo si agota la cadencia. */
export function computeGrantedBreakSeconds(cycleNumber: number, presetSnapshot: PresetSnapshot): number {
  const short = presetSnapshot.shortBreakMinutes * 60;
  const givesWayToLongBreak = cycleNumber % presetSnapshot.cyclesBeforeLongBreak === 0;
  const long = givesWayToLongBreak ? presetSnapshot.longBreakMinutes * 60 : 0;
  return short + long;
}

/** disponible = banco previo + lo recién ganado. Nunca se sustituye "lo ganado" por otra cosa. */
export function computeAvailableBreakSeconds(bankRemainingSecondsBefore: number, grantedSeconds: number): number {
  return bankRemainingSecondsBefore + grantedSeconds;
}

export function validateCustomBreakChoice(chosenSeconds: number, availableSeconds: number): boolean {
  return Number.isInteger(chosenSeconds) && chosenSeconds >= 0 && chosenSeconds <= availableSeconds;
}

/**
 * Clasificación determinística de `breakType`, por valor. La clasificación es por el TOTAL ganado
 * en el ciclo (`grantedSeconds`, que en un ciclo de descanso largo ya incluye corto+largo
 * combinados), no por si el valor coincide con `longBreakMinutes` en aislado: un descanso largo
 * tomado parcialmente es `'custom'`, nunca `'long'` (resuelve REV-MEDIA-10 explícitamente, ejemplo
 * E5 de docs/03-CRONOMETRO.md sección 6.3).
 */
export function resolveBreakType(
  usedSeconds: number,
  grantedSeconds: number,
  cycleNumber: number,
  cyclesBeforeLongBreak: number
): BreakSegmentType {
  if (usedSeconds === 0) return 'skipped';
  const givesWayToLongBreak = cycleNumber % cyclesBeforeLongBreak === 0;
  if (usedSeconds === grantedSeconds) return givesWayToLongBreak ? 'long' : 'short';
  return 'custom';
}

export interface BuildBreakSegmentParams {
  cycleNumber: number;
  presetSnapshot: PresetSnapshot;
  usedSeconds: number;
  start: string;
  end: string;
}

export function buildBreakSegment(params: BuildBreakSegmentParams): BreakSegment {
  const grantedSeconds = computeGrantedBreakSeconds(params.cycleNumber, params.presetSnapshot);
  const breakType = resolveBreakType(
    params.usedSeconds,
    grantedSeconds,
    params.cycleNumber,
    params.presetSnapshot.cyclesBeforeLongBreak
  );
  return {
    breakType,
    grantedSeconds,
    usedSeconds: params.usedSeconds,
    bankDeltaSeconds: grantedSeconds - params.usedSeconds,
    start: params.start,
    end: params.end,
    cycleNumber: params.cycleNumber,
  };
}
