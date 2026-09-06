import type { WeekKey } from '../value-objects/week-key';

export type WeeklyGoalStatus = 'pending' | 'completed' | 'failed';

/**
 * Meta semanal de estudio efectivo por categoría (SPEC.md sección 26; ARCHITECTURE.md sección
 * 9.7). Documento persistido en `users/{uid}/goals/{goalId}`.
 *
 * Reglas críticas (SPEC.md sección 26.4): solo aplica a categorías de tipo `study`, y el progreso
 * (`achievedSeconds`) se calcula siempre con `effectiveStudySeconds` de las sesiones del rango
 * semanal, nunca con `totalElapsedSeconds`.
 */
export interface WeeklyGoal {
  id: string;
  userId: string;
  weekKey: WeekKey;
  categoryId: string;
  categoryNameSnapshot: string;
  targetSeconds: number;
  achievedSeconds: number;
  status: WeeklyGoalStatus;
  createdAt: string;
  updatedAt: string;
}
