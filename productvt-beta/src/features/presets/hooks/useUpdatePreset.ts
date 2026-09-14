import { useCallback, useState } from 'react';

import type { Preset } from '@/domain/entities/preset';
import { useAuthUser } from '@/features/auth/hooks/useAuthUser';
import type { PresetFormInput } from '@/features/presets/domain/preset-rules';
import { deletePresetService, updatePresetService } from '@/features/presets/services/preset-service';

/** Editar o eliminar un preset existente (ARCHITECTURE.md sección 22.3). */
export function useUpdatePreset() {
  const { user } = useAuthUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePreset = useCallback(
    async (presetId: string, input: PresetFormInput) => {
      if (!user) {
        setError('Debes iniciar sesión.');
        return false;
      }
      setIsSubmitting(true);
      setError(null);
      const result = await updatePresetService(user.uid, presetId, input);
      setIsSubmitting(false);
      if (!result.success) {
        setError(result.error.message);
        return false;
      }
      return true;
    },
    [user]
  );

  const deletePreset = useCallback(
    async (preset: Pick<Preset, 'id' | 'isDefault'>) => {
      if (!user) {
        setError('Debes iniciar sesión.');
        return false;
      }
      setIsSubmitting(true);
      setError(null);
      const result = await deletePresetService(user.uid, preset);
      setIsSubmitting(false);
      if (!result.success) {
        setError(result.error.message);
        return false;
      }
      return true;
    },
    [user]
  );

  return { updatePreset, deletePreset, isSubmitting, error, clearError: () => setError(null) };
}
