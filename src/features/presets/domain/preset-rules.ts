/**
 * Reglas puras de presets (ARCHITECTURE.md sección 2.1/30.4). Cubre SPEC.md sección 13.2
 * (propiedades y límites razonables de un preset) y sirve de único punto de validación reutilizado
 * tanto por `preset-service.ts` (antes de persistir) como por el schema de Zod del formulario.
 */

export const MAX_PRESET_NAME_LENGTH = 40;

/**
 * Límites razonables para un preset de estudio. No están fijados explícitamente por SPEC.md (que
 * solo define el preset "Estándar" 25/5/4/35), pero evitan configuraciones absurdas (0 minutos de
 * estudio, 999 ciclos) sin restringir la personalización real que pide SPEC.md sección 13.3.
 */
export const PRESET_LIMITS = {
  studyMinutes: { min: 1, max: 180 },
  shortBreakMinutes: { min: 0, max: 60 },
  cyclesBeforeLongBreak: { min: 1, max: 12 },
  longBreakMinutes: { min: 0, max: 120 },
} as const;

export interface PresetFormInput {
  name: string;
  studyDurationMinutes: number;
  shortBreakMinutes: number;
  cyclesBeforeLongBreak: number;
  longBreakMinutes: number;
}

export function normalizePresetName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/** Devuelve la lista de mensajes de error (vacía = válido). */
export function validatePresetInput(input: PresetFormInput): string[] {
  const errors: string[] = [];
  const name = normalizePresetName(input.name);

  if (name.length === 0 || name.length > MAX_PRESET_NAME_LENGTH) {
    errors.push(`El nombre debe tener entre 1 y ${MAX_PRESET_NAME_LENGTH} caracteres.`);
  }
  if (!isInRange(input.studyDurationMinutes, PRESET_LIMITS.studyMinutes)) {
    errors.push(
      `La duración de estudio debe estar entre ${PRESET_LIMITS.studyMinutes.min} y ${PRESET_LIMITS.studyMinutes.max} minutos.`
    );
  }
  if (!isInRange(input.shortBreakMinutes, PRESET_LIMITS.shortBreakMinutes)) {
    errors.push(
      `El descanso corto debe estar entre ${PRESET_LIMITS.shortBreakMinutes.min} y ${PRESET_LIMITS.shortBreakMinutes.max} minutos.`
    );
  }
  if (!isInRange(input.cyclesBeforeLongBreak, PRESET_LIMITS.cyclesBeforeLongBreak)) {
    errors.push(
      `Los ciclos antes del descanso largo deben estar entre ${PRESET_LIMITS.cyclesBeforeLongBreak.min} y ${PRESET_LIMITS.cyclesBeforeLongBreak.max}.`
    );
  }
  if (!isInRange(input.longBreakMinutes, PRESET_LIMITS.longBreakMinutes)) {
    errors.push(
      `El descanso largo debe estar entre ${PRESET_LIMITS.longBreakMinutes.min} y ${PRESET_LIMITS.longBreakMinutes.max} minutos.`
    );
  }

  return errors;
}

function isInRange(value: number, range: { min: number; max: number }): boolean {
  return Number.isInteger(value) && value >= range.min && value <= range.max;
}

/**
 * Descanso total disponible al llegar al ciclo del descanso largo: corto del propio ciclo + largo
 * adicional (SPEC.md sección 17.7, ejemplo preset Estándar 35 + 5 = 40 min). Función pura
 * reutilizable por el motor del timer (Fase 4) para no repetir esta suma dispersa.
 */
export function computeLongBreakTotalMinutes(preset: PresetFormInput): number {
  return preset.shortBreakMinutes + preset.longBreakMinutes;
}
