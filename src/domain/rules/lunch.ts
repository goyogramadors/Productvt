import { LUNCH_COOLDOWN_CYCLES } from '../entities/active-session';

/**
 * Disponibilidad del almuerzo (docs/03-CRONOMETRO.md sección 7.1). Resuelve REV-ALTA-1 y
 * REV-MEDIA-17: disponible desde el inicio de la sesión (`lunchUsed === false`, es el "botón de
 * pánico"); tras el primer uso se rehabilita solo cuando se completaron `LUNCH_COOLDOWN_CYCLES`
 * (3) bloques desde el último uso — imposible encadenar dos almuerzos seguidos.
 */
export function isLunchAvailable(cyclesSinceLunch: number, lunchUsed: boolean): boolean {
  return !lunchUsed || cyclesSinceLunch >= LUNCH_COOLDOWN_CYCLES;
}
