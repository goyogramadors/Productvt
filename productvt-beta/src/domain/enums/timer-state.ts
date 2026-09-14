/**
 * Máquina de estados del cronómetro de estudio (SPEC.md sección 15.1; ARCHITECTURE.md sección 11.2).
 *
 * Son los 10 estados principales. `paused_transient` (mencionado en SPEC como "solo si se
 * requiere internamente") queda deliberadamente fuera: no forma parte del contrato público de la
 * máquina y, si el motor del timer (Fase de núcleo del timer) necesita un estado transitorio
 * interno, debe modelarlo dentro de `timer-engine`, no aquí.
 */
export type TimerStateName =
  | 'idle'
  | 'study_running'
  | 'study_completed_waiting_response'
  | 'break_selection'
  | 'break_running'
  | 'break_completed_waiting_response'
  | 'lunch_running'
  | 'session_completed'
  | 'session_cancelled'
  | 'session_expired';

/** Lista ordenada de todos los estados válidos, útil para validación exhaustiva y tests. */
export const TIMER_STATES: readonly TimerStateName[] = [
  'idle',
  'study_running',
  'study_completed_waiting_response',
  'break_selection',
  'break_running',
  'break_completed_waiting_response',
  'lunch_running',
  'session_completed',
  'session_cancelled',
  'session_expired',
] as const;

/** Estados en los que la sesión ya terminó de forma definitiva (no admiten más transiciones). */
export const TERMINAL_TIMER_STATES: readonly TimerStateName[] = [
  'session_completed',
  'session_cancelled',
  'session_expired',
];

export function isTerminalTimerState(state: TimerStateName): boolean {
  return TERMINAL_TIMER_STATES.includes(state);
}
