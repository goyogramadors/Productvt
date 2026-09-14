import { getISOWeek, getISOWeekYear } from 'date-fns';

/**
 * Identificador de semana ISO-8601 en formato `'YYYY-Www'` (ej. `'2026-W36'`). Usado por
 * `WeeklyGoal.weekKey` (SPEC.md sección 26) y por los agregadores de estadísticas semanales.
 */
export type WeekKey = string;

const WEEK_KEY_PATTERN = /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/;

export function isValidWeekKey(value: string): value is WeekKey {
  return WEEK_KEY_PATTERN.test(value);
}

/** Construye el WeekKey ISO (lunes-domingo, semana 01-53) correspondiente a una fecha dada. */
export function buildWeekKey(date: Date): WeekKey {
  const year = getISOWeekYear(date);
  const week = getISOWeek(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}
