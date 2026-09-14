import type { BreakSegment, StudySegment } from '../entities/study-session';

/**
 * Funciones de tiempo efectivo y banco (docs/02-DOMINIO.md sección 3.6). Único lugar que conoce
 * estas fórmulas: `materialize-session.ts` y la máquina de estados las importan de aquí, nunca las
 * reimplementan.
 */

/** Suma de bloques completados. Única forma válida de calcular tiempo efectivo (invariante I-1). */
export function sumEffectiveStudySeconds(studySegments: readonly StudySegment[]): number {
  return studySegments.reduce((total, segment) => total + segment.durationSeconds, 0);
}

/**
 * Tiempo efectivo que sobrevive a una cancelación.
 *
 * ESTADO VIGENTE (docs/03-CRONOMETRO.md sección 8.3, CONFIRMADO por el creador el 2026-09-06,
 * pregunta 25 de `03-requisitos/preguntas-para-el-creador.md`; decisiones-tomadas.md punto 1.b):
 * cancelar tiene la MISMA SEVERIDAD que expirar — solo se pierde el bloque/tramo en curso (que
 * nunca llegó a anexarse a `studySegments[]`), los bloques previos ya completados en la misma
 * sesión conservan su tiempo efectivo. Esto corrige la regla anterior ("borra todo" → 0) que
 * todavía aparece, sin actualizar, en algunas filas de docs/02-DOMINIO.md (I-8, tabla de T16) y en
 * el encabezado de "Fuentes" de docs/03-CRONOMETRO.md — la propia sección 8.3 declara
 * explícitamente que corrige esas menciones anteriores, así que esta función implementa la versión
 * más reciente y más autoritativa (fecha explícita + confirmación directa del creador), no la
 * mención residual "hoy 0".
 *
 * Sigue existiendo como punto de aislamiento único (nunca se inlinea en la máquina de estados) por
 * si una futura versión quisiera volver a diferenciar cancelación de expiración: cambiarla es un
 * cambio de una línea.
 */
export function resolveCancelledSessionEffectiveSeconds(studySegments: readonly StudySegment[]): number {
  return sumEffectiveStudySeconds(studySegments);
}

/** Suma de `bankDeltaSeconds`; el banco arranca en 0 en cada sesión (invariante I-4). */
export function sumBankRemainingSeconds(breakSegments: readonly BreakSegment[]): number {
  return breakSegments.reduce((total, segment) => total + segment.bankDeltaSeconds, 0);
}
