import type { SessionDeviceInfo } from '../entities/study-session';

/**
 * Eventos del temporizador inverso (docs/03-CRONOMETRO.md sección 12.2). Mucho más simple que el
 * de estudio: no reutiliza `TimerStateName` ni tiene estados de espera con `responseDeadlineAt`.
 */
export type InverseTimerEvent =
  | { type: 'START_INVERSE'; payload: StartInversePayload }
  /** Usuario: cierre manual antes del tope. */
  | { type: 'FINISH_INVERSE' }
  /** Auto (motor): `elapsed >= 2 * targetDurationSeconds`. */
  | { type: 'HARD_CAP_REACHED' }
  /** Usuario: abre confirmación simple (no doble). */
  | { type: 'REQUEST_CANCEL_INVERSE' }
  /** Usuario: confirma, un solo toque. */
  | { type: 'CONFIRM_CANCEL_INVERSE' }
  /** Usuario: cierra sin cancelar. */
  | { type: 'DISMISS_CANCEL_INVERSE' }
  /** Auto (cualquier lector): `now - lastCheckpointAt > 24h`. */
  | { type: 'ZOMBIE_TIMEOUT' };

export interface StartInversePayload {
  name: string;
  categoryId: string;
  targetDurationSeconds: number;
  deviceInfo: SessionDeviceInfo;
}
