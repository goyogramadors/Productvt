import type { InverseSession } from '@/domain/entities/inverse-session';
import type { SessionRecord } from '@/domain/entities/session-record';
import type { StudySession } from '@/domain/entities/study-session';
import { mergeSessionRecordsByStartedAtDesc } from '@/domain/rules/session-history';
import {
  getInverseSession,
  listInverseSessions,
  subscribeInverseSessions,
} from '@/repositories/sessions/inverseSessionRepository';
import {
  getSessionRecord,
  getStudySession,
  listStudySessions,
  SessionRepositoryError,
  subscribeStudySessions,
  type SessionQueryFilters,
} from '@/repositories/sessions/sessionRepository';
import { type AsyncResult, err, ok } from '@/types/common';

/**
 * Orquestación entre `features/sessions` (hooks/UI) y los dos repositorios de `sessions/`
 * (ARCHITECTURE.md sección 2.2/15.3): combina estudio + inverso en una sola lista con la función
 * pura de dominio `mergeSessionRecordsByStartedAtDesc` (docs/08-PLAN-IMPLEMENTACION.md sección 9,
 * criterio "la lista muestra sesiones de estudio e inverso"). Ningún hook llama a los
 * repositorios directo.
 */
export { SessionRepositoryError };
export type { SessionQueryFilters };

export async function queryHistory(
  uid: string,
  filters: SessionQueryFilters = {}
): AsyncResult<SessionRecord[], SessionRepositoryError> {
  const [studyResult, inverseResult] = await Promise.all([
    listStudySessions(uid, filters),
    listInverseSessions(uid, filters),
  ]);
  if (!studyResult.success) return err(studyResult.error);
  if (!inverseResult.success) return err(inverseResult.error);
  return ok(mergeSessionRecordsByStartedAtDesc(studyResult.data, inverseResult.data));
}

/**
 * Suscripción combinada en vivo: se suscribe a estudio e inverso por separado y reemite la lista
 * combinada cada vez que cualquiera de las dos cambia. Devuelve una función `unsubscribe` única.
 */
export function subscribeHistory(
  uid: string,
  filters: SessionQueryFilters,
  onData: (sessions: SessionRecord[]) => void,
  onError: (error: SessionRepositoryError) => void
): () => void {
  let studySessions: StudySession[] = [];
  let inverseSessions: InverseSession[] = [];

  function emit() {
    onData(mergeSessionRecordsByStartedAtDesc(studySessions, inverseSessions));
  }

  const unsubscribeStudy = subscribeStudySessions(
    uid,
    filters,
    (data) => {
      studySessions = data;
      emit();
    },
    onError
  );
  const unsubscribeInverse = subscribeInverseSessions(
    uid,
    filters,
    (data) => {
      inverseSessions = data;
      emit();
    },
    onError
  );

  return () => {
    unsubscribeStudy();
    unsubscribeInverse();
  };
}

/** Detalle de una sesión cualquiera (estudio o inverso) por id, para la pantalla de detalle. */
export async function getSessionDetail(
  uid: string,
  sessionId: string
): AsyncResult<SessionRecord | null, SessionRepositoryError> {
  return getSessionRecord(uid, sessionId);
}

export { getInverseSession, getStudySession };
