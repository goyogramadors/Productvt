import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { INVERSE_REMINDER_INTERVAL_SECONDS } from '@/domain/entities/active-session';
import type { NotificationIntent, NotificationPurpose } from '@/domain/machines/notification-intents';
import { notificationCopy, soundEffectCopy } from '@/i18n/es';

/**
 * Adaptador de infraestructura para las notificaciones locales de la tabla de
 * docs/03-CRONOMETRO.md sección 11 (y sección 12.3 para el inverso). Único archivo que llama a
 * `expo-notifications`. Nunca se invoca desde la UI directamente (sección 11, nota final): solo
 * `StudySessionCoordinator`/`InverseSessionCoordinator` traducen las `NotificationIntent[]` que
 * devuelve la máquina de estados a llamadas reales.
 *
 * Solo Android es dominante en V1 (decisiones-tomadas.md, "Alcance de plataformas"), así que esta
 * capa es un no-op en web — el espectador web no programa alarmas propias.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function buildIdentifier(sessionId: string, purpose: NotificationPurpose): string {
  return `${sessionId}:${purpose}`;
}

/** Debe llamarse una vez al montar la app (o antes de iniciar la primera sesión). No-op en web. */
export async function ensureNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function scheduleAt(
  sessionId: string,
  purpose: NotificationPurpose,
  fireAtIso: string,
  clockOffsetMs: number
): Promise<void> {
  const identifier = buildIdentifier(sessionId, purpose);
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined);
  const copy = notificationCopy[purpose];

  if (purpose === 'inverse_reminder') {
    // Recordatorio periódico "no exige respuesta" (docs/03-CRONOMETRO.md sección 12.3): una sola
    // notificación repetible cada 15 min, en vez de reprogramar una por una. El SO cuenta este
    // intervalo con su propio reloj (no hace falta `clockOffsetMs` para un `repeats: true` relativo
    // sin ancla absoluta).
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: { title: copy.title, body: copy.body, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: INVERSE_REMINDER_INTERVAL_SECONDS,
        repeats: true,
      },
    });
    return;
  }

  // `expo-notifications` con `TIME_INTERVAL` programa "N segundos desde ahora" contando con el
  // reloj PROPIO del sistema operativo (irrelevante si tiene o no `clockOffsetMs` — el SO no sabe
  // de Firestore). `fireAtIso`, en cambio, es un instante ya corregido (docs/04-SINCRONIZACION.md
  // sección 6): restar el `Date.now()` crudo de este dispositivo introduciría exactamente el error
  // de `clockOffsetMs` en el disparo. Restamos el "ahora" corregido para que N sea genuinamente
  // "segundos reales que faltan", que es lo que el temporizador del SO cuenta bien de cualquier forma.
  const nowMsValue = Date.now() + clockOffsetMs;
  const secondsUntilFire = Math.max(1, Math.round((Date.parse(fireAtIso) - nowMsValue) / 1000));
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title: copy.title, body: copy.body, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsUntilFire, repeats: false },
  });
}

async function cancelPurpose(sessionId: string, purpose: NotificationPurpose): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(buildIdentifier(sessionId, purpose)).catch(() => undefined);
}

/**
 * Alerta inmediata (docs/03-CRONOMETRO.md sección 4.1, filas T2/T8: "dispara sonido/alerta
 * inmediata"). Se implementa como una notificación con `trigger: null` (dispara ya) en vez de
 * `expo-audio`, porque el proyecto no tiene todavía archivos de sonido propios embebidos
 * (`assets/sounds/`, pendiente de diseño) y esta vía SÍ es real y funcional sin ellos: usa el
 * sonido por defecto del sistema. `timerAudioService.ts` complementa esto reproduciendo el archivo
 * de audio PROPIO del usuario cuando lo configuró (decisiones-tomadas.md punto 18).
 */
async function fireImmediateAlert(sound: keyof typeof soundEffectCopy): Promise<void> {
  const copy = soundEffectCopy[sound];
  await Notifications.scheduleNotificationAsync({
    content: { title: copy.title, body: copy.body, sound: true },
    trigger: null,
  });
}

/**
 * Aplica una lista de `NotificationIntent` contra `expo-notifications`. No-op en web.
 * `clockOffsetMs` (default `0`, docs/04-SINCRONIZACION.md sección 6) solo importa para `schedule`
 * — corrige el "ahora" que se resta de `fireAtIso` para no heredar el error de reloj del
 * dispositivo en el disparo de la alarma local.
 */
export async function applyNotificationIntents(
  sessionId: string,
  intents: readonly NotificationIntent[],
  clockOffsetMs = 0
): Promise<void> {
  if (Platform.OS === 'web') return;

  for (const intent of intents) {
    switch (intent.action) {
      case 'schedule':
        await scheduleAt(sessionId, intent.purpose, intent.fireAtIso, clockOffsetMs);
        break;
      case 'cancel':
        await cancelPurpose(sessionId, intent.purpose);
        break;
      case 'cancel_all':
        await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
        break;
      case 'play_sound':
        await fireImmediateAlert(intent.sound);
        break;
    }
  }
}
