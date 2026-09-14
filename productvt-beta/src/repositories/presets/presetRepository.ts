import {
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';

import type { Preset } from '@/domain/entities/preset';
import { presetDocRef, presetsCollection } from '@/infrastructure/firebase/collections';
import { type AsyncResult, err, ok } from '@/types/common';

/**
 * Repositorio del agregado `presets` (ARCHITECTURE.md sección 15.1/16; decisiones-tomadas.md punto
 * 9). Único archivo que llama a `firebase/firestore` para presets.
 */
export class PresetRepositoryError extends Error {}

export interface PresetInput {
  name: string;
  studyDurationMinutes: number;
  shortBreakMinutes: number;
  cyclesBeforeLongBreak: number;
  longBreakMinutes: number;
  imageUrl?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function fetchPresets(uid: string): Promise<Preset[]> {
  const q = query(presetsCollection(uid), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function listPresets(uid: string): AsyncResult<Preset[], PresetRepositoryError> {
  try {
    return ok(await fetchPresets(uid));
  } catch (error) {
    return err(new PresetRepositoryError(`No se pudieron leer los presets: ${String(error)}`));
  }
}

export async function getPreset(
  uid: string,
  presetId: string
): AsyncResult<Preset | null, PresetRepositoryError> {
  try {
    const snap = await getDoc(presetDocRef(uid, presetId));
    return ok(snap.exists() ? snap.data() : null);
  } catch (error) {
    return err(new PresetRepositoryError(`No se pudo leer el preset: ${String(error)}`));
  }
}

/** Suscripción en vivo (mismo criterio multi-dispositivo que `categoryRepository`). */
export function subscribePresets(
  uid: string,
  onData: (presets: Preset[]) => void,
  onError: (error: PresetRepositoryError) => void
): Unsubscribe {
  const q = query(presetsCollection(uid), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data())),
    (error) => onError(new PresetRepositoryError(`Error de sincronización de presets: ${String(error)}`))
  );
}

async function persistPreset(
  uid: string,
  input: PresetInput,
  isDefault: boolean
): Promise<Preset> {
  const ref = doc(presetsCollection(uid));
  const now = nowIso();
  const preset: Preset = {
    id: ref.id,
    userId: uid,
    name: input.name,
    studyDurationMinutes: input.studyDurationMinutes,
    shortBreakMinutes: input.shortBreakMinutes,
    cyclesBeforeLongBreak: input.cyclesBeforeLongBreak,
    longBreakMinutes: input.longBreakMinutes,
    isDefault,
    ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(ref, preset);
  return preset;
}

export async function createPreset(
  uid: string,
  input: PresetInput
): AsyncResult<Preset, PresetRepositoryError> {
  try {
    return ok(await persistPreset(uid, input, false));
  } catch (error) {
    return err(new PresetRepositoryError(`No se pudo crear el preset: ${String(error)}`));
  }
}

/**
 * Crea el preset "Estándar" (SPEC.md sección 13.1) marcado `isDefault: true`. Uso interno de
 * `ensureStandardPresetExists` (features/presets/services/preset-service.ts) — no debe llamarse
 * fuera de ese flujo de siembra para evitar más de un preset marcado como default.
 */
export async function createStandardPreset(
  uid: string,
  input: PresetInput
): AsyncResult<Preset, PresetRepositoryError> {
  try {
    return ok(await persistPreset(uid, input, true));
  } catch (error) {
    return err(new PresetRepositoryError(`No se pudo crear el preset estándar: ${String(error)}`));
  }
}

export async function updatePreset(
  uid: string,
  presetId: string,
  patch: Partial<
    Pick<
      Preset,
      'name' | 'studyDurationMinutes' | 'shortBreakMinutes' | 'cyclesBeforeLongBreak' | 'longBreakMinutes' | 'imageUrl'
    >
  >
): AsyncResult<void, PresetRepositoryError> {
  try {
    const { imageUrl, ...rest } = patch;
    const firestorePatch: Record<string, unknown> = { ...rest, updatedAt: nowIso() };
    if ('imageUrl' in patch) firestorePatch.imageUrl = imageUrl ?? deleteField();
    await updateDoc(presetDocRef(uid, presetId), firestorePatch);
    return ok(undefined);
  } catch (error) {
    return err(new PresetRepositoryError(`No se pudo actualizar el preset: ${String(error)}`));
  }
}

/**
 * Borrado físico: a diferencia de categorías, un preset borrado no rompe histórico porque
 * `StudySession.presetSnapshot` ya congela sus valores al iniciar el bloque (SPEC.md sección
 * 13.3). La regla de negocio "no se puede borrar el preset por defecto" vive en
 * `features/presets/domain/preset-rules.ts`, no aquí (el repositorio no valida reglas de dominio).
 */
export async function deletePreset(
  uid: string,
  presetId: string
): AsyncResult<void, PresetRepositoryError> {
  try {
    await deleteDoc(presetDocRef(uid, presetId));
    return ok(undefined);
  } catch (error) {
    return err(new PresetRepositoryError(`No se pudo eliminar el preset: ${String(error)}`));
  }
}
