import type { Preset } from '../entities/preset';

/**
 * Foto histórica de un preset en el momento de iniciar un bloque de estudio (SPEC.md sección
 * 13.3; ARCHITECTURE.md sección 9.4, campo `presetSnapshot`). A diferencia de `CategorySnapshot`,
 * esta SÍ se persiste tal cual (anidada) dentro de `StudySession.presetSnapshot`: preserva la
 * integridad histórica del bloque si el preset original cambia o se borra después.
 */
export interface PresetSnapshot {
  presetId: string;
  nameSnapshot: string;
  studyDurationMinutes: number;
  shortBreakMinutes: number;
  cyclesBeforeLongBreak: number;
  longBreakMinutes: number;
}

export function buildPresetSnapshot(preset: Preset): PresetSnapshot {
  return {
    presetId: preset.id,
    nameSnapshot: preset.name,
    studyDurationMinutes: preset.studyDurationMinutes,
    shortBreakMinutes: preset.shortBreakMinutes,
    cyclesBeforeLongBreak: preset.cyclesBeforeLongBreak,
    longBreakMinutes: preset.longBreakMinutes,
  };
}
