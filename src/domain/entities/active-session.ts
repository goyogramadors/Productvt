import type { TimerStateName } from '../enums/timer-state';
import type { PresetSnapshot } from '../value-objects/preset-snapshot';
import type {
  BreakSegment,
  CustomBreakSelection,
  LunchSegment,
  SessionDeviceInfo,
  StudySegment,
} from './study-session';

/**
 * Singleton `users/{uid}/active/session` (docs/02-DOMINIO.md sección 2.5/3.4): la fuente de
 * verdad de "hay algo corriendo" para TODOS los dispositivos del usuario, discriminada por `type`
 * en `ActiveStudySession | ActiveInverseSession`. AsyncStorage (`timerPersistence.ts`) solo acelera
 * el arranque del dispositivo dominante; Firestore es siempre la verdad.
 *
 * LÍMITE EXPLÍCITO DE ESTA FASE (4a, no 4b — ver docs/02-DOMINIO.md sección 3.4 "Reglas de
 * escritura del singleton" puntos 3-4 y docs/03-CRONOMETRO.md, ambos fuera de alcance aquí):
 * `DeviceRole`/`ControlRequest` se definen (el tipo existe, `sessions/{sessionId}` y
 * `active/session` ya reservan el campo) pero NINGÚN código de esta fase escribe ni lee
 * `controlRequest` para cambiar de dominante — eso es el protocolo de `docs/04-SINCRONIZACION.md`
 * (Fase 4b, todavía no existe). Esta fase asume siempre `dominantDeviceId === deviceId` local.
 */

/** uuid v4 generado y persistido localmente (docs/02-DOMINIO.md sección 6.4); nunca derivado del hardware. */
export type DeviceId = string;

/** Fase 4b: hoy todo dispositivo que inicia una sesión es 'dominant' por definición (ver límite de fase arriba). */
export type DeviceRole = 'dominant' | 'spectator';

/**
 * Solicitud de un espectador para tomar el control del timer activo (docs/02-DOMINIO.md sección
 * 3.4/5.3). El tipo se define completo desde ya para que el esquema de `active/session` no
 * necesite una migración cuando Fase 4b implemente su lógica; ningún flujo de esta fase produce ni
 * consume un `ControlRequest` real.
 */
export interface ControlRequest {
  requesterDeviceId: DeviceId;
  /** Las reglas de seguridad exigen 'android' en V1 (docs/02-DOMINIO.md sección 5.3). */
  requesterPlatform: 'ios' | 'android' | 'web';
  requesterDeviceName?: string;
  /** ISO en el dominio; `serverTimestamp()` en Firestore. */
  requestedAt: string;
}

/** Tramo pausado por un almuerzo pedido desde `study_running` o `break_running` (docs/03-CRONOMETRO.md sección 7.2). */
export interface PausedSegment {
  /** Inicio original del tramo pausado. */
  startedAt: string;
  /** Duración completa planificada del tramo pausado. */
  targetSeconds: number;
  /** Segundos que faltaban al iniciar el almuerzo. */
  remainingSeconds: number;
}

interface ActiveSessionBase {
  /** Será el id del documento en `sessions/` al materializar (misma identidad de principio a fin). */
  sessionId: string;
  userId: string;
  /**
   * Fase 4b, TODO de una línea: hoy siempre es el `deviceId` local de quien inició la sesión (sin
   * lógica de cesión ni de detección de otros dominantes); `clockOffset` contra el reloj del
   * servidor tampoco existe todavía — ver `src/domain/rules/timer-engine.ts`.
   */
  dominantDeviceId: DeviceId;
  name: string;
  categoryId: string;
  /** Inicio de la sesión (ISO). */
  startedAt: string;
  /** ISO en el dominio; `serverTimestamp()` en Firestore. */
  lastCheckpointAt: string;
  /** Ver nota de límite de fase arriba: el campo existe, ningún flujo de esta fase lo escribe. */
  controlRequest?: ControlRequest;
  /** Dispositivo que inició la sesión. */
  deviceInfo: SessionDeviceInfo;
  createdAt: string;
  updatedAt: string;
}

/** Semántica completa de los campos de tramo en docs/02-DOMINIO.md sección 3.4 (tabla de interpolación). */
export interface ActiveStudySession extends ActiveSessionBase {
  type: 'study';
  presetSnapshot: PresetSnapshot;
  /** Nunca 'idle' ni un estado terminal mientras el documento exista (invariante I-13). */
  currentState: TimerStateName;
  /** Solo presente mientras `currentState === 'lunch_running'`. */
  stateBeforeLunch?: TimerStateName;
  /** Solo en `lunch_running` si `stateBeforeLunch` corría (`study_running` o `break_running`). */
  pausedSegment?: PausedSegment;
  /** Inicio del tramo en curso (bloque, descanso, almuerzo o ventana de respuesta). */
  segmentStartedAt: string;
  /** Duración planificada del tramo en curso. */
  segmentTargetSeconds: number;
  /** Solo si el tramo en curso se reanudó tras un almuerzo. */
  segmentResumedAt?: string;
  /** Segundos que faltaban al reanudar. */
  segmentRemainingAtResumeSeconds?: number;
  /** Solo en `*_waiting_response` y `break_selection`. */
  responseDeadlineAt?: string;
  /** = `studySegments.length`. */
  cyclesCompleted: number;
  /** Bloques completados desde el último almuerzo (o desde el inicio). */
  cyclesSinceLunch: number;
  /** = `lunchSegments.length > 0`. */
  lunchUsed: boolean;
  /** = Σ `studySegments[].durationSeconds`. */
  effectiveStudySeconds: number;
  /** = Σ `breakSegments[].bankDeltaSeconds`. */
  bankRemainingSeconds: number;
  /** Bloques COMPLETADOS (checkpoint incremental); el bloque en curso no está aquí. */
  studySegments: StudySegment[];
  breakSegments: BreakSegment[];
  lunchSegments: LunchSegment[];
  customBreakSelections: CustomBreakSelection[];
}

export interface ActiveInverseSession extends ActiveSessionBase {
  type: 'inverse';
  /** `T`; tope duro `2·T` (`INVERSE_HARD_CAP_FACTOR`). */
  targetDurationSeconds: number;
  /** Recordatorios ya emitidos (cada `INVERSE_REMINDER_INTERVAL_SECONDS`). */
  remindersTriggered: number;
}

export type ActiveSession = ActiveStudySession | ActiveInverseSession;

/** 24 h sin checkpoint nuevo cierra la sesión como zombie (docs/02-DOMINIO.md sección 3.4, D16, R16). */
export const ZOMBIE_TIMEOUT_SECONDS = 24 * 60 * 60;

/** Duración fija del almuerzo, 45 min (docs/02-DOMINIO.md sección 3.4, R5). */
export const LUNCH_DURATION_SECONDS = 45 * 60;

/** Bloques completados necesarios para rehabilitar el almuerzo tras el primer uso (docs/02-DOMINIO.md sección 3.4, R5). */
export const LUNCH_COOLDOWN_CYCLES = 3;

/** Cadencia de recordatorios del temporizador inverso, 15 min (docs/02-DOMINIO.md sección 3.4, brief §3.5). */
export const INVERSE_REMINDER_INTERVAL_SECONDS = 15 * 60;

/** Tope duro del temporizador inverso = factor * `targetDurationSeconds` (docs/02-DOMINIO.md sección 3.4). */
export const INVERSE_HARD_CAP_FACTOR = 2;
