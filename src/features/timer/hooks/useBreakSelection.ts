import { useMemo } from 'react';

import type { ActiveStudySession } from '@/domain/entities/active-session';
import { computeAvailableBreakSeconds, computeGrantedBreakSeconds } from '@/domain/rules/break-bank';
import { useStudyTimerDispatch } from './useStudyTimerDispatch';

/**
 * Las cinco salidas de `break_selection` (docs/03-CRONOMETRO.md sección 5): tomar sugerido,
 * personalizado, saltar, almuerzo (delegado a `useLunchAction`) y terminar sesión. Solo tiene
 * sentido llamarlo con un `active` cuyo `currentState` sea `'break_selection'` o
 * `'break_completed_waiting_response'` (para `endSession`).
 */
export function useBreakSelection(active: ActiveStudySession) {
  const { dispatch, isDispatching, error, clearError } = useStudyTimerDispatch();

  const grantedSeconds = useMemo(
    () => computeGrantedBreakSeconds(active.cyclesCompleted, active.presetSnapshot),
    [active.cyclesCompleted, active.presetSnapshot]
  );
  const availableSeconds = useMemo(
    () => computeAvailableBreakSeconds(active.bankRemainingSeconds, grantedSeconds),
    [active.bankRemainingSeconds, grantedSeconds]
  );

  return {
    grantedSeconds,
    availableSeconds,
    isDispatching,
    error,
    clearError,
    chooseSuggested: () => dispatch(active, { type: 'CHOOSE_SUGGESTED_BREAK' }),
    chooseCustom: (chosenSeconds: number) => dispatch(active, { type: 'CHOOSE_CUSTOM_BREAK', payload: { chosenSeconds } }),
    skip: () => dispatch(active, { type: 'SKIP_BREAK' }),
    continueStudy: () => dispatch(active, { type: 'CONTINUE_STUDY' }),
    endSession: () => dispatch(active, { type: 'END_SESSION' }),
  };
}
