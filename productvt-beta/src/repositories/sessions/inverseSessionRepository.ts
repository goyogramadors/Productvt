import { getDoc, onSnapshot, query, type Unsubscribe } from 'firebase/firestore';

import type { InverseSession } from '@/domain/entities/inverse-session';
import { compareSessionsByStartedAtDesc } from '@/domain/rules/session-history';
import { sessionDocRef, sessionsCollection, type SessionDocument } from '@/infrastructure/firebase/collections';
import { type AsyncResult, err, ok } from '@/types/common';

import {
  buildSessionQueryConstraints,
  fetchSessionsRaw,
  SessionRepositoryError,
  type SessionQueryFilters,
} from './sessionRepository';

/**
 * Repositorio de bloques inversos dentro de `users/{uid}/sessions/` (docs/02-DOMINIO.md sección
 * 2.4/5.1). Misma colección física que `sessionRepository.ts` (discriminada por `type`), así que
 * reutiliza su construcción de consulta (`buildSessionQueryConstraints`, `fetchSessionsRaw`) y su
 * `SessionRepositoryError` en vez de duplicarlas — evita que las dos consultas ("estudio"/
 * "inverso") diverjan silenciosamente en cómo arman el `where`/`orderBy`.
 */
export { SessionRepositoryError, type SessionQueryFilters };

export async function listInverseSessions(
  uid: string,
  filters: SessionQueryFilters = {}
): AsyncResult<InverseSession[], SessionRepositoryError> {
  try {
    const sessions = await fetchSessionsRaw(uid, 'inverse', filters);
    return ok(sessions as InverseSession[]);
  } catch (error) {
    return err(new SessionRepositoryError(`No se pudieron leer los bloques inversos: ${String(error)}`));
  }
}

/** Lee un bloque inverso por id; `null` si no existe o si el documento es de otro `type`. */
export async function getInverseSession(
  uid: string,
  sessionId: string
): AsyncResult<InverseSession | null, SessionRepositoryError> {
  try {
    const snap = await getDoc(sessionDocRef(uid, sessionId));
    if (!snap.exists()) return ok(null);
    const data = snap.data();
    return ok(data.type === 'inverse' ? data : null);
  } catch (error) {
    return err(new SessionRepositoryError(`No se pudo leer el bloque inverso: ${String(error)}`));
  }
}

/** Suscripción en vivo, misma semántica que `subscribeStudySessions`. */
export function subscribeInverseSessions(
  uid: string,
  filters: SessionQueryFilters,
  onData: (sessions: InverseSession[]) => void,
  onError: (error: SessionRepositoryError) => void
): Unsubscribe {
  const q = query(sessionsCollection(uid), ...buildSessionQueryConstraints('inverse', filters));
  return onSnapshot(
    q,
    (snap) => {
      const raw: SessionDocument[] = snap.docs.map((d) => d.data());
      const sessions = (filters.categoryId ? [...raw].sort(compareSessionsByStartedAtDesc) : raw) as InverseSession[];
      onData(sessions);
    },
    (error) => onError(new SessionRepositoryError(`Error de sincronización de bloques inversos: ${String(error)}`))
  );
}
