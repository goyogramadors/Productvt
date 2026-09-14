import type { SoundPreferences, UserSettings, VisualPreferences } from '@/domain/entities/user-profile';
import { updateUserProfile, UserRepositoryError } from '@/repositories/user/userRepository';
import {
  SettingsRepositoryError,
  updateUserSettings as updateUserSettingsInRepo,
} from '@/repositories/settings/settingsRepository';
import { type AsyncResult, err } from '@/types/common';

/**
 * Orquestación de Configuración/Gestión (SPEC.md sección 9.4): combina el repositorio de
 * `settings/main` (sonido, visual, notificaciones) y el de `profile/main` (frase de cancelación),
 * sin que ningún componente de `features/settings` importe Firestore directo
 * (decisiones-tomadas.md punto 9).
 */
export class SettingsValidationError extends Error {}

export type SettingsServiceError = SettingsValidationError | SettingsRepositoryError | UserRepositoryError;

const MAX_CANCELLATION_PHRASE_LENGTH = 200;

export async function updateSoundPreferencesService(
  uid: string,
  patch: Partial<SoundPreferences>,
  current: SoundPreferences
): AsyncResult<void, SettingsServiceError> {
  return updateUserSettingsInRepo(uid, { soundPreferences: { ...current, ...patch } });
}

export async function updateVisualPreferencesService(
  uid: string,
  patch: Partial<VisualPreferences>,
  current: VisualPreferences
): AsyncResult<void, SettingsServiceError> {
  return updateUserSettingsInRepo(uid, { visualPreferences: { ...current, ...patch } });
}

export async function updateNotificationsEnabledService(
  uid: string,
  notificationsEnabled: boolean
): AsyncResult<void, SettingsServiceError> {
  return updateUserSettingsInRepo(uid, { notificationsEnabled });
}

/**
 * Frase editable del panel de cancelación (SPEC.md sección 20.2). Vive en `profile/main`, no en
 * `settings/main` (ARCHITECTURE.md sección 9.1) — por eso pasa por `userRepository`, no por
 * `settingsRepository`. Sigue sin tocar Firestore directo: pasa por su repositorio dedicado.
 */
export async function updateCancellationPhraseService(
  uid: string,
  phrase: string
): AsyncResult<void, SettingsServiceError> {
  const trimmed = phrase.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_CANCELLATION_PHRASE_LENGTH) {
    return err(
      new SettingsValidationError(`La frase debe tener entre 1 y ${MAX_CANCELLATION_PHRASE_LENGTH} caracteres.`)
    );
  }
  return updateUserProfile(uid, { cancellationPhrase: trimmed });
}

export type { UserSettings };
