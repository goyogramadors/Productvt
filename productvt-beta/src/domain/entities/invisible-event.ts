/** Día de la semana como índice de `Date.getDay()`: 0 = domingo ... 6 = sábado. */
export type WeekDayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Recurrencia semanal mínima requerida por SPEC.md sección 24.5: "sin repetición" se modela como
 * `recurrence` ausente; esta interfaz cubre "semanal", "semanal con múltiples días específicos" y
 * "fecha fin de serie".
 */
export interface WeeklyRecurrence {
  frequency: 'weekly';
  daysOfWeek: WeekDayIndex[];
  /** Fecha fin de la serie (ISO), inclusive. Si se omite, la serie no tiene fin definido. */
  until?: string;
}

/**
 * Evento planificado por el usuario, visible en calendario pero excluido de estadísticas
 * (SPEC.md sección 24; ARCHITECTURE.md sección 9.6). Documento persistido en
 * `users/{uid}/events/{eventId}`.
 *
 * Usa `startAt`/`endAt` (no `startedAt`/`endedAt`): describe algo PLANIFICADO, no algo que ya
 * ocurrió — distinción intencional de decisiones-tomadas.md punto 13. Las ocurrencias recurrentes
 * se expanden en memoria con una función pura (`expandRecurringInvisibleEvents`, a implementar en
 * la fase de calendario); no se guarda un documento por cada ocurrencia.
 */
export interface InvisibleEvent {
  id: string;
  userId: string;
  type: 'invisible';
  name: string;
  categoryId: string;
  categoryNameSnapshot: string;
  /** Histórico únicamente, ver la misma nota en `study-session.ts` sobre decisiones-tomadas.md punto 6. */
  colorSnapshot: string;
  startAt: string;
  endAt: string;
  recurrence?: WeeklyRecurrence;
  notes?: string;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}
