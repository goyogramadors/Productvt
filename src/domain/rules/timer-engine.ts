import type { ActiveStudySession } from '../entities/active-session';

/**
 * Motor por timestamps (docs/03-CRONOMETRO.md sección 10). Nunca usa `setInterval`/tiempo
 * acumulado como fuente de verdad: la UI lo llama en cada refresco (cada ~250-500 ms) solo para
 * volver a evaluar estas fórmulas puras, que siempre derivan de restar dos timestamps. Esto es lo
 * que permite que un espectador calcule el reloj sin ticks del dominante, y que reabrir la app tras
 * un cierre reconstruya el tiempo exacto.
 */

/**
 * `nowMs` para toda fórmula de este módulo (docs/03-CRONOMETRO.md sección 10.2,
 * docs/04-SINCRONIZACION.md sección 6): SIEMPRE `Date.now() + clockOffsetMs`, nunca el reloj local
 * crudo. `clockOffsetMs` lo calcula `computeClockOffsetMs` (`rules/clock-offset.ts`) en cada
 * checkpoint/snapshot confirmado por el servidor — nunca una sola vez al arrancar (sección 6.3) — y
 * lo persiste/provee `src/features/timer/store/timerStore.ts` (`productvt.clockOffsetMs`,
 * docs/02-DOMINIO.md sección 6.4). Recibirlo como parámetro (en vez de leerlo de un módulo global)
 * es lo que mantiene esta función pura y testeable sin AsyncStorage.
 */
export function nowMs(clockOffsetMs: number): number {
  return Date.now() + clockOffsetMs;
}

/**
 * `remaining` de un tramo o ventana de respuesta en curso. Devuelve segundos (puede ser decimal;
 * la UI redondea para mostrar). Nunca negativo.
 */
export function computeRemainingSeconds(active: ActiveStudySession, nowMsValue: number): number {
  const {
    segmentStartedAt,
    segmentTargetSeconds,
    segmentResumedAt,
    segmentRemainingAtResumeSeconds,
    responseDeadlineAt,
  } = active;

  if (responseDeadlineAt) {
    // study_completed_waiting_response, break_selection, break_completed_waiting_response
    return Math.max(0, (Date.parse(responseDeadlineAt) - nowMsValue) / 1000);
  }
  if (segmentResumedAt && segmentRemainingAtResumeSeconds !== undefined) {
    // study_running o break_running reanudado tras un almuerzo (sección 7.3)
    return Math.max(0, segmentRemainingAtResumeSeconds - (nowMsValue - Date.parse(segmentResumedAt)) / 1000);
  }
  // study_running, break_running o lunch_running sin reanudación
  return Math.max(0, segmentTargetSeconds - (nowMsValue - Date.parse(segmentStartedAt)) / 1000);
}

/**
 * Tiempo de estudio efectivo EN VIVO para el HUD del cronómetro (docs/03-CRONOMETRO.md sección
 * 10.3): `effectiveStudySeconds` persistido (bloques ya completados) más el progreso del bloque en
 * curso, que no se persiste hasta que termina. Fuera de `study_running` (incluido `lunch_running`
 * con el bloque pausado) es simplemente `effectiveStudySeconds` sin sumar nada (invariante I-1).
 */
export function computeLiveEffectiveStudySeconds(active: ActiveStudySession, nowMsValue: number): number {
  if (active.currentState !== 'study_running') return active.effectiveStudySeconds;
  const elapsedInCurrentBlock = active.segmentTargetSeconds - computeRemainingSeconds(active, nowMsValue);
  return active.effectiveStudySeconds + elapsedInCurrentBlock;
}
