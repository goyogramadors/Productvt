import type { ActiveInverseSession, ActiveSession, ActiveStudySession } from '../entities/active-session';
import { ZOMBIE_TIMEOUT_SECONDS } from '../entities/active-session';
import type {
  InverseSession,
  InverseSessionStatus,
} from '../entities/inverse-session';
import type {
  StudySession,
  StudySessionCompletionReason,
  StudySessionStatus,
} from '../entities/study-session';
import type { CategorySnapshot } from '../value-objects/category-snapshot';
import { resolveCancelledSessionEffectiveSeconds, sumEffectiveStudySeconds } from './session-effective-seconds';

/**
 * Materialización del singleton `active/session` al documento histórico `sessions/{id}`
 * (docs/02-DOMINIO.md sección 3.6). Funciones puras: no escriben Firestore, solo calculan el
 * `StudySession`/`InverseSession` final — el batch `set(sessions/{id})` + `delete(active/session)`
 * lo ejecuta `StudySessionCoordinator` (capa de aplicación).
 */

export interface StudySessionClosure {
  terminalState: 'session_completed' | 'session_cancelled' | 'session_expired';
  completionReason: StudySessionCompletionReason;
  endedAt: string;
}

function statusFromTerminalState(terminalState: StudySessionClosure['terminalState']): StudySessionStatus {
  switch (terminalState) {
    case 'session_completed':
      return 'completed';
    case 'session_cancelled':
      return 'cancelled';
    case 'session_expired':
      return 'expired';
  }
}

/**
 * Convierte el singleton en el documento histórico. Aplica la tabla terminal → status de
 * docs/02-DOMINIO.md sección 3.3.
 *
 * NOTA sobre `categorySnapshot` (tercer parámetro, no está en la firma literal de
 * docs/02-DOMINIO.md sección 3.6): `ActiveStudySession` no carga `categoryNameSnapshot`/
 * `colorSnapshot` — esos campos históricos de `StudySession` no tienen fuente en el singleton (la
 * categoría vigente vive en Firestore, fuera del alcance de una función de dominio pura). Se
 * resuelve con un parámetro opcional que el coordinador llena con `buildCategorySnapshot(category)`
 * (`value-objects/category-snapshot.ts`, ya as-built) antes de persistir; si se omite (p. ej. en un
 * test que no necesita esos campos) se guarda `''`, nunca `undefined` (los campos no son opcionales
 * en `StudySession`).
 */
export function materializeStudySession(
  active: ActiveStudySession,
  closure: StudySessionClosure,
  categorySnapshot?: Pick<CategorySnapshot, 'nameSnapshot' | 'colorSnapshot'>
): StudySession {
  const effectiveStudySeconds =
    closure.terminalState === 'session_cancelled'
      ? resolveCancelledSessionEffectiveSeconds(active.studySegments)
      : sumEffectiveStudySeconds(active.studySegments);

  const totalElapsedSeconds = Math.round(
    (Date.parse(closure.endedAt) - Date.parse(active.startedAt)) / 1000
  );

  return {
    id: active.sessionId,
    userId: active.userId,
    type: 'study',
    name: active.name,
    categoryId: active.categoryId,
    categoryNameSnapshot: categorySnapshot?.nameSnapshot ?? '',
    colorSnapshot: categorySnapshot?.colorSnapshot ?? '',
    presetSnapshot: active.presetSnapshot,
    status: statusFromTerminalState(closure.terminalState),
    startedAt: active.startedAt,
    endedAt: closure.endedAt,
    effectiveStudySeconds,
    totalElapsedSeconds,
    bankRemainingSeconds: active.bankRemainingSeconds,
    cyclesCompleted: active.cyclesCompleted,
    studySegments: active.studySegments,
    breakSegments: active.breakSegments,
    lunchSegments: active.lunchSegments,
    customBreakSelections: active.customBreakSelections,
    completionReason: closure.completionReason,
    deviceInfo: active.deviceInfo,
    createdAt: active.createdAt,
    updatedAt: closure.endedAt,
  };
}

export interface InverseSessionClosure {
  /**
   * Literal de docs/02-DOMINIO.md sección 3.6 (excluye `'active'`, que nunca es un status de
   * cierre). `'interrupted'` queda reservado: ningún flujo de esta fase construye un closure con
   * ese valor (docs/02-DOMINIO.md sección 8, REV-MEDIA-8).
   */
  status: Exclude<InverseSessionStatus, 'active'>;
  autoFinished: boolean;
  endedAt: string;
}

/**
 * Ver nota de `categorySnapshot` en `materializeStudySession` — misma razón, mismo tratamiento.
 */
export function materializeInverseSession(
  active: ActiveInverseSession,
  closure: InverseSessionClosure,
  categorySnapshot?: Pick<CategorySnapshot, 'nameSnapshot' | 'colorSnapshot'>
): InverseSession {
  const totalElapsedSeconds = Math.round(
    (Date.parse(closure.endedAt) - Date.parse(active.startedAt)) / 1000
  );

  return {
    id: active.sessionId,
    userId: active.userId,
    type: 'inverse',
    name: active.name,
    categoryId: active.categoryId,
    categoryNameSnapshot: categorySnapshot?.nameSnapshot ?? '',
    colorSnapshot: categorySnapshot?.colorSnapshot ?? '',
    startedAt: active.startedAt,
    endedAt: closure.endedAt,
    targetDurationSeconds: active.targetDurationSeconds,
    totalElapsedSeconds,
    remindersTriggered: active.remindersTriggered,
    status: closure.status,
    autoFinished: closure.autoFinished,
    deviceInfo: active.deviceInfo,
    createdAt: active.createdAt,
    updatedAt: closure.endedAt,
  };
}

/**
 * `true` si `now - lastCheckpointAt > ZOMBIE_TIMEOUT_SECONDS` (docs/03-CRONOMETRO.md sección 9.3).
 * Ambos parámetros son ISO de tiempo de servidor (docs/02-DOMINIO.md sección 6.1).
 */
export function isZombie(active: ActiveSession, nowIso: string): boolean {
  return (Date.parse(nowIso) - Date.parse(active.lastCheckpointAt)) / 1000 > ZOMBIE_TIMEOUT_SECONDS;
}
