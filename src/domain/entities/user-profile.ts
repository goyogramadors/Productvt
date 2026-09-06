/**
 * Usuario autenticado y su configuración de identidad persistente (SPEC.md sección 11.4;
 * ARCHITECTURE.md sección 9.1). Documento persistido en `users/{uid}/profile/main`.
 */
export interface UserProfile {
  /** Coincide con el uid de Firebase Auth. */
  id: string;
  email: string;
  displayName?: string;
  timezone: string;
  /** Frase editable mostrada en el panel de confirmación de cancelación (SPEC.md sección 20.2). */
  cancellationPhrase: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Frase por defecto para todo perfil nuevo, editable luego desde Configuración. Re-exportada aquí
 * por compatibilidad con el as-built de Fase 1-2; el texto vive en `src/i18n/es.ts`
 * (docs/02-DOMINIO.md sección 3.2, nota de vocabulario — corrige "de este bloque" a "de esta
 * sesión"). Los perfiles ya creados conservan su frase hasta que el usuario la edite.
 */
export { DEFAULT_CANCELLATION_PHRASE } from '@/i18n/es';

/**
 * Preferencias de sonido sincronizadas (SPEC.md secciones 28.3 y 11.4).
 *
 * NOTA: la selección de un archivo de audio propio del dispositivo (expo-document-picker) es una
 * preferencia LOCAL por dispositivo (AsyncStorage), NO sincronizada en Firestore en V1
 * (decisiones-tomadas.md punto 18, restricción de "sin costo monetario adicional" — evita Storage
 * de pago). Por eso no aparece como campo aquí; una fase posterior la modela en
 * `infrastructure/storage` junto con la preferencia local correspondiente.
 */
export interface SoundPreferences {
  enabled: boolean;
  studyFinishedSoundId: string;
  breakFinishedSoundId: string;
  inverseReminderSoundId: string;
  cancelledSoundId?: string;
  /** Volumen relativo 0..1 (SPEC.md sección 28.3), donde la plataforma lo permita. */
  volume: number;
}

/** Preferencias visuales (SPEC.md secciones 29 y 39). */
export interface VisualPreferences {
  colorScheme: 'light' | 'dark' | 'system';
  celebrationEffectsEnabled: boolean;
  reduceMotion: boolean;
}

/**
 * Configuración general del usuario, separada del perfil de identidad
 * (ARCHITECTURE.md sección 16, documento `settings/main`). Documento persistido en
 * `users/{uid}/settings/main`.
 */
export interface UserSettings {
  userId: string;
  soundPreferences: SoundPreferences;
  visualPreferences: VisualPreferences;
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
