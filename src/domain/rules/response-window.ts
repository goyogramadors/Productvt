import type { BreakSegmentType } from '../entities/study-session';

/**
 * Ventana de respuesta por tamaño del tramo (docs/03-CRONOMETRO.md sección 3). Resuelve
 * REV-MEDIA-5: cada uno de los tres estados de espera tiene una ventana propia, calculada por una
 * única función determinística a partir del tramo que acaba de terminar — nunca por el tipo de
 * estado.
 */

export const SHORT_RESPONSE_WINDOW_SECONDS = 30;
export const LONG_RESPONSE_WINDOW_SECONDS = 600; // 10 min

/**
 * Umbral de tamaño para pasar de ventana corta a larga (docs/03-CRONOMETRO.md sección 3.1).
 * Supuesto pendiente de confirmar del creador (brief §10.1): cambiar esta constante no afecta
 * ninguna otra tabla ni estructura, solo el resultado numérico.
 */
export const LARGE_SEGMENT_THRESHOLD_SECONDS = 1800; // 30 min

export interface ResolveStudyResponseWindowInput {
  /** `StudySegment.durationSeconds` del bloque que terminó. */
  durationSeconds: number;
  /** `StudySegment.cycleNumber` de ese bloque. */
  cycleNumber: number;
  /** `presetSnapshot.cyclesBeforeLongBreak`. */
  cyclesBeforeLongBreak: number;
}

/**
 * Ventana para `study_completed_waiting_response`, y la misma que hereda `break_selection` al
 * entrar (recalculada con los mismos datos, sección 3.2). Combina dos criterios con `||`: el
 * bloque es grande **por tamaño** (`> LARGE_SEGMENT_THRESHOLD_SECONDS`) o **agota la cadencia**
 * hacia el descanso largo (`cycleNumber % cyclesBeforeLongBreak === 0`), cualquiera sea su
 * duración. En el preset Estándar (25 min, `cyclesBeforeLongBreak: 4`): bloques 1-3 → 30 s; bloque
 * 4 → 10 min (por posición, no por tamaño).
 */
export function resolveStudyResponseWindowSeconds(input: ResolveStudyResponseWindowInput): number {
  const givesWayToLongBreak = input.cycleNumber % input.cyclesBeforeLongBreak === 0;
  const isLarge = input.durationSeconds > LARGE_SEGMENT_THRESHOLD_SECONDS;
  return isLarge || givesWayToLongBreak ? LONG_RESPONSE_WINDOW_SECONDS : SHORT_RESPONSE_WINDOW_SECONDS;
}

export interface ResolveBreakResponseWindowInput {
  /** El que resultó de `resolveBreakType` para el descanso que terminó. */
  breakType: BreakSegmentType;
  /** `BreakSegment.usedSeconds` del descanso que terminó. */
  usedSeconds: number;
}

/**
 * Ventana para `break_completed_waiting_response`. Un descanso `custom` de más de 30 min también
 * recibe 10 min aunque `breakType !== 'long'` — es el criterio de tamaño el que decide, no la
 * etiqueta (docs/03-CRONOMETRO.md sección 3.2).
 */
export function resolveBreakResponseWindowSeconds(input: ResolveBreakResponseWindowInput): number {
  const isLong = input.breakType === 'long' || input.usedSeconds > LARGE_SEGMENT_THRESHOLD_SECONDS;
  return isLong ? LONG_RESPONSE_WINDOW_SECONDS : SHORT_RESPONSE_WINDOW_SECONDS;
}
