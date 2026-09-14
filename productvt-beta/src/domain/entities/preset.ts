/**
 * Configuración reutilizable de estudio/descanso, expuesta al usuario como "razón de estudio"
 * (SPEC.md sección 13; ARCHITECTURE.md sección 9.3).
 */
export interface Preset {
  id: string;
  userId: string;
  name: string;
  studyDurationMinutes: number;
  shortBreakMinutes: number;
  cyclesBeforeLongBreak: number;
  longBreakMinutes: number;
  isDefault: boolean;
  /**
   * Reservado para personalización futura con imágenes, igual que en `Category`
   * (decisiones-tomadas.md, sección "Personalización futura con imágenes"). No expuesto en V1.
   */
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Valores del preset "Estándar" que debe existir por defecto para todo usuario nuevo
 * (SPEC.md sección 13.1). Una fase posterior (categorías y presets) es responsable de sembrar
 * este preset en Firestore; aquí solo vive la constante para no duplicar los "números mágicos".
 */
export const STANDARD_PRESET_VALUES = {
  name: 'Estándar',
  studyDurationMinutes: 25,
  shortBreakMinutes: 5,
  cyclesBeforeLongBreak: 4,
  longBreakMinutes: 35,
} as const;
