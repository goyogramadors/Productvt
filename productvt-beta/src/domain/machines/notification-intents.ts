/**
 * Instrucciones de notificación que emiten las máquinas de estado (docs/03-CRONOMETRO.md sección
 * 11 para estudio, sección 12.3 para el inverso). Son datos puros, no efectos: la máquina describe
 * QUÉ programar/cancelar/sonar; `timerNotificationService.ts`/`timerAudioService.ts`
 * (`src/features/timer/services/`) son quienes ejecutan la instrucción de verdad contra
 * `expo-notifications`/`expo-audio`, resolviendo el identificador determinístico
 * `${sessionId}:${purpose}` y el sonido configurado en `UserSettings.soundPreferences`.
 */

export type NotificationPurpose =
  | 'study_segment_finished'
  | 'study_ack_expiration'
  | 'break_selection_expiration'
  | 'break_segment_finished'
  | 'break_ack_expiration'
  | 'lunch_finished'
  | 'inverse_reminder'
  | 'inverse_target_reached'
  | 'inverse_hard_cap';

export type SoundEffect =
  | 'study_finished'
  | 'break_finished'
  | 'study_time_alarm'
  | 'lunch_finished'
  | 'cancelled'
  | 'inverse_reminder';

export type NotificationIntent =
  | { action: 'schedule'; purpose: NotificationPurpose; fireAtIso: string }
  | { action: 'cancel'; purpose: NotificationPurpose }
  | { action: 'cancel_all' }
  | { action: 'play_sound'; sound: SoundEffect };

export function scheduleIntent(purpose: NotificationPurpose, fireAtIso: string): NotificationIntent {
  return { action: 'schedule', purpose, fireAtIso };
}

export function cancelIntent(purpose: NotificationPurpose): NotificationIntent {
  return { action: 'cancel', purpose };
}

export function cancelAllIntent(): NotificationIntent {
  return { action: 'cancel_all' };
}

export function playSoundIntent(sound: SoundEffect): NotificationIntent {
  return { action: 'play_sound', sound };
}
