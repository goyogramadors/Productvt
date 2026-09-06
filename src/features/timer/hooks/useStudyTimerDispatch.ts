import { useCallback, useState } from 'react';

import {
  dispatchStudyTimerEvent,
  type StudyTimerDispatchOutcome,
} from '@/application/coordinators/StudySessionCoordinator';
import type { ActiveStudySession } from '@/domain/entities/active-session';
import type { StudyTimerEvent } from '@/domain/machines/study-timer-events';
import { useAuthStore } from '@/store/auth/authStore';
import { useTimerStore } from '@/features/timer/store/timerStore';

/**
 * Helper interno compartido por `useBreakSelection`, `useCancelStudySession` y `useLunchAction`
 * (evita repetir en cada uno el mismo plomería de uid/settings/coordinador/actualización del
 * store). No es un hook de la lista explícita de esta fase, pero es exactamente el tipo de
 * factorización que ARCHITECTURE.md sección 2.2 pide para mantener la UI delgada.
 */
export function useStudyTimerDispatch() {
  const uid = useAuthStore((s) => s.user?.uid);
  const soundPreferences = useAuthStore((s) => s.settings?.soundPreferences);
  const setActive = useTimerStore((s) => s.setActive);

  const [isDispatching, setIsDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dispatch = useCallback(
    async (active: ActiveStudySession, event: StudyTimerEvent): Promise<StudyTimerDispatchOutcome | null> => {
      if (!uid) {
        setError('Debes iniciar sesión.');
        return null;
      }
      setIsDispatching(true);
      setError(null);
      const result = await dispatchStudyTimerEvent({
        uid,
        active,
        event,
        soundEnabled: soundPreferences?.enabled ?? true,
        volume: soundPreferences?.volume ?? 1,
      });
      setIsDispatching(false);

      if (!result.success) {
        setError(result.error.message);
        return null;
      }
      if (result.data.outcome === 'updated') setActive(result.data.active);
      if (result.data.outcome === 'closed') setActive(null);
      return result.data;
    },
    [uid, soundPreferences, setActive]
  );

  return { dispatch, isDispatching, error, clearError: () => setError(null) };
}
