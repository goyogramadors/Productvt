import { useCallback, useEffect, useRef, useState } from 'react';

import {
  dispatchInverseTimerEvent,
  startInverseSession,
} from '@/application/coordinators/InverseSessionCoordinator';
import { INVERSE_HARD_CAP_FACTOR } from '@/domain/entities/active-session';
import { computeInverseElapsedSeconds, computeRemindersDue } from '@/domain/rules/inverse-timer';
import { nowMs } from '@/domain/rules/timer-engine';
import { getOrCreateDeviceIdentity } from '@/infrastructure/device/deviceIdentity';
import { useAuthStore } from '@/store/auth/authStore';
import { useTimerStore } from '@/features/timer/store/timerStore';

export interface StartInverseSessionInput {
  name: string;
  categoryId: string;
  targetDurationSeconds: number;
}

/**
 * Temporizador inverso completo (docs/03-CRONOMETRO.md sección 12): arranque, tick en vivo cada
 * segundo, tope duro `2·T` (auto-cierre cuando este dispositivo es el dominante), "meta alcanzada"
 * como bandera de UI (no cierra nada), finalizar manual y cancelación simple.
 */
export function useInverseTimer() {
  const inverseActive = useTimerStore((s) => (s.active?.type === 'inverse' ? s.active : null));
  const setActive = useTimerStore((s) => s.setActive);
  const uid = useAuthStore((s) => s.user?.uid);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsedSeconds = inverseActive ? computeInverseElapsedSeconds(inverseActive, nowMs()) : 0;
  const remindersDue = computeRemindersDue(elapsedSeconds);
  const hardCapSeconds = inverseActive ? inverseActive.targetDurationSeconds * INVERSE_HARD_CAP_FACTOR : 0;
  const targetReached = inverseActive ? elapsedSeconds >= inverseActive.targetDurationSeconds : false;

  const isDispatchingAutoEventRef = useRef(false);
  useEffect(() => {
    if (!inverseActive || !uid || isDispatchingAutoEventRef.current) return;
    if (elapsedSeconds < hardCapSeconds) return;
    isDispatchingAutoEventRef.current = true;
    void dispatchInverseTimerEvent(uid, inverseActive, { type: 'HARD_CAP_REACHED' })
      .then((result) => {
        if (result.success && result.data.outcome === 'closed') setActive(null);
      })
      .finally(() => {
        isDispatchingAutoEventRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, inverseActive, uid, elapsedSeconds, hardCapSeconds]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(
    async (input: StartInverseSessionInput) => {
      if (!uid) {
        setError('Debes iniciar sesión.');
        return false;
      }
      setIsSubmitting(true);
      setError(null);
      const device = await getOrCreateDeviceIdentity();
      const result = await startInverseSession({ uid, ...input, device });
      setIsSubmitting(false);
      if (!result.success) {
        setError(result.error.message);
        return false;
      }
      setActive(result.data);
      return true;
    },
    [uid, setActive]
  );

  const finish = useCallback(async () => {
    if (!uid || !inverseActive) return false;
    const result = await dispatchInverseTimerEvent(uid, inverseActive, { type: 'FINISH_INVERSE' });
    if (!result.success) {
      setError(result.error.message);
      return false;
    }
    if (result.data.outcome === 'closed') setActive(null);
    return true;
  }, [uid, inverseActive, setActive]);

  const confirmCancel = useCallback(async () => {
    if (!uid || !inverseActive) return false;
    const result = await dispatchInverseTimerEvent(uid, inverseActive, { type: 'CONFIRM_CANCEL_INVERSE' });
    if (!result.success) {
      setError(result.error.message);
      return false;
    }
    if (result.data.outcome === 'closed') setActive(null);
    return true;
  }, [uid, inverseActive, setActive]);

  return {
    inverseActive,
    elapsedSeconds,
    remindersDue,
    targetReached,
    hardCapSeconds,
    start,
    finish,
    confirmCancel,
    isSubmitting,
    error,
    clearError: () => setError(null),
  };
}
