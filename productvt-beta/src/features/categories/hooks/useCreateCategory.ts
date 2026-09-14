import { useCallback, useState } from 'react';

import { useAuthUser } from '@/features/auth/hooks/useAuthUser';
import {
  type CreateCategoryInput,
  createCategoryService,
} from '@/features/categories/services/category-service';

/** Crear categoría (ARCHITECTURE.md sección 22.2). */
export function useCreateCategory() {
  const { user } = useAuthUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCategory = useCallback(
    async (input: CreateCategoryInput) => {
      if (!user) {
        setError('Debes iniciar sesión.');
        return false;
      }
      setIsSubmitting(true);
      setError(null);
      const result = await createCategoryService(user.uid, input);
      setIsSubmitting(false);
      if (!result.success) {
        setError(result.error.message);
        return false;
      }
      return true;
    },
    [user]
  );

  return { createCategory, isSubmitting, error, clearError: () => setError(null) };
}
