import type { SessionDeviceInfo } from '../entities/study-session';
import type { ActiveStudySession } from '../entities/active-session';

/**
 * Eventos de la máquina de estados de estudio (docs/03-CRONOMETRO.md sección 2). Ningún nombre
 * introduce `Block`/`block` (regla brief §1): los eventos usan el vocabulario de estado ya
 * as-built (`study`, `break`, `lunch`, `cycle` solo donde el código ya lo usa).
 *
 * `STUDY_FINISHED`, `BREAK_FINISHED`, `LUNCH_FINISHED`, `EXPIRE` y `ZOMBIE_TIMEOUT` son eventos
 * "auto": los dispara el motor (`timer-engine.ts`) al detectar por timestamp que un plazo llegó a
 * cero, no una acción de usuario — pero también pueden dispararlos, perezosamente, cualquier
 * dispositivo que simplemente lea el singleton y note que el plazo ya pasó (sección 9.2/9.3).
 */
export type StudyTimerEvent =
  | { type: 'START_SESSION'; payload: StartSessionPayload }
  | { type: 'STUDY_FINISHED' }
  | { type: 'ACK_STUDY_FINISHED' }
  | { type: 'CHOOSE_SUGGESTED_BREAK' }
  | { type: 'CHOOSE_CUSTOM_BREAK'; payload: { chosenSeconds: number } }
  | { type: 'SKIP_BREAK' }
  | { type: 'BREAK_FINISHED' }
  | { type: 'CONTINUE_STUDY' }
  | { type: 'END_SESSION' }
  | { type: 'REQUEST_LUNCH' }
  | { type: 'LUNCH_FINISHED' }
  | { type: 'REQUEST_CANCEL' }
  | { type: 'CONFIRM_CANCEL' }
  | { type: 'DISMISS_CANCEL' }
  | { type: 'EXPIRE' }
  | { type: 'ZOMBIE_TIMEOUT' }
  | { type: 'HYDRATE'; payload: { active: ActiveStudySession } };

export interface StartSessionPayload {
  name: string;
  categoryId: string;
  /** Se congela como `presetSnapshot` vía `buildPresetSnapshot` antes de llamar a la máquina. */
  presetId: string;
  /** `deviceInfo.platform` debe ser `'android'` (`canBeDominant`, docs/02-DOMINIO.md sección 3.5). */
  deviceInfo: SessionDeviceInfo;
}
