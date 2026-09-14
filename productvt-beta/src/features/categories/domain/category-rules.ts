import type { Category } from '@/domain/entities/category';
import { CategoryPalette, DefaultCategoryColor } from '@/constants/theme';

/**
 * Reglas puras de categorías (ARCHITECTURE.md sección 2.1/30.4: dominio sin React/Firebase/APIs de
 * dispositivo). Cubre SPEC.md sección 12.3 (colores suaves predefinidos + paleta RGB manual) y
 * decisiones-tomadas.md punto 6 (colores en cascada, sin `colorSnapshot` como fuente de pintado).
 */

export const MAX_CATEGORY_NAME_LENGTH = 60;

export function normalizeCategoryName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function isValidCategoryName(name: string): boolean {
  const normalized = normalizeCategoryName(name);
  return normalized.length > 0 && normalized.length <= MAX_CATEGORY_NAME_LENGTH;
}

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function isValidHexColor(color: string): boolean {
  return HEX_COLOR_PATTERN.test(color);
}

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export function clampRgbChannel(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(255, Math.max(0, Math.round(value)));
}

function toHexChannel(value: number): string {
  return clampRgbChannel(value).toString(16).padStart(2, '0');
}

/** Compone un hex `#RRGGBB` a partir de tres canales 0-255, para la paleta RGB manual (SPEC 12.3). */
export function rgbToHex({ r, g, b }: RgbColor): string {
  return `#${toHexChannel(r)}${toHexChannel(g)}${toHexChannel(b)}`.toUpperCase();
}

/** Inversa de `rgbToHex`, para inicializar los sliders/inputs RGB a partir de un color guardado. */
export function hexToRgb(hex: string): RgbColor | null {
  if (!isValidHexColor(hex)) return null;
  const normalized = hex.slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

/** Índice `categoryId -> Category` para resolver colores/nombres vigentes en O(1). */
export function buildCategoryIndex(categories: readonly Category[]): ReadonlyMap<string, Category> {
  return new Map(categories.map((category) => [category.id, category]));
}

/**
 * Color VIGENTE de una categoría, para pintar calendario/historial/estadísticas
 * (decisiones-tomadas.md punto 6: "cambiar el color de una categoría actualiza... también lo que
 * ya está guardado"). Cualquier UI que necesite el color de una sesión/evento debe llamar a esta
 * función con el `categoryId` guardado, NUNCA leer un `colorSnapshot` congelado — ese campo,
 * cuando existe en alguna entidad histórica, es solo para trazabilidad interna y está
 * explícitamente prohibido como fuente de pintado.
 *
 * Si la categoría ya no existe (borrado de datos corrupto o edge case), cae a `fallbackColor` en
 * vez de romper el render.
 */
export function resolveCategoryColor(
  categoryId: string,
  categoryIndex: ReadonlyMap<string, Category>,
  fallbackColor: string = DefaultCategoryColor
): string {
  return categoryIndex.get(categoryId)?.color ?? fallbackColor;
}

/** Nombre vigente de una categoría, misma lógica de no-snapshot que `resolveCategoryColor`. */
export function resolveCategoryName(
  categoryId: string,
  categoryIndex: ReadonlyMap<string, Category>,
  fallbackName = 'Categoría eliminada'
): string {
  return categoryIndex.get(categoryId)?.name ?? fallbackName;
}

/** `true` si el color coincide (case-insensitive) con alguno de los presets suaves de `CategoryPalette`. */
export function isPaletteColor(color: string): boolean {
  const normalized = color.toUpperCase();
  return CategoryPalette.some((paletteColor) => paletteColor.toUpperCase() === normalized);
}
