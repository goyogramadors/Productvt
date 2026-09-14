/**
 * Segundos como unidad base interna de tiempo (SPEC.md sección 43: "usar segundos como unidad
 * base interna" y "convertir a minutos/horas solo para UI"). Es un alias simple, no una clase:
 * evita over-engineering mientras deja explícita la intención en las firmas de función.
 */
export type DurationSeconds = number;

export function minutesToSeconds(minutes: number): DurationSeconds {
  return Math.round(minutes * 60);
}

export function secondsToMinutes(seconds: DurationSeconds): number {
  return seconds / 60;
}

/** Redondea a entero y acota `seconds` al rango cerrado [min, max]. */
export function clampDurationSeconds(
  seconds: number,
  min: DurationSeconds = 0,
  max: DurationSeconds = Number.MAX_SAFE_INTEGER
): DurationSeconds {
  return Math.min(Math.max(Math.round(seconds), min), max);
}
