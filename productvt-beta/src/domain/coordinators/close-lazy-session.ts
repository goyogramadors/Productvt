import { runTransaction } from 'firebase/firestore';

import type { ActiveSession } from '../entities/active-session';
import { INVERSE_HARD_CAP_FACTOR } from '../entities/active-session';
import { transitionInverseTimer } from '../machines/inverse-timer-machine';
import { transitionStudyTimer } from '../machines/study-timer-machine';
import { computeInverseElapsedSeconds } from '../rules/inverse-timer';
import {
  isZombie,
  materializeInverseSession,
  materializeStudySession,
  type InverseSessionClosure,
  type StudySessionClosure,
} from '../rules/materialize-session';
import { db } from '@/infrastructure/firebase/client';
import { activeSessionDocRef, sessionDocRef } from '@/infrastructure/firebase/collections';
import { activeSessionFromSnapshotData, type RawActiveSession } from '@/repositories/active-session/activeSessionRepository';

/**
 * Cierre perezoso de una ventana vencida o de una sesión zombie (docs/04-SINCRONIZACION.md sección
 * 7): a diferencia de un cierre normal (T7/T10/T16, solo el dominante, sin competencia — `WriteBatch`,
 * fila 5 de la tabla de la sección 3), EXPIRE/ZOMBIE_TIMEOUT (estudio, T17/T18) y HARD_CAP_REACHED/
 * ZOMBIE_TIMEOUT (inverso) pueden detectarlos y ejecutarlos varios dispositivos casi al mismo
 * tiempo (fila 6 de esa tabla): hace falta la garantía condicional de una transacción para que solo
 * uno de esos cierres se aplique de verdad.
 *
 * EXCEPCIÓN DE UBICACIÓN deliberada (no una violación de ARCHITECTURE.md sección 2/30.4): este
 * archivo vive bajo `src/domain/` porque así lo fija literalmente docs/04-SINCRONIZACION.md sección
 * 7.2 ("src/domain/coordinators/close-lazy-session.ts"), pero SÍ importa `firebase/firestore` — no
 * es una función pura de máquina de estados/reglas de banco/cálculo de tiempos/agregador (las
 * cuatro categorías que esa regla exige mantener puras), sino el coordinador que une esas funciones
 * puras con la única primitiva de Firestore (`runTransaction`) capaz de revalidar la condición de
 * cierre sin dejar una carrera entre dispositivos. `StudySessionCoordinator`,
 * `InverseSessionCoordinator` y `ActiveSessionRecoveryService` (todos en `src/application/`) son los
 * únicos llamadores; ningún componente de UI debe importar este módulo directamente.
 */

export type LazyCloseResult = 'closed' | 'already_closed' | 'not_yet_due';

type ClosureEvaluation =
  | { stillDue: true; closure: StudySessionClosure | InverseSessionClosure }
  | { stillDue: false };

/**
 * Firma común a EXPIRE (T17)/ZOMBIE_TIMEOUT (T18, estudio) y HARD_CAP_REACHED/ZOMBIE_TIMEOUT
 * (inverso). SIEMPRE se llama con el `active` recién leído DENTRO de la transacción — nunca con el
 * que tenía el llamador antes de entrar — para que la revalidación sea real (sección 7.2).
 */
export type ComputeClosureFn = (active: ActiveSession, nowMs: number) => ClosureEvaluation | null;

/**
 * docs/04-SINCRONIZACION.md sección 7.2, implementación literal: relee el singleton dentro de la
 * transacción, revalida la condición con ese documento fresco (nunca confía en la evaluación previa
 * del llamador) y, si sigue vigente, materializa y borra en la misma transacción.
 */
export async function closeLazySessionIfDue(
  uid: string,
  expectedSessionId: string,
  computeClosure: ComputeClosureFn,
  nowMs: number
): Promise<LazyCloseResult> {
  return runTransaction(db, async (tx) => {
    const ref = activeSessionDocRef(uid);
    const snap = await tx.get(ref);
    if (!snap.exists()) return 'already_closed'; // otro dispositivo ya lo cerró
    const raw = snap.data() as unknown as RawActiveSession;
    const active = activeSessionFromSnapshotData(raw, new Date(nowMs).toISOString());
    if (active.sessionId !== expectedSessionId) return 'already_closed'; // ya se cerró y empezó otra sesión distinta

    const evaluation = computeClosure(active, nowMs);
    if (!evaluation || !evaluation.stillDue) return 'not_yet_due'; // el propio dispositivo se adelantó (reloj desfasado)

    const materialized =
      active.type === 'study'
        ? materializeStudySession(active, evaluation.closure as StudySessionClosure)
        : materializeInverseSession(active, evaluation.closure as InverseSessionClosure);
    tx.set(sessionDocRef(uid, active.sessionId), materialized);
    tx.delete(ref);
    return 'closed';
  });
}

