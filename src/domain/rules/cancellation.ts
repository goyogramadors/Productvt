/**
 * Doble confirmación de cancelación (docs/03-CRONOMETRO.md sección 8.1, sin cambios de fondo sobre
 * SPEC v1 sección 20.3): 15 s + 15 s, puramente local (UI + un temporizador), no toca Firestore
 * hasta el cierre real (`CONFIRM_CANCEL`, fila T16 de la máquina de estados).
 */
export const CANCEL_CONFIRM_WINDOW_SECONDS = 15;

/**
 * `resolveCancelledSessionEffectiveSeconds` vive en `session-effective-seconds.ts`
 * (docs/02-DOMINIO.md sección 3.6 fija ese archivo como su hogar canónico; docs/03-CRONOMETRO.md
 * sección 8.3 la cita "sin redefinir"). Se re-exporta aquí para que todo lo relacionado con
 * cancelación —ventana de confirmación y efecto sobre `effectiveStudySeconds`— se pueda importar
 * desde un solo módulo.
 */
export { resolveCancelledSessionEffectiveSeconds } from './session-effective-seconds';
