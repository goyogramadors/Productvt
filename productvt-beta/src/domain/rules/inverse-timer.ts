import { INVERSE_REMINDER_INTERVAL_SECONDS } from '../entities/active-session';
import type { ActiveInverseSession } from '../entities/active-session';

/**
 * Motor y recordatorios del temporizador inverso (docs/03-CRONOMETRO.md sección 12.3). Igual que
 * `timer-engine.ts`, nunca usa `setInterval` como fuente de verdad — solo resta timestamps.
 */

/** Segundos transcurridos desde `startedAt`, motor por timestamps (nunca `setInterval` como verdad). */
export function computeInverseElapsedSeconds(active: ActiveInverseSession, nowMsValue: number): number {
  return (nowMsValue - Date.parse(active.startedAt)) / 1000;
}

/** Cuántos recordatorios de 15 min ya deberían haberse disparado a los `elapsedSeconds` dados. */
export function computeRemindersDue(elapsedSeconds: number): number {
  return Math.floor(elapsedSeconds / INVERSE_REMINDER_INTERVAL_SECONDS);
}
