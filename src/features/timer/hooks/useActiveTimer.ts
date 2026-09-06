import { useEffect, useRef, useState } from 'react';

import { dispatchStudyTimerEvent } from '@/application/coordinators/StudySessionCoordinator';
import type { ActiveInverseSession, ActiveStudySession } from '@/domain/entities/active-session';
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
 * timestamps, refresco visual cada ~500ms, nunca fuente de verdad). Además, dispara los eventos
 * "auto" en cuanto `remaining` llega a 0, sin esperar a que el usuario vuelva a la app:
 * `STUDY_FINISHED`/`BREAK_FINISHED`/`LUNCH_FINISHED` son checkpoints normales que SOLO el dominante
 * puede escribir (docs/04-SINCRONIZACION.md sección 4.2); `EXPIRE` es un cierre perezoso que
 * CUALQUIER rol puede intentar (sección 4.3 punto 5, sección 7) — el coordinador lo resuelve vía la
 * transacción condicional, así que dejarlo pasar desde un espectador es seguro y deseable.
 */
export function useActiveTimer() {
  const active = useTimerStore((s) => s.active);
  const role = useTimerStore((s) => s.role);
  const clockOffsetMs = useTimerStore((s) => s.clockOffsetMs);
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
  const isDominant = role === 'dominant';

  const remainingSeconds = studyActive ? computeRemainingSeconds(studyActive, nowMs(clockOffsetMs)) : null;
  const liveEffectiveStudySeconds = studyActive
    ? computeLiveEffectiveStudySeconds(studyActive, nowMs(clockOffsetMs))
    : null;

  useEffect(() => {
    if (!studyActive || !uid || isDispatchingAutoEventRef.current) return;
    const remaining = computeRemainingSeconds(studyActive, nowMs(clockOffsetMs));
    if (remaining > 0) return;
    const autoEventType = resolveAutoEvent(studyActive.currentState);
    if (!autoEventType) return;
    // STUDY_FINISHED/BREAK_FINISHED/LUNCH_FINISHED: checkpoint normal, solo el dominante.
    // EXPIRE: cierre perezoso, cualquier rol puede intentarlo (el coordinador decide la primitiva).
    if (autoEventType !== 'EXPIRE' && !isDominant) return;

    isDispatchingAutoEventRef.current = true;
    void dispatchStudyTimerEvent({
      uid,
      active: studyActive,
      event: { type: autoEventType } as StudyTimerEvent,
      soundEnabled: soundPreferences?.enabled ?? true,
      volume: soundPreferences?.volume ?? 1,
      clockOffsetMs,
    })
      .then((result) => {
        if (!result.success) return;
        if (result.data.outcome === 'updated') setActive(result.data.active);
        if (result.data.outcome === 'closed' || result.data.outcome === 'closed_lazily') setActive(null);
      })
      .finally(() => {
        isDispatchingAutoEventRef.current = false;
      });
    // `tick` fuerza la re-evaluación cada 500ms (motor por timestamps, sección 10) aunque `studyActive`
    // no haya cambiado de referencia mientras un tramo corre sin checkpoints intermedios.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, studyActive, isDominant, uid, soundPreferences, clockOffsetMs]);

  return {
    active,
    studyActive,
    inverseActive,
    isHydrating,
    isDominant,
    role,
    remainingSeconds,
    liveEffectiveStudySeconds,
  };
}
