import type { ActiveStudySession } from '@/domain/entities/active-session';
import { LUNCH_COOLDOWN_CYCLES } from '@/domain/entities/active-session';
import { isLunchAvailable } from '@/domain/rules/lunch';
import { useStudyTimerDispatch } from './useStudyTimerDispatch';

/** Botón "Almuerzo" (docs/03-CRONOMETRO.md sección 7): disponible desde los 5 estados activos no-almuerzo. */
export function useLunchAction(active: ActiveStudySession) {
  const { dispatch, isDispatching, error, clearError } = useStudyTimerDispatch();

  const available = isLunchAvailable(active.cyclesSinceLunch, active.lunchUsed);
  const cyclesUntilAvailable = available ? 0 : Math.max(0, LUNCH_COOLDOWN_CYCLES - active.cyclesSinceLunch);

  return {
    available,
    cyclesUntilAvailable,
    isDispatching,
    error,
    clearError,
    requestLunch: () => dispatch(active, { type: 'REQUEST_LUNCH' }),
  };
}