/**
 * Reproduce EXPIRE/ZOMBIE_TIMEOUT de estudio contra un `active` fresco (dentro o fuera de la
 * transacción). Exportada (no solo de uso interno de `evaluateLazyClosure`) porque
 * `StudySessionCoordinator.dispatchStudyTimerEvent` la vuelve a necesitar: decide qué evento
 * conceptual replicar (`EXPIRE` vs `ZOMBIE_TIMEOUT`) mirando `result.closure.completionReason` de
 * la evaluación NO transaccional que ya hizo, no la de `evaluateLazyClosure`.
 */
export function studyComputeClosure(eventType: 'EXPIRE' | 'ZOMBIE_TIMEOUT'): ComputeClosureFn {
  return (active, nowMs) => {
    if (active.type !== 'study') return null;
    const result = transitionStudyTimer(active, { type: eventType }, { nowIso: new Date(nowMs).toISOString() });
    return result.kind === 'close' ? { stillDue: true, closure: result.closure } : { stillDue: false };
  };
}

/**
 * Reproduce HARD_CAP_REACHED/ZOMBIE_TIMEOUT de inverso contra un `active` fresco. Exportada por la
 * misma razón que `studyComputeClosure`: `InverseSessionCoordinator.dispatchInverseTimerEvent`
 * necesita construirla a partir del `event.type` LITERAL que se dispatchó (nunca a partir de una
 * revalidación independiente — a diferencia de la máquina de estudio, `transitionInverseTimer` NO
 * redirige un cierre manual hacia uno de estos dos por su cuenta, así que un `FINISH_INVERSE`
 * manual que coincide por casualidad con `elapsed >= 2·T` NO debe tratarse como perezoso).
 */
export function inverseComputeClosure(eventType: 'HARD_CAP_REACHED' | 'ZOMBIE_TIMEOUT'): ComputeClosureFn {
  return (active, nowMs) => {
    if (active.type !== 'inverse') return null;
    const result = transitionInverseTimer(active, { type: eventType }, { nowIso: new Date(nowMs).toISOString() });
    return result.kind === 'close' ? { stillDue: true, closure: result.closure } : { stillDue: false };
  };
}

export type LazyClosureReason = 'expired' | 'zombie' | 'inverse_auto_finished';

export type LazyClosureCheck =
  | { due: false }
  | { due: true; reason: LazyClosureReason; computeClosure: ComputeClosureFn };

/**
 * Evalúa, con lo que YA se tiene localmente (sin red adicional), si conviene siquiera intentar un
 * cierre perezoso — optimización de "no abrir una transacción si claramente no hace falta". La
 * condición se REVALIDA de todos modos dentro de `closeLazySessionIfDue` con el documento recién
 * leído (docs/04-SINCRONIZACION.md sección 7.2, sección 8.1 paso 3). La usan tanto el motor en vivo
 * (`useActiveTimer`/`useInverseTimer`, vía los coordinadores) como `ActiveSessionRecoveryService`.
 */
export function evaluateLazyClosure(active: ActiveSession, nowMs: number): LazyClosureCheck {
  const nowIso = new Date(nowMs).toISOString();

  if (active.type === 'study') {
    if (active.responseDeadlineAt && nowMs >= Date.parse(active.responseDeadlineAt)) {
      return { due: true, reason: 'expired', computeClosure: studyComputeClosure('EXPIRE') };
    }
    if (isZombie(active, nowIso)) {
      return { due: true, reason: 'zombie', computeClosure: studyComputeClosure('ZOMBIE_TIMEOUT') };
    }
    return { due: false };
  }

  const elapsedSeconds = computeInverseElapsedSeconds(active, nowMs);
  if (elapsedSeconds >= active.targetDurationSeconds * INVERSE_HARD_CAP_FACTOR) {
    return { due: true, reason: 'inverse_auto_finished', computeClosure: inverseComputeClosure('HARD_CAP_REACHED') };
  }
  if (isZombie(active, nowIso)) {
    return { due: true, reason: 'inverse_auto_finished', computeClosure: inverseComputeClosure('ZOMBIE_TIMEOUT') };
  }
  return { due: false };
}
