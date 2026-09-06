import { useCallback, useState } from 'react';

import { useAuthUser } from '@/features/auth/hooks/useAuthUser';
import { createPresetService } from '@/features/presets/services/preset-service';
import type { PresetFormInput } from '@/features/presets/domain/preset-rules';

/** Crear preset (ARCHITECTURE.md sección 22.3). */
export function useCreatePreset() {
  const { user } = useAuthUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPreset = useCallback(
    async (input: PresetFormInput) => {
      if (!user) {
        setError('Debes iniciar sesión.');
        return false;
      }
      setIsSubmitting(true);
      setError(null);
      const result = await createPresetService(user.uid, input);
      setIsSubmitting(false);
      if (!result.success) {
        setError(result.error.message);
        return false;
      }
      return true;
    },
    [user]
  );

  return { createPreset, isSubmitting, error, clearError: () => setError(null) };
}
