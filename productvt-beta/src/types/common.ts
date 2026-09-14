/** Identificador genérico de documento/entidad. */
export type ID = string;

/**
 * Fecha/hora serializada en ISO 8601. Por convención del proyecto (SPEC.md sección 43), siempre
 * se persiste en UTC y se convierte a la zona horaria del usuario solo para mostrar en UI.
 */
export type ISODateString = string;

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

/**
 * Resultado tipado para operaciones que pueden fallar de forma esperada (lecturas/escrituras de
 * repositorio, validaciones de dominio), evitando que capas de aplicación tengan que envolver
 * todo en try/catch genéricos (ARCHITECTURE.md sección 27, "errores de dominio tipados, no
 * strings sueltos").
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}
