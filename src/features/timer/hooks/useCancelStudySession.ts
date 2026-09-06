import { useCallback, useEffect, useRef, useState } from 'react';

import type { ActiveStudySession } from '@/domain/entities/active-session';
import { CANCEL_CONFIRM_WINDOW_SECONDS } from '@/domain/rules/cancellation';
import { useStudyTimerDispatch } from './useStudyTimerDispatch';

export type CancelSessionPhase = 'closed' | 'waiting_first' | 'ready_first' | 'waiting_second' | 'ready_second';

/**
 * Doble confirmación 15+15s (docs/03-CRONOMETRO.md sección 8.1, T14/T15/T16). Puramente local: no
 * toca Firestore hasta el segundo toque (`CONFIRM_CANCEL`) — la ventana de respuesta del estado de
 * origen (si la hay) sigue corriendo en paralelo, y `EXPIRE` puede ganarle a esta confirmación
 * (sección 8.2, lo resuelve `study-timer-machine.ts`, no este hook).
 */
export function useCancelStudySession(active: ActiveStudySession) {
  const { dispatch, isDispatching, error, clearError } = useStudyTimerDispatch();
  const [phase, setPhase] = useState<CancelSessionPhase>('closed');
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdown = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(
    (onDone: () => void) => {
      clearCountdown();
      setSecondsRemaining(CANCEL_CONFIRM_WINDOW_SECONDS);
      intervalRef.current = setInterval(() => {
        setSecondsRemaining((current) => {
          if (current <= 1) {
            clearCountdown();
            onDone();
            return 0;
          }
          return current - 1;
        });
      }, 1000);
    },
    [clearCountdown]
  );

  useEffect(() => clearCountdown, [clearCountdown]);

  const open = useCallback(() => {
    setPhase('waiting_first');
    startCountdown(() => setPhase('ready_first'));
  }, [startCountdown]);

  const dismiss = useCallback(() => {
    clearCountdown();
    setPhase('closed');
  }, [clearCountdown]);

  const confirm = useCallback(() => {
    if (phase === 'ready_first') {
      setPhase('waiting_second');
      startCountdown(() => setPhase('ready_second'));
      return;
    }
    if (phase === 'ready_second') {
      void dispatch(active, { type: 'CONFIRM_CANCEL' }).then(() => setPhase('closed'));
    }
  }, [phase, startCountdown, dispatch, active]);

  return {
    phase,
    isOpen: phase !== 'closed',
    secondsRemaining,
    isDispatching,
    error,
    clearError,
    open,
    dismiss,
    confirm,
  };
}
