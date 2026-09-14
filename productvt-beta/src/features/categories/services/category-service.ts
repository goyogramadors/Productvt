import type { Category } from '@/domain/entities/category';
import type { CategoryType } from '@/domain/enums/category-type';
import {
  type CategoryInput,
  CategoryRepositoryError,
  createCategory as createCategoryInRepo,
  setCategoryArchived,
  subscribeCategories,
  updateCategory as updateCategoryInRepo,
} from '@/repositories/categories/categoryRepository';
import { isValidCategoryName, isValidHexColor, normalizeCategoryName } from '@/features/categories/domain/category-rules';
import { type AsyncResult, err } from '@/types/common';

/**
 * Capa de orquestación entre hooks (React) y `categoryRepository` (Firestore): aplica las reglas
 * de dominio antes de persistir, para que ninguna validación de negocio dependa solo de la UI
 * (ARCHITECTURE.md sección 2.2). No importa React ni Firebase directo — solo el repositorio.
 */
export class CategoryValidationError extends Error {}

export type CategoryServiceError = CategoryValidationError | CategoryRepositoryError;

export interface CreateCategoryInput {
  type: CategoryType;
  name: string;
  color: string;
  imageUrl?: string;
}

function validate(name: string, color: string): CategoryValidationError | null {
  if (!isValidCategoryName(name)) return new CategoryValidationError('Ingresa un nombre de categoría válido.');
  if (!isValidHexColor(color)) return new CategoryValidationError('Elige un color válido.');
  return null;
}

export async function createCategoryService(
  uid: string,
  input: CreateCategoryInput
): AsyncResult<Category, CategoryServiceError> {
  const name = normalizeCategoryName(input.name);
  const validationError = validate(name, input.color);
  if (validationError) return err(validationError);

  const repoInput: CategoryInput = { type: input.type, name, color: input.color, ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}) };
  return createCategoryInRepo(uid, repoInput);
}

export async function updateCategoryService(
  uid: string,
  categoryId: string,
  patch: Partial<Pick<Category, 'name' | 'color' | 'icon' | 'imageUrl'>>
): AsyncResult<void, CategoryServiceError> {
  if (patch.name !== undefined && !isValidCategoryName(patch.name)) {
    return err(new CategoryValidationError('Ingresa un nombre de categoría válido.'));
  }
  if (patch.color !== undefined && !isValidHexColor(patch.color)) {
    return err(new CategoryValidationError('Elige un color válido.'));
  }

  const normalizedPatch = patch.name !== undefined ? { ...patch, name: normalizeCategoryName(patch.name) } : patch;
  return updateCategoryInRepo(uid, categoryId, normalizedPatch);
}

export async function archiveCategoryService(
  uid: string,
  categoryId: string,
  isArchived: boolean
): AsyncResult<void, CategoryServiceError> {
  return setCategoryArchived(uid, categoryId, isArchived);
}

export { subscribeCategories };
export type { Category };
