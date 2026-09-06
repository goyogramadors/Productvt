import { useEffect, useState } from 'react';

import type { Category } from '@/domain/entities/category';
import type { CategoryType } from '@/domain/enums/category-type';
import { useAuthUser } from '@/features/auth/hooks/useAuthUser';
import { subscribeCategories } from '@/features/categories/services/category-service';
import type { CategoryRepositoryError } from '@/repositories/categories/categoryRepository';

/**
 * Lista en vivo de categorías de un tipo (ARCHITECTURE.md sección 22.2). Hook fino: solo se
 * suscribe y expone estado, sin lógica de negocio (ARCHITECTURE.md sección 2.2).
 */
export function useCategories(type: CategoryType) {
  const { user } = useAuthUser();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<CategoryRepositoryError | null>(null);

  useEffect(() => {
    if (!user) {
      setCategories([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeCategories(
      user.uid,
      type,
      (data) => {
        setCategories(data);
        setIsLoading(false);
        setError(null);
      },
      (subscriptionError) => {
        setError(subscriptionError);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [user, type]);

  return { categories, isLoading, error };
}
