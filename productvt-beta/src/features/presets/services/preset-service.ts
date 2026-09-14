import { STANDARD_PRESET_VALUES, type Preset } from '@/domain/entities/preset';
import { validatePresetInput, type PresetFormInput } from '@/features/presets/domain/preset-rules';
import {
  createPreset as createPresetInRepo,
  createStandardPreset,
  deletePreset as deletePresetInRepo,
  listPresets,
  type PresetInput,
  PresetRepositoryError,
  subscribePresets,
  updatePreset as updatePresetInRepo,
} from '@/repositories/presets/presetRepository';
import { type AsyncResult, err, ok } from '@/types/common';

/**
 * Capa de orquestación entre hooks y `presetRepository`: valida con `preset-rules.ts` antes de
 * persistir (ARCHITECTURE.md sección 2.2) y concentra la regla de negocio "no se puede borrar el
 * preset por defecto" (no especificada explícitamente en SPEC.md; decisión de esta fase para
 * garantizar que SPEC.md sección 13.1 — "debe existir el preset Estándar" — nunca quede sin
 * ningún preset disponible).
 */
export class PresetValidationError extends Error {}

export type PresetServiceError = PresetValidationError | PresetRepositoryError;

function toRepoInput(input: PresetFormInput): PresetInput {
  return {
    name: input.name.trim(),
    studyDurationMinutes: input.studyDurationMinutes,
    shortBreakMinutes: input.shortBreakMinutes,
    cyclesBeforeLongBreak: input.cyclesBeforeLongBreak,
    longBreakMinutes: input.longBreakMinutes,
  };
}

export async function createPresetService(
  uid: string,
  input: PresetFormInput
): AsyncResult<Preset, PresetServiceError> {
  const validationErrors = validatePresetInput(input);
  if (validationErrors.length > 0) return err(new PresetValidationError(validationErrors[0]));
  return createPresetInRepo(uid, toRepoInput(input));
}

export async function updatePresetService(
  uid: string,
  presetId: string,
  input: PresetFormInput
): AsyncResult<void, PresetServiceError> {
  const validationErrors = validatePresetInput(input);
  if (validationErrors.length > 0) return err(new PresetValidationError(validationErrors[0]));
  return updatePresetInRepo(uid, presetId, toRepoInput(input));
}

export async function deletePresetService(
  uid: string,
  preset: Pick<Preset, 'id' | 'isDefault'>
): AsyncResult<void, PresetServiceError> {
  if (preset.isDefault) {
    return err(new PresetValidationError('No puedes eliminar el preset por defecto.'));
  }
  return deletePresetInRepo(uid, preset.id);
}

/**
 * Siembra idempotente del preset "Estándar" (SPEC.md sección 13.1) para todo usuario nuevo:
 * revisa si ya existe algún preset marcado `isDefault` antes de crear uno nuevo, así que llamarla
 * en cada login no duplica presets. Se dispara desde `store/auth/authStore.ts` justo después de
 * `ensureUserProfileAndSettings` (mismo punto para registro por email y primer login con Google).
 */
export async function ensureStandardPresetExists(uid: string): AsyncResult<Preset, PresetServiceError> {
  const existingResult = await listPresets(uid);
  if (!existingResult.success) return err(existingResult.error);

  const existingDefault = existingResult.data.find((preset) => preset.isDefault);
  if (existingDefault) return ok(existingDefault);

  return createStandardPreset(uid, { ...STANDARD_PRESET_VALUES });
}

export { subscribePresets };
export type { Preset };
