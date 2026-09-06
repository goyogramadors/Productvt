/**
 * Los tres sistemas de categoría, intencionalmente separados (SPEC.md sección 12.1):
 * - `study`: categorías de bloques de estudio.
 * - `inverse`: categorías de bloques inversos (ocio / anti-estudio).
 * - `invisible`: categorías de eventos invisibles planificados.
 */
export type CategoryType = 'study' | 'inverse' | 'invisible';

export const CATEGORY_TYPES: readonly CategoryType[] = ['study', 'inverse', 'invisible'] as const;
