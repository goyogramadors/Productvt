import { useCallback, useEffect, useRef, useState } from 'react';

import {
  dispatchInverseTimerEvent,
  startInverseSession,
} from '@/application/coordinators/InverseSessionCoordinator';
import { INVERSE_HARD_CAP_FACTOR } from '@/domain/entities/active-session';
import { canBeDominant } from '@/domain/entities/device-identity';
import { computeInverseElapsedSeconds, computeRemindersDue } from '@/domain/rules/inverse-timer';
import { nowMs } from '@/domain/rules/timer-engine';
import { getOrCreateDeviceIdentity } from '@/infrastructure/device/deviceIdentity';
import { requestControlOfActiveSession } from '@/repositories/active-session/activeSessionRepository';
import { useAuthStore } from '@/store/auth/authStore';
import { useTimerStore } from '@/features/timer/store/timerStore';

export interface StartInverseSessionInput {
  name: string;
  categoryId: string;
  targetDurationSeconds: number;
}

/**
 * Temporizador inverso completo (docs/03-CRONOMETRO.md sección 12): arranque, tick en vivo cada
 * segundo, tope duro `2·T` (auto-cierre, cualquier rol puede detectarlo y el coordinador lo resuelve
 * vía la transacción condicional — docs/04-SINCRONIZACION.md sección 4.2/sección 7), "meta
 * alcanzada" como bandera de UI (no cierra nada), finalizar manual y cancelación simple — estas dos
 * últimas SOLO las puede ejecutar el dominante; un espectador que las toca dispara una solicitud de
 * control en su lugar (sección 5.2), igual que `useStudyTimerDispatch`.
 */
export function useInverseTimer() {
  const inverseActive = useTimerStore((s) => (s.active?.type === 'inverse' ? s.active : null));
  const setActive = useTimerStore((s) => s.setActive);
  const role = useTimerStore((s) => s.role);
  const device = useTimerStore((s) => s.device);
  const clockOffsetMs = useTimerStore((s) => s.clockOffsetMs);
  const uid = useAuthStore((s) => s.user?.uid);
  const isDominant = role === 'dominant';

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsedSeconds = inverseActive ? computeInverseElapsedSeconds(inverseActive, nowMs(clockOffsetMs)) : 0;
  const remindersDue = computeRemindersDue(elapsedSeconds);
  const hardCapSeconds = inverseActive ? inverseActive.targetDurationSeconds * INVERSE_HARD_CAP_FACTOR : 0;
  const targetReached = inverseActive ? elapsedSeconds >= inverseActive.targetDurationSeconds : false;

  const isDispatchingAutoEventRef = useRef(false);
  useEffect(() => {
    // Cierre perezoso por tope duro: cualquier rol puede intentarlo (el coordinador decide la
    // primitiva con `evaluateLazyClosure`, no hace falta ser dominante aquí).
    if (!inverseActive || !uid || isDispatchingAutoEventRef.current) return;
    if (elapsedSeconds < hardCapSeconds) return;
    isDispatchingAutoEventRef.current = true;
    void dispatchInverseTimerEvent(uid, inverseActive, { type: 'HARD_CAP_REACHED' }, clockOffsetMs)
      .then((result) => {
        if (result.success && (result.data.outcome === 'closed' || result.data.outcome === 'closed_lazily')) {
          setActive(null);
        }
      })
      .finally(() => {
        isDispatchingAutoEventRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, inverseActive, uid, elapsedSeconds, hardCapSeconds, clockOffsetMs]);

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
      const result = await startInverseSession({ uid, ...input, device, clockOffsetMs });
      setIsSubmitting(false);
      if (!result.success) {
        setError(result.error.message);
        return false;
      }
      setActive(result.data);
      return true;
    },
    [uid, clockOffsetMs, setActive]
  );

  /** Único punto de disciplina dominante/espectador para las acciones manuales (sección 4.2/5.2). */
  const requestOrDispatch = useCallback(
    async (dispatchIt: () => ReturnType<typeof dispatchInverseTimerEvent>) => {
      if (!uid || !inverseActive) return false;
      if (!isDominant) {
        if (device && canBeDominant(device.platform)) {
          await requestControlOfActiveSession(uid, {
            requesterDeviceId: device.deviceId,
            requesterPlatform: device.platform,
            requesterDeviceName: device.deviceName,
          });
        }
        return false;
      }
      const result = await dispatchIt();
      if (!result.success) {
        setError(result.error.message);
        return false;
      }
      if (result.data.outcome === 'closed' || result.data.outcome === 'closed_lazily') setActive(null);
      return true;
    },
    [uid, inverseActive, isDominant, device, setActive]
  );

  const finish = useCallback(
    () =>
      requestOrDispatch(() => dispatchInverseTimerEvent(uid as string, inverseActive!, { type: 'FINISH_INVERSE' }, clockOffsetMs)),
    [requestOrDispatch, uid, inverseActive, clockOffsetMs]
  );

  const confirmCancel = useCallback(
    () =>
      requestOrDispatch(() =>
        dispatchInverseTimerEvent(uid as string, inverseActive!, { type: 'CONFIRM_CANCEL_INVERSE' }, clockOffsetMs)
      ),
    [requestOrDispatch, uid, inverseActive, clockOffsetMs]
  );

  return {
    inverseActive,
    elapsedSeconds,
    remindersDue,
    targetReached,
    hardCapSeconds,
    isDominant,
    start,
    finish,
    confirmCancel,
    isSubmitting,
    error,
    clearError: () => setError(null),
  };
}
