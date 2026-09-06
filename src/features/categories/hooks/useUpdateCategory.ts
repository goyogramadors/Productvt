import { useCallback, useState } from 'react';

import type { Category } from '@/domain/entities/category';
import { useAuthUser } from '@/features/auth/hooks/useAuthUser';
import { archiveCategoryService, updateCategoryService } from '@/features/categories/services/category-service';

/** Editar (nombre/color) o archivar una categoría existente (ARCHITECTURE.md sección 22.2). */
export function useUpdateCategory() {
  const { user } = useAuthUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateCategory = useCallback(
    async (categoryId: string, patch: Partial<Pick<Category, 'name' | 'color' | 'icon' | 'imageUrl'>>) => {
      if (!user) {
        setError('Debes iniciar sesión.');
        return false;
      }
      setIsSubmitting(true);
      setError(null);
      const result = await updateCategoryService(user.uid, categoryId, patch);
      setIsSubmitting(false);
      if (!result.success) {
        setError(result.error.message);
        return false;
      }
      return true;
    },
    [user]
  );

  const setArchived = useCallback(
    async (categoryId: string, isArchived: boolean) => {
      if (!user) {
        setError('Debes iniciar sesión.');
        return false;
      }
      setIsSubmitting(true);
      setError(null);
      const result = await archiveCategoryService(user.uid, categoryId, isArchived);
      setIsSubmitting(false);
      if (!result.success) {
        setError(result.error.message);
        return false;
      }
      return true;
    },
    [user]
  );

  return { updateCategory, setArchived, isSubmitting, error, clearError: () => setError(null) };
}
