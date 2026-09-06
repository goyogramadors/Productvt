import { useCallback, useState } from 'react';

import type { SoundPreferences, VisualPreferences } from '@/domain/entities/user-profile';
import {
  updateCancellationPhraseService,
  updateNotificationsEnabledService,
  updateSoundPreferencesService,
  updateVisualPreferencesService,
} from '@/features/settings/services/settings-service';
import { useAuthStore } from '@/store/auth/authStore';

/**
 * Lectura + escritura de `settings/main` y de la frase de cancelación de `profile/main`
 * (SPEC.md sección 9.4). El store de auth ya mantiene `profile`/`settings` sincronizados
 * (Fase 2); este hook solo agrega las acciones de escritura y refresca el store tras cada una,
 * para que la UI de Configuración no tenga que orquestar Firestore por su cuenta.
 */
export function useUserSettings() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const settings = useAuthStore((s) => s.settings);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runUpdate = useCallback(
    async (action: () => Promise<{ success: boolean; error?: { message: string } }>) => {
      setIsSubmitting(true);
      setError(null);
      const result = await action();
      if (!result.success) {
        setError(result.error?.message ?? 'No se pudo guardar el cambio.');
        setIsSubmitting(false);
        return false;
      }
      await refreshProfile();
      setIsSubmitting(false);
      return true;
    },
    [refreshProfile]
  );

  const updateSoundPreferences = useCallback(
    (patch: Partial<SoundPreferences>) => {
      if (!user || !settings) {
        setError('Debes iniciar sesión.');
        return Promise.resolve(false);
      }
      return runUpdate(() => updateSoundPreferencesService(user.uid, patch, settings.soundPreferences));
    },
    [user, settings, runUpdate]
  );

  const updateVisualPreferences = useCallback(
    (patch: Partial<VisualPreferences>) => {
      if (!user || !settings) {
        setError('Debes iniciar sesión.');
        return Promise.resolve(false);
      }
      return runUpdate(() => updateVisualPreferencesService(user.uid, patch, settings.visualPreferences));
    },
    [user, settings, runUpdate]
  );

  const updateNotificationsEnabled = useCallback(
    (enabled: boolean) => {
      if (!user) {
        setError('Debes iniciar sesión.');
        return Promise.resolve(false);
      }
      return runUpdate(() => updateNotificationsEnabledService(user.uid, enabled));
    },
    [user, runUpdate]
  );

  const updateCancellationPhrase = useCallback(
    (phrase: string) => {
      if (!user) {
        setError('Debes iniciar sesión.');
        return Promise.resolve(false);
      }
      return runUpdate(() => updateCancellationPhraseService(user.uid, phrase));
    },
    [user, runUpdate]
  );

  return {
    profile,
    settings,
    isSubmitting,
    error,
    clearError: () => setError(null),
    updateSoundPreferences,
    updateVisualPreferences,
    updateNotificationsEnabled,
    updateCancellationPhrase,
  };
}
