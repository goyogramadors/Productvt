import type { ActiveSession } from '@/domain/entities/active-session';
import { INVERSE_HARD_CAP_FACTOR } from '@/domain/entities/active-session';
import type { InverseSession } from '@/domain/entities/inverse-session';
import type { StudySession } from '@/domain/entities/study-session';
import { computeInverseElapsedSeconds } from '@/domain/rules/inverse-timer';
import { isZombie } from '@/domain/rules/materialize-session';
import { getActiveSession, type ActiveSessionRepositoryError } from '@/repositories/active-session/activeSessionRepository';
import { type AsyncResult, err, ok } from '@/types/common';
import { dispatchInverseTimerEvent, InverseSessionCoordinatorError } from './InverseSessionCoordinator';
import { dispatchStudyTimerEvent, StudySessionCoordinatorError } from './StudySessionCoordinator';

/**
 * "EXPIRE perezoso para cualquier lector" (docs/03-CRONOMETRO.md sección 9.2/9.3): el dominante
 * puede haber cerrado la app exactamente durante una ventana de respuesta o quedarse sin batería a
 * mitad de un bloque. Cualquier dispositivo (dominante recién reabierto, espectador, o web) que
 * lea el singleton debe comparar `now` contra `responseDeadlineAt`/`lastCheckpointAt` ANTES de
 * mostrarlo como vigente, y ejecutar el cierre correspondiente si ya venció — sin esperar a que el
 * motor en vivo (`useActiveTimer`) lo note.
 *
 * Se llama: (1) al montar la app / hidratar el store del timer, (2) al volver a primer plano
 * (`AppState` `active`), y (3) opcionalmente en un intervalo largo (varios minutos) mientras hay
 * una sesión activa, como red de seguridad adicional al motor por timestamps en vivo.
 */
export class ActiveTimerRecoveryServiceError extends Error {}

export type RecoveryOutcome =
  | { outcome: 'none' }
  | { outcome: 'active'; active: ActiveSession }
  | { outcome: 'closed_study'; closedSession: StudySession }
  | { outcome: 'closed_inverse'; closedSession: InverseSession };

type RecoveryError =
  | ActiveTimerRecoveryServiceError
  | ActiveSessionRepositoryError
  | StudySessionCoordinatorError
  | InverseSessionCoordinatorError;

export async function recoverActiveSessionIfStale(uid: string): AsyncResult<RecoveryOutcome, RecoveryError> {
  const activeResult = await getActiveSession(uid);
  if (!activeResult.success) return err(activeResult.error);
  const active = activeResult.data;
  if (!active) return ok({ outcome: 'none' });

  if (active.type === 'study') {
    if (active.responseDeadlineAt && Date.now() >= Date.parse(active.responseDeadlineAt)) {
      const dispatch = await dispatchStudyTimerEvent({
        uid,
        active,
        event: { type: 'EXPIRE' },
        soundEnabled: false,
        volume: 0,
      });
      if (!dispatch.success) return err(dispatch.error);
      if (dispatch.data.outcome === 'closed') return ok({ outcome: 'closed_study', closedSession: dispatch.data.closedSession });
      // Guarda perdió la carrera contra otro cierre concurrente: no hay nada más que hacer aquí.
      return ok({ outcome: 'active', active });
    }

    if (isZombie(active, new Date().toISOString())) {
      const dispatch = await dispatchStudyTimerEvent({
        uid,
        active,
        event: { type: 'ZOMBIE_TIMEOUT' },
        soundEnabled: false,
        volume: 0,
      });
      if (!dispatch.success) return err(dispatch.error);
      if (dispatch.data.outcome === 'closed') return ok({ outcome: 'closed_study', closedSession: dispatch.data.closedSession });
      return ok({ outcome: 'active', active });
    }

    return ok({ outcome: 'active', active });
  }

  // active.type === 'inverse'
  const elapsedSeconds = computeInverseElapsedSeconds(active, Date.now());
  if (elapsedSeconds >= active.targetDurationSeconds * INVERSE_HARD_CAP_FACTOR) {
    const dispatch = await dispatchInverseTimerEvent(uid, active, { type: 'HARD_CAP_REACHED' });
    if (!dispatch.success) return err(dispatch.error);
    if (dispatch.data.outcome === 'closed') return ok({ outcome: 'closed_inverse', closedSession: dispatch.data.closedSession });
    return ok({ outcome: 'active', active });
  }

  if (isZombie(active, new Date().toISOString())) {
    const dispatch = await dispatchInverseTimerEvent(uid, active, { type: 'ZOMBIE_TIMEOUT' });
    if (!dispatch.success) return err(dispatch.error);
    if (dispatch.data.outcome === 'closed') return ok({ outcome: 'closed_inverse', closedSession: dispatch.data.closedSession });
    return ok({ outcome: 'active', active });
  }

  return ok({ outcome: 'active', active });
}
