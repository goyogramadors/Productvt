import { getDoc, setDoc, updateDoc } from 'firebase/firestore';

import {
  DEFAULT_CANCELLATION_PHRASE,
  type UserProfile,
  type UserSettings,
} from '@/domain/entities/user-profile';
import { profileDocRef } from '@/infrastructure/firebase/collections';
import { ensureUserSettings } from '@/repositories/settings/settingsRepository';
import { type AsyncResult, err, ok } from '@/types/common';

/**
 * Repositorio del agregado `profile/main` (ARCHITECTURE.md sección 16; decisiones-tomadas.md punto
 * 9: "ningún service habla con Firestore directo"). Ningún componente ni store debe importar
 * `firebase/firestore` para este documento; todo pasa por las funciones de este archivo.
 *
 * Las preferencias de `settings/main` viven en su propio repositorio
 * (`repositories/settings/settingsRepository.ts`, Fase 3) — este archivo solo re-expone
 * `ensureUserProfileAndSettings` como bootstrap combinado de ambos agregados para no romper el
 * único punto de entrada que ya consume `store/auth/authStore.ts`.
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

async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(profileDocRef(uid));
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

export async function getUserProfile(uid: string): AsyncResult<UserProfile | null, UserRepositoryError> {
  try {
    return ok(await fetchUserProfile(uid));
  } catch (error) {
    return err(new UserRepositoryError(`No se pudo leer el perfil: ${String(error)}`));
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
    const [existingProfile, settingsResult] = await Promise.all([
      fetchUserProfile(uid),
      ensureUserSettings(uid),
    ]);
    if (!settingsResult.success) {
      return err(new UserRepositoryError(settingsResult.error.message));
    }
    const profile = existingProfile ?? (await persistUserProfile(uid, email, displayName));
    return ok({ profile, settings: settingsResult.data });
  } catch (error) {
    return err(new UserRepositoryError(`No se pudo inicializar el usuario: ${String(error)}`));
  }
}
