import type { CategoryType } from '../enums/category-type';

/**
 * Agrupador visual y funcional para bloques de estudio, bloques inversos o eventos invisibles.
 * Existen tres sistemas de categoría separados por `type` (SPEC.md sección 12.1), pero comparten
 * la misma colección de Firestore `users/{uid}/categories` discriminada por ese campo
 * (ARCHITECTURE.md sección 16.1).
 */
export interface Category {
  id: string;
  userId: string;
  type: CategoryType;
  name: string;
  /**
   * Color vigente en formato hex (#RRGGBB). Cambiarlo actualiza retroactivamente el color con el
   * que se pinta el historial ya guardado (calendario, sesiones, estadísticas): decisiones-tomadas.md
   * punto 6, "colores en cascada, incluyendo histórico". Todo renderizado debe leer este campo vía
   * `categoryId`, nunca un snapshot congelado.
   */
  color: string;
  /** Ícono opcional futuro (SPEC.md sección 12.2). No expuesto en la UI de V1. */
  icon?: string;
  /**
   * Reservado para personalización futura con imágenes (decisiones-tomadas.md, sección
   * "Personalización futura con imágenes"). La UI de V1 no expone todavía un selector de imagen;
   * el campo existe desde ya para evitar una migración de datos rota más adelante.
   */
  imageUrl?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}
