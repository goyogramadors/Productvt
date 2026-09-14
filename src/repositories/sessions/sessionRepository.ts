import {
  getDoc,
  getDocs,
  limit as limitToCount,
  onSnapshot,
  orderBy,
  query,
  where,
  type QueryConstraint,
  type Unsubscribe,
} from 'firebase/firestore';

import type { SessionRecord } from '@/domain/entities/session-record';
import type { StudySession } from '@/domain/entities/study-session';
import { compareSessionsByStartedAtDesc } from '@/domain/rules/session-history';
import { sessionDocRef, sessionsCollection, type SessionDocument } from '@/infrastructure/firebase/collections';
import { type AsyncResult, err, ok } from '@/types/common';

/**
 * Repositorio de `users/{uid}/sessions/` (docs/02-DOMINIO.md sección 5.1/5.2; decisiones-tomadas.md
 * punto 9). Único archivo (junto a `inverseSessionRepository.ts`, que reutiliza sus helpers) que
 * llama a `firebase/firestore` para esta colección; `features/sessions` consume exclusivamente sus
 * funciones. `sessions/` mezcla `StudySession` e `InverseSession` en un solo documento por sesión
 * (`SessionDocument`, as-built desde la Fase 1) — no hay subcolección de bloques.
 *
 * Ambos repositorios comparten `SessionRepositoryError`: leen/escriben la misma colección física, y
 * `inverseSessionRepository.ts` reutiliza `buildSessionQueryConstraints`/`fetchSessionsRaw` de aquí
 * para no duplicar la construcción de la consulta.
 */
export class SessionRepositoryError extends Error {}

export interface SessionQueryFilters {
  /** Igualdad exacta sobre `categoryId`. */
  categoryId?: string;
  /** `startedAt >= fromIso` (ISO 8601 UTC). */
  fromIso?: string;
  /** `startedAt <= toIso` (ISO 8601 UTC). */
  toIso?: string;
  limitCount?: number;
}

/**
 * Constraints de la consulta sobre `sessions/` para un `type` dado (docs/02-DOMINIO.md sección
 * 5.2, tabla de índices). Sin `categoryId`: usa el índice `(type ASC, startedAt DESC)` — ya
 * ordenado "más reciente primero", el contrato de este repositorio. Con `categoryId`: solo existe
 * el índice `(type ASC, categoryId ASC, startedAt ASC)`, así que se pide ascendente y
 * `fetchSessionsRaw`/`subscribe*` reordenan a descendente en el cliente con
 * `compareSessionsByStartedAtDesc` (docs/02-DOMINIO.md sección 5.2: "leer un rango acotado y
 * agregar en cliente") — ninguna consulta de esta fase requiere un índice compuesto nuevo.
 */
export function buildSessionQueryConstraints(
  type: SessionDocument['type'],
  filters: SessionQueryFilters
): QueryConstraint[] {
  const constraints: QueryConstraint[] = [where('type', '==', type)];
  if (filters.categoryId) constraints.push(where('categoryId', '==', filters.categoryId));
  if (filters.fromIso) constraints.push(where('startedAt', '>=', filters.fromIso));
  if (filters.toIso) constraints.push(where('startedAt', '<=', filters.toIso));
  constraints.push(orderBy('startedAt', filters.categoryId ? 'asc' : 'desc'));
  if (filters.limitCount) constraints.push(limitToCount(filters.limitCount));
  return constraints;
}

function normalizeDescOrder(sessions: SessionDocument[], filters: SessionQueryFilters): SessionDocument[] {
  return filters.categoryId ? [...sessions].sort(compareSessionsByStartedAtDesc) : sessions;
}

/** Lectura cruda compartida por ambos repositorios (estudio e inverso, mismo `type` discriminador). */
export async function fetchSessionsRaw(
  uid: string,
  type: SessionDocument['type'],
  filters: SessionQueryFilters
): Promise<SessionDocument[]> {
  const q = query(sessionsCollection(uid), ...buildSessionQueryConstraints(type, filters));
  const snap = await getDocs(q);
  return normalizeDescOrder(
    snap.docs.map((d) => d.data()),
    filters
  );
}

export async function listStudySessions(
  uid: string,
  filters: SessionQueryFilters = {}
): AsyncResult<StudySession[], SessionRepositoryError> {
  try {
    const sessions = await fetchSessionsRaw(uid, 'study', filters);
    return ok(sessions as StudySession[]);
  } catch (error) {
    return err(new SessionRepositoryError(`No se pudieron leer las sesiones de estudio: ${String(error)}`));
  }
}

/** Lee una sesión de estudio por id; `null` si no existe o si el documento es de otro `type`. */
export async function getStudySession(
  uid: string,
  sessionId: string
): AsyncResult<StudySession | null, SessionRepositoryError> {
  try {
    const snap = await getDoc(sessionDocRef(uid, sessionId));
    if (!snap.exists()) return ok(null);
    const data = snap.data();
    return ok(data.type === 'study' ? data : null);
  } catch (error) {
    return err(new SessionRepositoryError(`No se pudo leer la sesión: ${String(error)}`));
  }
}

/**
 * Lee cualquier sesión (estudio o inverso) por id, sin conocer su `type` de antemano — usado por
 * la pantalla de detalle del historial, que navega solo con el `sessionId`.
 */
export async function getSessionRecord(
  uid: string,
  sessionId: string
): AsyncResult<SessionRecord | null, SessionRepositoryError> {
  try {
    const snap = await getDoc(sessionDocRef(uid, sessionId));
    return ok(snap.exists() ? snap.data() : null);
  } catch (error) {
    return err(new SessionRepositoryError(`No se pudo leer la sesión: ${String(error)}`));
  }
}

/**
 * Suscripción en vivo a las sesiones de estudio que matchean `filters` (mismo espíritu que
 * `subscribeCategories`, decisiones-tomadas.md punto 14): otro dispositivo que cierra una sesión
 * aparece en el historial sin recargar. Devuelve la función de `unsubscribe`.
 */
export function subscribeStudySessions(
  uid: string,
  filters: SessionQueryFilters,
  onData: (sessions: StudySession[]) => void,
  onError: (error: SessionRepositoryError) => void
): Unsubscribe {
  const q = query(sessionsCollection(uid), ...buildSessionQueryConstraints('study', filters));
  return onSnapshot(
    q,
    (snap) => {
      const sessions = normalizeDescOrder(
        snap.docs.map((d) => d.data()),
        filters
      ) as StudySession[];
      onData(sessions);
    },
    (error) => onError(new SessionRepositoryError(`Error de sincronización de sesiones: ${String(error)}`))
  );
}
