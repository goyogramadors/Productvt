import type { ActiveSession } from '../entities/active-session';

/**
 * Guarda pura que modela la exclusión mutua de I-11/I-12 (docs/02-DOMINIO.md sección 4): solo
 * puede existir un `active/session` por usuario, sea de estudio o inverso — `START_SESSION` (T1) y
 * `START_INVERSE` compiten por el mismo documento inexistente (docs/03-CRONOMETRO.md sección
 * 12.4). La verdad última la impone la transacción `create` de Firestore (no puede evaluarse sin
 * red), pero esta función expone la misma regla como una comprobación pura y testeable que el
 * coordinador ejecuta ANTES de intentar la transacción, para fallar rápido con un mensaje claro.
 */
export function canStartNewActiveSession(existingActive: ActiveSession | null): boolean {
  return existingActive === null;
}
