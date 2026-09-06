import {
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import type { Category } from '@/domain/entities/category';
import type { CategoryType } from '@/domain/enums/category-type';
import { categoriesCollection, categoryDocRef } from '@/infrastructure/firebase/collections';
import { type AsyncResult, err, ok } from '@/types/common';

/**
 * Repositorio del agregado `categories` (ARCHITECTURE.md sección 15.1/16.1; decisiones-tomadas.md
 * punto 9). Único archivo que llama a `firebase/firestore` para categorías: services y hooks de
 * `features/categories` consumen exclusivamente estas funciones.
 *
 * IMPORTANTE (decisiones-tomadas.md punto 6): este repositorio nunca escribe ni lee un
 * "colorSnapshot" para pintar UI. `color` es siempre el valor vigente; cualquier capa que necesite
 * pintar una categoría debe leerla por `categoryId` a través de este repositorio (o de la lista ya
 * suscrita en memoria), nunca de un campo congelado guardado en otra entidad.
 */
export class CategoryRepositoryError extends Error {}

export interface CategoryInput {
  type: CategoryType;
  name: string;
  color: string;
  imageUrl?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function fetchCategoriesByType(uid: string, type: CategoryType): Promise<Category[]> {
  const q = query(categoriesCollection(uid), where('type', '==', type), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function listCategories(
  uid: string,
  type: CategoryType
): AsyncResult<Category[], CategoryRepositoryError> {
  try {
    return ok(await fetchCategoriesByType(uid, type));
  } catch (error) {
    return err(new CategoryRepositoryError(`No se pudieron leer las categorías: ${String(error)}`));
  }
}

export async function getCategory(
  uid: string,
  categoryId: string
): AsyncResult<Category | null, CategoryRepositoryError> {
  try {
    const snap = await getDoc(categoryDocRef(uid, categoryId));
    return ok(snap.exists() ? snap.data() : null);
  } catch (error) {
    return err(new CategoryRepositoryError(`No se pudo leer la categoría: ${String(error)}`));
  }
}

/**
 * Suscripción en vivo a las categorías de un tipo (ARCHITECTURE.md sección 15.2: "subscribirse a
 * cambios si aplica"). Sostiene el modelo de decisiones-tomadas.md punto 14: crear/editar
 * categorías es CRUD normal en paralelo entre dispositivos, sin arbitraje — cualquier dispositivo
 * ve el cambio de color de otro casi de inmediato. Devuelve la función de `unsubscribe`.
 */
export function subscribeCategories(
  uid: string,
  type: CategoryType,
  onData: (categories: Category[]) => void,
  onError: (error: CategoryRepositoryError) => void
): Unsubscribe {
  const q = query(categoriesCollection(uid), where('type', '==', type), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data())),
    (error) => onError(new CategoryRepositoryError(`Error de sincronización de categorías: ${String(error)}`))
  );
}

export async function createCategory(
  uid: string,
  input: CategoryInput
): AsyncResult<Category, CategoryRepositoryError> {
  try {
    const ref = doc(categoriesCollection(uid));
    const now = nowIso();
    const category: Category = {
      id: ref.id,
      userId: uid,
      type: input.type,
      name: input.name,
      color: input.color,
      ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(ref, category);
    return ok(category);
  } catch (error) {
    return err(new CategoryRepositoryError(`No se pudo crear la categoría: ${String(error)}`));
  }
}

export async function updateCategory(
  uid: string,
  categoryId: string,
  patch: Partial<Pick<Category, 'name' | 'color' | 'icon' | 'imageUrl'>>
): AsyncResult<void, CategoryRepositoryError> {
  try {
    // `imageUrl`/`icon` en `undefined` explícito se interpreta como "quitar el campo", en vez de
    // enviarlo tal cual (Firestore rechaza `undefined` en `updateDoc`).
    const { imageUrl, icon, ...rest } = patch;
    const firestorePatch: Record<string, unknown> = { ...rest, updatedAt: nowIso() };
    if ('imageUrl' in patch) firestorePatch.imageUrl = imageUrl ?? deleteField();
    if ('icon' in patch) firestorePatch.icon = icon ?? deleteField();
    await updateDoc(categoryDocRef(uid, categoryId), firestorePatch);
    return ok(undefined);
  } catch (error) {
    return err(new CategoryRepositoryError(`No se pudo actualizar la categoría: ${String(error)}`));
  }
}

/**
 * Archivado lógico (SPEC.md sección 12.2, campo `isArchived`). No se borra físicamente: una
 * categoría puede estar referenciada por `categoryId` en sesiones/eventos históricos, y su color
 * vigente debe seguir resolviéndose (decisiones-tomadas.md punto 6).
 */
export async function setCategoryArchived(
  uid: string,
  categoryId: string,
  isArchived: boolean
): AsyncResult<void, CategoryRepositoryError> {
  try {
    await updateDoc(categoryDocRef(uid, categoryId), { isArchived, updatedAt: nowIso() });
    return ok(undefined);
  } catch (error) {
    return err(new CategoryRepositoryError(`No se pudo archivar la categoría: ${String(error)}`));
  }
}
