import { getDoc, setDoc, updateDoc } from 'firebase/firestore';

import type { SoundPreferences, UserSettings, VisualPreferences } from '@/domain/entities/user-profile';
import { settingsDocRef } from '@/infrastructure/firebase/collections';
import { type AsyncResult, err, ok } from '@/types/common';

/**
 * Repositorio del agregado `settings/main` (ARCHITECTURE.md sección 15.1/16;
 * decisiones-tomadas.md punto 9: "SettingsRepository" propio, separado de `UserRepository`, que
 * queda enfocado solo en `UserProfile`). Ningún service/hook debe importar `firebase/firestore`
 * para leer o escribir preferencias de sonido, visuales o de notificaciones: todo pasa por aquí.
 *
 * Extraído desde `repositories/user/userRepository.ts` (Fase 2), que originalmente concentraba
 * profile + settings antes de que existiera esta separación explícita.
 */
export class SettingsRepositoryError extends Error {}

function nowIso(): string {
  return new Date().toISOString();
}

export function defaultSoundPreferences(): SoundPreferences {
  return {
    enabled: true,
    studyFinishedSoundId: 'default_study_finished',
    breakFinishedSoundId: 'default_break_finished',
    inverseReminderSoundId: 'default_inverse_reminder',
    volume: 1,
  };
}

export function defaultVisualPreferences(): VisualPreferences {
  return {
    colorScheme: 'system',
    celebrationEffectsEnabled: true,
    reduceMotion: false,
  };
}

export async function fetchUserSettings(uid: string): Promise<UserSettings | null> {
  const snap = await getDoc(settingsDocRef(uid));
  return snap.exists() ? snap.data() : null;
}

export async function persistDefaultUserSettings(uid: string): Promise<UserSettings> {
  const now = nowIso();
  const settings: UserSettings = {
    userId: uid,
    soundPreferences: defaultSoundPreferences(),
    visualPreferences: defaultVisualPreferences(),
    notificationsEnabled: true,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(settingsDocRef(uid), settings);
  return settings;
}

export async function getUserSettings(
  uid: string
): AsyncResult<UserSettings | null, SettingsRepositoryError> {
  try {
    return ok(await fetchUserSettings(uid));
  } catch (error) {
    return err(new SettingsRepositoryError(`No se pudo leer la configuración: ${String(error)}`));
  }
}

export async function createDefaultUserSettings(
  uid: string
): AsyncResult<UserSettings, SettingsRepositoryError> {
  try {
    return ok(await persistDefaultUserSettings(uid));
  } catch (error) {
    return err(new SettingsRepositoryError(`No se pudo crear la configuración: ${String(error)}`));
  }
}

/** Lee `settings/main`, creándolo con valores por defecto si todavía no existe (idempotente). */
export async function ensureUserSettings(
  uid: string
): AsyncResult<UserSettings, SettingsRepositoryError> {
  try {
    const existing = await fetchUserSettings(uid);
    return ok(existing ?? (await persistDefaultUserSettings(uid)));
  } catch (error) {
    return err(new SettingsRepositoryError(`No se pudo inicializar la configuración: ${String(error)}`));
  }
}

export async function updateUserSettings(
  uid: string,
  patch: Partial<Pick<UserSettings, 'soundPreferences' | 'visualPreferences' | 'notificationsEnabled'>>
): AsyncResult<void, SettingsRepositoryError> {
  try {
    await updateDoc(settingsDocRef(uid), { ...patch, updatedAt: nowIso() });
    return ok(undefined);
  } catch (error) {
    return err(new SettingsRepositoryError(`No se pudo actualizar la configuración: ${String(error)}`));
  }
}
