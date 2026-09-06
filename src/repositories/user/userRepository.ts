import { getDoc, setDoc, updateDoc } from 'firebase/firestore';

import {
  DEFAULT_CANCELLATION_PHRASE,
  type SoundPreferences,
  type UserProfile,
  type UserSettings,
  type VisualPreferences,
} from '@/domain/entities/user-profile';
import { profileDocRef, settingsDocRef } from '@/infrastructure/firebase/collections';
import { type AsyncResult, err, ok } from '@/types/common';

/**
 * Repositorio del agregado usuario: `profile/main` y `settings/main` bajo `users/{uid}`
 * (ARCHITECTURE.md sección 16; decisiones-tomadas.md punto 9: "ningún service habla con Firestore
 * directo"). Ningún componente ni store debe importar `firebase/firestore` para estos documentos;
 * todo pasa por las funciones de este archivo.
 */
export class UserRepositoryError extends Error {}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Zona horaria del dispositivo (SPEC.md sección 11.4 y 43). `Intl` está disponible tanto en Hermes
 * (Android) como en navegadores modernos sin dependencias adicionales; si por algún motivo el
 * runtime no la expone, se usa UTC como valor seguro en vez de fallar el registro.
 */
export function detectDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function defaultSoundPreferences(): SoundPreferences {
  return {
    enabled: true,
    studyFinishedSoundId: 'default_study_finished',
    breakFinishedSoundId: 'default_break_finished',
    inverseReminderSoundId: 'default_inverse_reminder',
    volume: 1,
  };
}

function defaultVisualPreferences(): VisualPreferences {
  return {
    colorScheme: 'system',
    celebrationEffectsEnabled: true,
    reduceMotion: false,
  };
}

async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(profileDocRef(uid));
  return snap.exists() ? snap.data() : null;
}

async function fetchUserSettings(uid: string): Promise<UserSettings | null> {
  const snap = await getDoc(settingsDocRef(uid));
  return snap.exists() ? snap.data() : null;
}

async function persistUserProfile(
  uid: string,
  email: string,
  displayName: string | undefined
): Promise<UserProfile> {
  const now = nowIso();
  const profile: UserProfile = {
    id: uid,
    email,
    ...(displayName ? { displayName } : {}),
    timezone: detectDeviceTimezone(),
    cancellationPhrase: DEFAULT_CANCELLATION_PHRASE,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(profileDocRef(uid), profile);
  return profile;
}

async function persistUserSettings(uid: string): Promise<UserSettings> {
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

export async function getUserProfile(uid: string): AsyncResult<UserProfile | null, UserRepositoryError> {
  try {
    return ok(await fetchUserProfile(uid));
  } catch (error) {
    return err(new UserRepositoryError(`No se pudo leer el perfil: ${String(error)}`));
  }
}

export async function getUserSettings(
  uid: string
): AsyncResult<UserSettings | null, UserRepositoryError> {
  try {
    return ok(await fetchUserSettings(uid));
  } catch (error) {
    return err(new UserRepositoryError(`No se pudo leer la configuración: ${String(error)}`));
  }
}

export async function createUserProfile(
  uid: string,
  email: string,
  displayName?: string
): AsyncResult<UserProfile, UserRepositoryError> {
  try {
    return ok(await persistUserProfile(uid, email, displayName));
  } catch (error) {
    return err(new UserRepositoryError(`No se pudo crear el perfil: ${String(error)}`));
  }
}

export async function createUserSettings(
  uid: string
): AsyncResult<UserSettings, UserRepositoryError> {
  try {
    return ok(await persistUserSettings(uid));
  } catch (error) {
    return err(new UserRepositoryError(`No se pudo crear la configuración: ${String(error)}`));
  }
}

export async function updateUserProfile(
  uid: string,
  patch: Partial<Pick<UserProfile, 'displayName' | 'timezone' | 'cancellationPhrase'>>
): AsyncResult<void, UserRepositoryError> {
  try {
    await updateDoc(profileDocRef(uid), { ...patch, updatedAt: nowIso() });
    return ok(undefined);
  } catch (error) {
    return err(new UserRepositoryError(`No se pudo actualizar el perfil: ${String(error)}`));
  }
}

export async function updateUserSettings(
  uid: string,
  patch: Partial<Pick<UserSettings, 'soundPreferences' | 'visualPreferences' | 'notificationsEnabled'>>
): AsyncResult<void, UserRepositoryError> {
  try {
    await updateDoc(settingsDocRef(uid), { ...patch, updatedAt: nowIso() });
    return ok(undefined);
  } catch (error) {
    return err(new UserRepositoryError(`No se pudo actualizar la configuración: ${String(error)}`));
  }
}

/**
 * Bootstrap idempotente de `profile/main` + `settings/main`. Se llama justo después de cualquier
 * inicio de sesión exitoso (email/password o Google): en un registro por email crea ambos
 * documentos desde cero; en un primer login con Google (donde no existe un paso de "registro"
 * explícito) cumple la misma función; en cualquier login posterior simplemente lee y devuelve lo
 * ya existente sin sobrescribir nada.
 */
export async function ensureUserProfileAndSettings(
  uid: string,
  email: string,
  displayName?: string
): AsyncResult<{ profile: UserProfile; settings: UserSettings }, UserRepositoryError> {
  try {
    const [existingProfile, existingSettings] = await Promise.all([
      fetchUserProfile(uid),
      fetchUserSettings(uid),
    ]);
    const profile = existingProfile ?? (await persistUserProfile(uid, email, displayName));
    const settings = existingSettings ?? (await persistUserSettings(uid));
    return ok({ profile, settings });
  } catch (error) {
    return err(new UserRepositoryError(`No se pudo inicializar el usuario: ${String(error)}`));
  }
}
