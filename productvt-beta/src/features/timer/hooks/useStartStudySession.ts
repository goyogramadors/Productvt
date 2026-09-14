import { useCallback, useState } from 'react';

import { startStudySession } from '@/application/coordinators/StudySessionCoordinator';
import { getOrCreateDeviceIdentity } from '@/infrastructure/device/deviceIdentity';
import { useAuthStore } from '@/store/auth/authStore';
import { useTimerStore } from '@/features/timer/store/timerStore';

export interface StartStudySessionInput {
  name: string;
  categoryId: string;
  presetId: string;
}

/** Envuelve `StudySessionCoordinator.startStudySession` (T1) con el uid/settings/identidad del dispositivo actuales. */
export function useStartStudySession() {
  const uid = useAuthStore((s) => s.user?.uid);
  const soundPreferences = useAuthStore((s) => s.settings?.soundPreferences);
  const setActive = useTimerStore((s) => s.setActive);
  const clockOffsetMs = useTimerStore((s) => s.clockOffsetMs);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(
    async (input: StartStudySessionInput) => {
      if (!uid) {
        setError('Debes iniciar sesión.');
        return false;
      }
      setIsSubmitting(true);
      setError(null);

      const device = await getOrCreateDeviceIdentity();
      const result = await startStudySession({
        uid,
        name: input.name,
        categoryId: input.categoryId,
        presetId: input.presetId,
        device,
        soundEnabled: soundPreferences?.enabled ?? true,
        volume: soundPreferences?.volume ?? 1,
        clockOffsetMs,
      });

      setIsSubmitting(false);
      if (!result.success) {
        setError(result.error.message);
        return false;
      }
      setActive(result.data);
      return true;
    },
    [uid, soundPreferences, clockOffsetMs, setActive]
  );

  return { start, isSubmitting, error, clearError: () => setError(null) };
}
