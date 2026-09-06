import type { DeviceId } from './active-session';
import type { TimerStateName } from '../enums/timer-state';
import type { PresetSnapshot } from '../value-objects/preset-snapshot';

/**
 * Estado final de una sesión de estudio persistida (SPEC.md sección 22.2). Nombre canónico
 * `status` (no `sessionStatus`) por decisiones-tomadas.md punto 12.
 */
export type StudySessionStatus = 'active' | 'completed' | 'cancelled' | 'expired';

/**
 * Motivo específico por el que la sesión llegó a su `status` final. Complementa `status` con
 * detalle para auditoría y estadísticas de abandono (SPEC.md sección 20.4) y para distinguir los
 * dos caminos de expiración: por no responder a tiempo (SPEC.md sección 19) o por sesión "zombie"
 * sin checkpoint en 24h (decisiones-tomadas.md punto 16).
 *
 * `'all_cycles_completed'` es as-built y queda reservado: ningún flujo V1 lo produce (la sesión no
 * tiene número fijo de bloques). `'ended_by_user'` es la ADICIÓN de esta fase (docs/02-DOMINIO.md
 * sección 3.3): cierre normal con "Terminar sesión" entre bloques (T7/T10 de docs/03-CRONOMETRO.md).
 */
export type StudySessionCompletionReason =
  | 'all_cycles_completed'
  | 'ended_by_user'
  | 'expired_no_response'
  | 'cancelled_by_user'
  | 'zombie_timeout_24h';

/** Un tramo de estudio efectivo dentro de la sesión (SPEC.md sección 22.4). */
export interface StudySegment {
  start: string;
  end: string;
  durationSeconds: number;
  cycleNumber: number;
}

/**
 * Tipos de descanso dentro de un bloque (SPEC.md secciones 17.1 y 22.4). El uso del almuerzo se
 * registra con su propio detalle en `lunchSegments`; `'lunch'` se mantiene aquí solo por fidelidad
 * textual con el enum de ejemplo de SPEC.md 22.4, no se usa para poblar `breakSegments`.
 */
export type BreakSegmentType = 'short' | 'long' | 'custom' | 'skipped' | 'lunch';

/** Un tramo de descanso dentro de la sesión (SPEC.md secciones 17.6 y 22.4). */
export interface BreakSegment {
  breakType: BreakSegmentType;
  grantedSeconds: number;
  usedSeconds: number;
  bankDeltaSeconds: number;
  start: string;
  end: string;
  cycleNumber: number;
}

/**
 * Un uso del botón de almuerzo/pánico dentro de la sesión (SPEC.md sección 18). No suma ni resta
 * del banco de descanso y no cuenta como estudio efectivo.
 */
export interface LunchSegment {
  start: string;
  end: string;
  durationSeconds: number;
  cycleNumberAtStart: number;
  /**
   * Estado de la máquina al que se debe volver al terminar el almuerzo
   * (ARCHITECTURE.md sección 11.4, campo `lunchReturnState` del store).
   */
  returnState: TimerStateName;
}

/**
 * Una elección de descanso personalizado hecha por el usuario (SPEC.md sección 17.5), obligatoria
 * en V1. Incluye explícitamente el caso `chosenSeconds: 0`.
 */
export interface CustomBreakSelection {
  cycleNumber: number;
  /** Segundos disponibles en el banco en el momento de elegir (banco previo + descanso recién ganado). */
  availableSeconds: number;
  /** Segundos efectivamente elegidos por el usuario (0 hasta `availableSeconds`). */
  chosenSeconds: number;
  selectedAt: string;
}

/** Información opcional del dispositivo que originó la sesión (SPEC.md sección 22.2). */
export interface SessionDeviceInfo {
  /** 'web' incluye la PWA de escritorio (docs/02-DOMINIO.md sección 3.3). */
  platform: 'ios' | 'android' | 'web';
  deviceName?: string;
  appVersion?: string;
  /** ADICIÓN de esta fase: correlaciona la sesión con el dispositivo dominante que la originó. */
  deviceId?: DeviceId;
}

/**
 * Representa un bloque completo de estudio (SPEC.md secciones 14 y 22.2; ARCHITECTURE.md sección
 * 9.4). Documento persistido en `users/{uid}/sessions/{sessionId}` con `type: 'study'`, en la
 * misma colección que `InverseSession` (ARCHITECTURE.md sección 16.2).
 *
 * Regla crítica de agregación (ARCHITECTURE.md sección 18.8): las estadísticas de estudio deben
 * usar `effectiveStudySeconds`, nunca `totalElapsedSeconds` (que incluye descansos y almuerzo).
 *
 * Nota sobre expiración parcial (decisiones-tomadas.md punto 2): al expirar, `effectiveStudySeconds`
 * conserva la suma de los ciclos ya completados antes de expirar; solo se pierde el tramo en curso.
 */
export interface StudySession {
  id: string;
  userId: string;
  type: 'study';
  name: string;
  categoryId: string;
  categoryNameSnapshot: string;
  /**
   * Histórico únicamente. Por decisiones-tomadas.md punto 6, el color a pintar en
   * calendario/historial/estadísticas SIEMPRE es el color VIGENTE de la categoría (vía
   * `categoryId`), nunca este campo.
   */
  colorSnapshot: string;
  presetSnapshot: PresetSnapshot;
  status: StudySessionStatus;
  startedAt: string;
  endedAt?: string;
  effectiveStudySeconds: number;
  totalElapsedSeconds: number;
  bankRemainingSeconds: number;
  cyclesCompleted: number;
  studySegments: StudySegment[];
  breakSegments: BreakSegment[];
  lunchSegments: LunchSegment[];
  customBreakSelections: CustomBreakSelection[];
  completionReason?: StudySessionCompletionReason;
  deviceInfo?: SessionDeviceInfo;
  createdAt: string;
  updatedAt: string;
}
