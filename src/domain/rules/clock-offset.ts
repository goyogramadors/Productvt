/**
 * `clockOffsetMs`: reloj común entre dispositivos sin backend propio (docs/03-CRONOMETRO.md sección
 * 10.2, docs/04-SINCRONIZACION.md sección 6). Los relojes de los dispositivos no son confiables —
 * `clockOffsetMs` corrige el reloj local de CADA dispositivo hacia el reloj del servidor de
 * Firestore, aprovechando cada checkpoint confirmado en vez de una llamada de red dedicada.
 *
 * Una sola fórmula (`Date.parse(serverIso) - localReferenceMs`) sirve para los dos casos que
 * docs/04-SINCRONIZACION.md sección 6 describe por separado, porque solo difieren en qué instante
 * local se usa como segundo término:
 * - El DOMINANTE, tras cada checkpoint que él mismo confirmó: `localReferenceMs` sería el reloj del
 *   dispositivo en el momento exacto de esa escritura.
 * - El ESPECTADOR (y, en la práctica, también el dominante — está suscrito al mismo documento vía
 *   `onSnapshot`), al recibir un snapshot ya confirmado por el servidor
 *   (`metadata.hasPendingWrites === false && metadata.fromCache === false`): `localReferenceMs` es
 *   `Date.now()` en el instante de recibir ESE snapshot.
 * Ambos casos terminan corrigiendo hacia el mismo punto de referencia (el reloj del servidor), con
 * una diferencia entre sí acotada por la latencia de red hasta la confirmación — irreleveante frente
 * a la granularidad de 30 s/10 min de las ventanas de respuesta (ejemplo numérico completo en
 * docs/04-SINCRONIZACION.md sección 6.2). `src/features/timer/store/timerStore.ts` es quien decide
 * CUÁNDO llamar a esta función (en cada snapshot confirmado, nunca una sola vez al arrancar —
 * sección 6.3) y persiste el resultado en `productvt.clockOffsetMs`.
 */
export function computeClockOffsetMs(serverConfirmedIso: string, localReferenceMs: number): number {
  return Date.parse(serverConfirmedIso) - localReferenceMs;
}
