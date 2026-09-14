import { useEffect, useState } from 'react';

import type { Preset } from '@/domain/entities/preset';
import { useAuthUser } from '@/features/auth/hooks/useAuthUser';
import { subscribePresets } from '@/features/presets/services/preset-service';
import type { PresetRepositoryError } from '@/repositories/presets/presetRepository';

/** Lista en vivo de presets del usuario (ARCHITECTURE.md sección 22.3). */
export function usePresets() {
  const { user } = useAuthUser();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<PresetRepositoryError | null>(null);

  useEffect(() => {
    if (!user) {
      setPresets([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribePresets(
      user.uid,
      (data) => {
        setPresets(data);
        setIsLoading(false);
        setError(null);
      },
      (subscriptionError) => {
        setError(subscriptionError);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  return { presets, isLoading, error };
}
