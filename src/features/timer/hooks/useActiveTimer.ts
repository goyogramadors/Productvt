import { useEffect, useRef, useState } from 'react';

import { dispatchStudyTimerEvent } from '@/application/coordinators/StudySessionCoordinator';
import type { ActiveInverseSession, ActiveSession, ActiveStudySession } from '@/domain/entities/active-session';
import { resolveDeviceRole } from '@/domain/entities/device-identity';
import type { StudyTimerEvent } from '@/domain/machines/study-timer-events';
import { computeLiveEffectiveStudySeconds, computeRemainingSeconds, nowMs } from '@/domain/rules/timer-engine';
import { useAuthStore } from '@/store/auth/authStore';
import { useTimerStore } from '@/features/timer/store/timerStore';

const TICK_MS = 500;

/** Mapea el estado corriendo/esperando actual al evento "auto" que corresponde cuando `remaining` llega a 0. */
function resolveAutoEvent(state: ActiveStudySession['currentState']): StudyTimerEvent['type'] | null {
  switch (state) {
    case 'study_running':
      return 'STUDY_FINISHED';
    case 'break_running':
      return 'BREAK_FINISHED';
    case 'lunch_running':
      return 'LUNCH_FINISHED';
    case 'study_completed_waiting_response':
    case 'break_selection':
    case 'break_completed_waiting_response':
      return 'EXPIRE';
    default:
      return null;
  }
}

/**
 * Hook central de lectura en vivo del cronómetro (docs/03-CRONOMETRO.md sección 10: motor por
 * timestamps, refresco visual cada ~500ms, nunca fuente de verdad). Además, si este dispositivo es
 * el dominante de la sesión, dispara los eventos "auto" (`STUDY_FINISHED`/`BREAK_FINISHED`/
 * `LUNCH_FINISHED`/`EXPIRE`) en cuanto `remaining` llega a 0 — sin esperar a que el usuario vuelva
 * a la app (sección 9.2/10.4 ya cubren la recuperación perezosa para cuando la app SÍ estuvo
 * cerrada; este hook cubre el caso normal de la app abierta y en primer plano).
 */
export function useActiveTimer() {
  const active = useTimerStore((s) => s.active);
  const device = useTimerStore((s) => s.device);
  const isHydrating = useTimerStore((s) => s.isHydrating);
  const setActive = useTimerStore((s) => s.setActive);
  const uid = useAuthStore((s) => s.user?.uid);
  const soundPreferences = useAuthStore((s) => s.settings?.soundPreferences);

  const [tick, setTick] = useState(0);
  const isDispatchingAutoEventRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(interval);
  }, []);

  const studyActive: ActiveStudySession | null = active?.type === 'study' ? active : null;
  const inverseActive: ActiveInverseSession | null = active?.type === 'inverse' ? active : null;
  const role = active && device ? resolveDeviceRole(active as ActiveSession, device) : null;
  const isDominant = role === 'dominant';

  const remainingSeconds = studyActive ? computeRemainingSeconds(studyActive, nowMs()) : null;
  const liveEffectiveStudySeconds = studyActive ? computeLiveEffectiveStudySeconds(studyActive, nowMs()) : null;

  useEffect(() => {
    if (!studyActive || !isDominant || !uid || isDispatchingAutoEventRef.current) return;
    const remaining = computeRemainingSeconds(studyActive, nowMs());
    if (remaining > 0) return;
    const autoEventType = resolveAutoEvent(studyActive.currentState);
    if (!autoEventType) return;

    isDispatchingAutoEventRef.current = true;
    void dispatchStudyTimerEvent({
      uid,
      active: studyActive,
      event: { type: autoEventType } as StudyTimerEvent,
      soundEnabled: soundPreferences?.enabled ?? true,
      volume: soundPreferences?.volume ?? 1,
    })
      .then((result) => {
        if (!result.success) return;
        if (result.data.outcome === 'updated') setActive(result.data.active);
        if (result.data.outcome === 'closed') setActive(null);
      })
      .finally(() => {
        isDispatchingAutoEventRef.current = false;
      });
    // `tick` fuerza la re-evaluación cada 500ms (motor por timestamps, sección 10) aunque `studyActive`
    // no haya cambiado de referencia mientras un tramo corre sin checkpoints intermedios.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, studyActive, isDominant, uid, soundPreferences]);

  return {
    active,
    studyActive,
    inverseActive,
    isHydrating,
    isDominant,
    remainingSeconds,
    liveEffectiveStudySeconds,
  };
}
