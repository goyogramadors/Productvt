import { StatusColors } from '@/constants/theme';
import type { SessionRecord } from '@/domain/entities/session-record';

/**
 * Copys/tono de estado de una sesión para la lista y el detalle del historial (Fase 5). Función
 * pura (ARCHITECTURE.md sección 2.1: sin React/Firebase), pero vive en `features/sessions/domain`
 * y no en `src/domain/**` porque es copy de UI en español, no una regla de negocio verificable con
 * invariantes (mismo criterio que `features/categories/domain/category-rules.ts`).
 */
export interface SessionStatusMeta {
  label: string;
  color: string;
  /** Aclaración adicional para el detalle, p. ej. por qué un cierre no cuenta en estadísticas. */
  note?: string;
}

export function resolveSessionStatusMeta(session: SessionRecord): SessionStatusMeta {
  if (session.type === 'study') {
    switch (session.status) {
      case 'completed':
        return { label: 'Completada', color: StatusColors.success };
      case 'cancelled':
        return { label: 'Cancelada', color: StatusColors.danger };
      case 'expired':
        return session.completionReason === 'zombie_timeout_24h'
          ? { label: 'Expirada por inactividad', color: StatusColors.warning }
          : { label: 'Expirada', color: StatusColors.warning };
      case 'active':
      default:
        // No debería aparecer en `sessions/` (docs/02-DOMINIO.md sección 2.3, I-13); se maneja por
        // exhaustividad de tipo, nunca por un flujo real de esta fase.
        return { label: 'En curso', color: StatusColors.info };
    }
  }

  switch (session.status) {
    case 'completed':
      return session.autoFinished
        ? {
            label: 'Cerrado automáticamente',
            color: StatusColors.warning,
            note: 'Se cerró solo al llegar al tope de tiempo (2× la meta).',
          }
        : { label: 'Completado', color: StatusColors.success };
    case 'cancelled':
      return {
        label: 'Cancelado',
        color: StatusColors.danger,
        note: 'No cuenta en tus estadísticas de tiempo libre.',
      };
    case 'interrupted':
      // Reservado (docs/02-DOMINIO.md sección 8, REV-MEDIA-8): ningún flujo V1 lo produce todavía.
      return { label: 'Interrumpido', color: StatusColors.neutral };
    case 'active':
    default:
      return { label: 'En curso', color: StatusColors.info };
  }
}
