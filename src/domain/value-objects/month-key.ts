/**
 * Identificador de mes en formato `'YYYY-MM'` (ej. `'2026-09'`). Usado por la vista anual y por
 * `buildYearAchievementMap` (ARCHITECTURE.md sección 20.4).
 */
export type MonthKey = string;

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isValidMonthKey(value: string): value is MonthKey {
  return MONTH_KEY_PATTERN.test(value);
}

export function buildMonthKey(date: Date): MonthKey {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
