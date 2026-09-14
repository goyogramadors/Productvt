import type { Category } from '../entities/category';
import type { CategoryType } from '../enums/category-type';

/**
 * Foto histórica de una categoría en el momento de crear un bloque o evento.
 *
 * IMPORTANTE: por decisiones-tomadas.md punto 6, esta foto NUNCA se usa para pintar en UI (el
 * color a renderizar siempre es el vigente de la categoría, vía `categoryId`). Su único propósito
 * es servir de helper puro para construir los campos planos que sí persisten las entidades de
 * sesión/evento (`categoryNameSnapshot`, `colorSnapshot`), evitando repetir ese mapeo a mano en
 * cada coordinador/servicio que cree una sesión o evento nuevo.
 */
export interface CategorySnapshot {
  categoryId: string;
  type: CategoryType;
  nameSnapshot: string;
  colorSnapshot: string;
}

export function buildCategorySnapshot(category: Category): CategorySnapshot {
  return {
    categoryId: category.id,
    type: category.type,
    nameSnapshot: category.name,
    colorSnapshot: category.color,
  };
}
