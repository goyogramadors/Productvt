/**
 * Catálogo de sonidos predefinidos (SPEC.md sección 28.2/28.3). Dominio puro: solo datos, sin
 * React/Firebase/audio real — la reproducción efectiva (expo-audio) y la selección de archivo
 * propio del dispositivo (expo-document-picker) llegan en la Fase 4 (núcleo del timer), que puede
 * reutilizar estos mismos ids como claves de sus assets de audio.
 *
 * Los tres primeros ids coinciden a propósito con los valores sembrados por
 * `settingsRepository.defaultSoundPreferences()` para que la opción por defecto de cada ranura
 * quede seleccionada desde el primer render.
 */
export interface SoundOption {
  id: string;
  label: string;
}

export const SOUND_OPTIONS: readonly SoundOption[] = [
  { id: 'default_study_finished', label: 'Suave clásico' },
  { id: 'default_break_finished', label: 'Timbre de alerta' },
  { id: 'default_inverse_reminder', label: 'Recordatorio discreto' },
  { id: 'chime_bright', label: 'Campanita brillante' },
] as const;

export type SoundSlotKey = 'studyFinishedSoundId' | 'breakFinishedSoundId' | 'inverseReminderSoundId';

export const SOUND_SLOTS: readonly { key: SoundSlotKey; label: string }[] = [
  { key: 'studyFinishedSoundId', label: 'Fin de estudio' },
  { key: 'breakFinishedSoundId', label: 'Toca estudiar (fin de descanso)' },
  { key: 'inverseReminderSoundId', label: 'Recordatorio del temporizador inverso (cada 15 min)' },
] as const;
