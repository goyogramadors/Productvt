import { z } from 'zod';

import { MAX_PRESET_NAME_LENGTH, PRESET_LIMITS } from '@/features/presets/domain/preset-rules';

/** Validación del formulario de preset con Zod, reutilizando los mismos límites del dominio puro. */
export const presetFormSchema = z.object({
  name: z.string().trim().min(1, 'Ingresa un nombre.').max(MAX_PRESET_NAME_LENGTH, `Máximo ${MAX_PRESET_NAME_LENGTH} caracteres.`),
  studyDurationMinutes: z.coerce
    .number()
    .int('Debe ser un número entero.')
    .min(PRESET_LIMITS.studyMinutes.min, `Mínimo ${PRESET_LIMITS.studyMinutes.min} minuto.`)
    .max(PRESET_LIMITS.studyMinutes.max, `Máximo ${PRESET_LIMITS.studyMinutes.max} minutos.`),
  shortBreakMinutes: z.coerce
    .number()
    .int('Debe ser un número entero.')
    .min(PRESET_LIMITS.shortBreakMinutes.min)
    .max(PRESET_LIMITS.shortBreakMinutes.max, `Máximo ${PRESET_LIMITS.shortBreakMinutes.max} minutos.`),
  cyclesBeforeLongBreak: z.coerce
    .number()
    .int('Debe ser un número entero.')
    .min(PRESET_LIMITS.cyclesBeforeLongBreak.min, `Mínimo ${PRESET_LIMITS.cyclesBeforeLongBreak.min} ciclo.`)
    .max(PRESET_LIMITS.cyclesBeforeLongBreak.max, `Máximo ${PRESET_LIMITS.cyclesBeforeLongBreak.max} ciclos.`),
  longBreakMinutes: z.coerce
    .number()
    .int('Debe ser un número entero.')
    .min(PRESET_LIMITS.longBreakMinutes.min)
    .max(PRESET_LIMITS.longBreakMinutes.max, `Máximo ${PRESET_LIMITS.longBreakMinutes.max} minutos.`),
});

export type PresetFormValues = z.infer<typeof presetFormSchema>;
