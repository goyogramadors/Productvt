import { z } from 'zod';

import { MAX_CATEGORY_NAME_LENGTH, isValidHexColor } from '@/features/categories/domain/category-rules';

/**
 * Validación del formulario de categoría con Zod (mismo patrón que `features/auth/schemas`).
 * La validación de negocio (formato hex) reutiliza `isValidHexColor` del dominio puro en vez de
 * reimplementar el regex aquí.
 */
export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Ingresa un nombre.')
    .max(MAX_CATEGORY_NAME_LENGTH, `Máximo ${MAX_CATEGORY_NAME_LENGTH} caracteres.`),
  color: z.string().refine(isValidHexColor, 'Elige un color válido.'),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
