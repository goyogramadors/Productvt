import type { InverseSession } from '../entities/inverse-session';
import type { SessionRecord } from '../entities/session-record';
import type { StudySession } from '../entities/study-session';

/**
 * Reglas puras del historial de sesiones (docs/08-PLAN-IMPLEMENTACION.md sección 9, Fase 5; sin
 * React ni Firebase, ARCHITECTURE.md sección 2.1/30.4). `sessions/` mezcla `StudySession` e
 * `InverseSession` en una sola colección (docs/02-DOMINIO.md sección 2.3/2.4); estas funciones son
 * la única forma válida de combinarlas, ordenarlas y filtrarlas para la pantalla de historial —
 * el repositorio y el servicio de `features/sessions` las consumen en vez de reimplementarlas.
 */

/**
 * Tiempo que representa a cada sesión en la lista/detalle: `effectiveStudySeconds` para estudio
 * (nunca `totalElapsedSeconds`, que incluye descansos/almuerzo — docs/02-DOMINIO.md sección 1.2,
 * fila "Tiempo efectivo") y `totalElapsedSeconds` para el inverso (no existe un "tiempo efectivo"
 * separado para ocio, docs/02-DOMINIO.md sección 2.4).
 */
export function sessionDisplayDurationSeconds(session: SessionRecord): number {
  return session.type === 'study' ? session.effectiveStudySeconds : session.totalElapsedSeconds;
}

/**
 * Orden "más reciente primero". Desempata por `id` para que el resultado sea determinístico
 * (dos sesiones no pueden compartir `startedAt` exacto en la práctica, pero un empate no debe
 * producir un orden que cambie entre llamadas).
 */
export function compareSessionsByStartedAtDesc(a: SessionRecord, b: SessionRecord): number {
  if (a.startedAt !== b.startedAt) return b.startedAt.localeCompare(a.startedAt);
  return b.id.localeCompare(a.id);
}

/**
 * Combina sesiones de estudio e inverso —ambas viven en `sessions/`, discriminadas por `type`— en
 * una sola lista ordenada por `startedAt` descendente. Es el criterio de aceptación literal de la
 * Fase 5: "la lista muestra sesiones de estudio e inverso".
 */
export function mergeSessionRecordsByStartedAtDesc(
  studySessions: readonly StudySession[],
  inverseSessions: readonly InverseSession[]
): SessionRecord[] {
  return [...studySessions, ...inverseSessions].sort(compareSessionsByStartedAtDesc);
}

/**
 * Filtra por rango de fechas inclusivo sobre `startedAt`. Comparación lexicográfica válida porque
 * `startedAt` siempre es ISO 8601 en UTC (docs/02-DOMINIO.md sección 6.1/I-19). A diferencia del
 * rango ampliado ±48h de estadísticas/calendario (docs/02-DOMINIO.md sección 5.2, que atribuye
 * bloques por su `end`), el historial filtra la sesión completa por su propio `startedAt` — no hay
 * atribución de bloques individuales en esta fase.
 */
export function filterSessionRecordsByDateRange(
  sessions: readonly SessionRecord[],
  fromIso?: string,
  toIso?: string
): SessionRecord[] {
  return sessions.filter(
    (session) => (!fromIso || session.startedAt >= fromIso) && (!toIso || session.startedAt <= toIso)
  );
}

/** Filtra por `categoryId` exacto; sin filtro, devuelve una copia de la lista sin tocar. */
export function filterSessionRecordsByCategory(
  sessions: readonly SessionRecord[],
  categoryId?: string
): SessionRecord[] {
  if (!categoryId) return [...sessions];
  return sessions.filter((session) => session.categoryId === categoryId);
}
