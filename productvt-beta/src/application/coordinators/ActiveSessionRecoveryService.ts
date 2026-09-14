import type { ActiveSession, DeviceRole } from '@/domain/entities/active-session';
import type { DeviceIdentity } from '@/domain/entities/device-identity';
import { resolveDeviceRole } from '@/domain/entities/device-identity';
import { closeLazySessionIfDue, evaluateLazyClosure, type LazyClosureReason } from '@/domain/coordinators/close-lazy-session';
import { resolveRescheduleIntents } from '@/domain/rules/notification-recovery';
import {
  getActiveSession,
  type ActiveSessionRepositoryError,
} from '@/repositories/active-session/activeSessionRepository';
import { cacheActiveSession, clearCachedActiveSession } from '@/features/timer/services/timerPersistence';
import { applyNotificationIntents } from '@/features/timer/services/timerNotificationService';
import { cancelAllIntent } from '@/domain/machines/notification-intents';

/**
 * Nombre canónico de docs/02-DOMINIO.md sección 2.5 y docs/04-SINCRONIZACION.md sección 8
 * (reemplaza el `ActiveTimerRecoveryService` de la Fase 4a, nombre antiguo de ARCHITECTURE.md v1).
 * Algoritmo COMPLETO de las 6 pasos de docs/04-SINCRONIZACION.md sección 8.1: lectura remota como
 * ÚNICA verdad, recálculo de `clockOffsetMs` con lo disponible, cierre perezoso si venció
 * (`closeLazySessionIfDue`, con recursión de una sola vez en `already_closed`), hidratación de la
 * máquina local (aquí: el valor de retorno, que `timerStore.ts` usa para pintar sin esperar al
 * próximo `onSnapshot`), reprogramación de notificaciones SOLO si el rol es dominante, y suscripción
 * en vivo (la abre `timerStore.ts`, no este servicio — ver nota de implementación abajo).
 *
 * Se invoca en tres momentos (sección 8, arriba de 8.1): (a) arranque en frío de la app, (b) vuelta
 * a primer plano (`AppState` `active`), (c) reconexión de red tras un período offline. `timerStore.ts`
 * engancha (a) y (b); (c) queda cubierto por (b) en la práctica (`AppState` también pasa a `active`
 * cuando el usuario vuelve a la app tras reconectar) — no hay un listener de conectividad dedicado
 * en esta fase porque `NetInfo` no es una dependencia ya instalada y el caso ya está cubierto.
 */

export type RecoveryOutcome =
  | { kind: 'idle' }
  | { kind: 'closed_lazily'; closedAs: LazyClosureReason }
  | { kind: 'hydrated'; role: DeviceRole; active: ActiveSession };

/**
 * Paso 6 de la sección 8.1 ("suscribirse a onSnapshot") lo ejecuta `timerStore.ts` — ya mantiene su
 * propia suscripción viva durante toda la sesión de usuario (no tendría sentido abrir y cerrar una
 * segunda suscripción en cada llamada a este servicio, que puede invocarse varias veces por sesión
 * de la app). Este servicio se concentra en los pasos 1-5, que sí son puntuales.
 */
export async function recoverActiveSession(
  uid: string,
  device: DeviceIdentity,
  clockOffsetMs: number
): Promise<RecoveryOutcome> {
  // 1. El singleton remoto es SIEMPRE la verdad (D15, docs/02-DOMINIO.md sección 3.5). El caché
  //    local (`productvt.activeSessionCache`) solo sirve para pintar algo antes de que resuelva esta
  //    lectura; nunca se usa como fuente de decisión.
  const result = await getActiveSession(uid);
  if (!result.success) throw result.error as ActiveSessionRepositoryError;
  const active = result.data;
  if (!active) {
    await clearCachedActiveSession(); // por si quedó un residuo de una sesión ya cerrada
    return { kind: 'idle' };
  }
  const role = resolveDeviceRole(active, device) as DeviceRole; // nunca null: ya sabemos que existe

  // 2. Recalcula el offset con lo que haya disponible (si el snapshot viene de caché, se usa el
  //    último `clockOffsetMs` persistido, provisto por el llamador — no se bloquea la recuperación
  //    esperando red).
  const nowMsValue = Date.now() + clockOffsetMs;

  // 3. ¿La sesión ya venció mientras la app no corría? Se evalúa igual para dominante y espectador
  //    (docs/03-CRONOMETRO.md sección 9.2: "cualquier dispositivo que lea el singleton").
  const evaluation = evaluateLazyClosure(active, nowMsValue);
  if (evaluation.due) {
    const closeResult = await closeLazySessionIfDue(uid, active.sessionId, evaluation.computeClosure, nowMsValue);
    if (closeResult === 'closed') {
      await applyNotificationIntents(active.sessionId, [cancelAllIntent()]);
      await clearCachedActiveSession();
      return { kind: 'closed_lazily', closedAs: evaluation.reason };
    }
    if (closeResult === 'already_closed') {
      // Otro dispositivo ganó la carrera entre que evaluamos y que intentamos cerrar: está bien,
      // simplemente releemos para hidratar con lo que quede (probablemente ya no exista — recursión
      // de una sola vez, termina sola porque el segundo intento cae directo al caso `idle`).
      return recoverActiveSession(uid, device, clockOffsetMs);
    }
    // 'not_yet_due': el reloj local estaba desfasado; sigue de largo y hidrata normalmente.
  }

  // 4. HYDRATE: el valor de retorno de esta función ES la hidratación — `timerStore.ts` pinta
  //    `active`/`role` con él sin esperar al próximo `onSnapshot` (que de todos modos también va a
  //    traer el mismo documento, porque la suscripción ya está abierta en paralelo).

  // 5. Solo el dominante reprograma notificaciones (docs/03-CRONOMETRO.md sección 11): pueden
  //    haberse perdido (reinstalación, "borrar notificaciones" del SO, el sistema operativo las
  //    descarta tras muchas horas) — se reprograman siempre, de forma idempotente (mismo
  //    identificador determinístico `${sessionId}:${propósito}`, así que reprogramar una que seguía
  //    viva simplemente la reemplaza sin duplicarla).
  if (role === 'dominant') {
    await applyNotificationIntents(active.sessionId, resolveRescheduleIntents(active), clockOffsetMs);
    await cacheActiveSession(active);
  }

  return { kind: 'hydrated', role, active };
}
