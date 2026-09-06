import type { ActiveSession, DeviceId, DeviceRole } from './active-session';

/**
 * Identidad local del dispositivo (docs/02-DOMINIO.md sección 3.5). El valor en sí es "solo local,
 * nunca en Firestore como documento" (se persiste en `productvt.deviceIdentity`, ver
 * `src/infrastructure/device/deviceIdentity.ts`), pero el tipo y las funciones puras que razonan
 * sobre él viven en el dominio porque no dependen de AsyncStorage/Firebase.
 */
export interface DeviceIdentity {
  /** uuid v4, generado la primera vez que arranca la app en este dispositivo. */
  deviceId: DeviceId;
  platform: 'ios' | 'android' | 'web';
  deviceName?: string;
  appVersion?: string;
  createdAt: string;
}

/**
 * V1: solo Android puede ser dominante (docs/02-DOMINIO.md sección 3.5/7, D "Alcance de
 * plataformas"). Cambiar esto en V1.1 ("web dominante") es literalmente esta única línea más las
 * dos condiciones ya documentadas de `firestore.rules` (Fase 4b).
 */
export function canBeDominant(platform: DeviceIdentity['platform']): boolean {
  return platform === 'android';
}

/**
 * `null` si no hay sesión activa; `'dominant'` si `active.dominantDeviceId === device.deviceId`;
 * `'spectator'` en cualquier otro caso.
 *
 * LÍMITE DE FASE (4a, no 4b): esta fase no implementa el protocolo de cambio de dominante — todo
 * dispositivo que inicia una sesión escribe su propio `deviceId` como `dominantDeviceId` y esta
 * función siempre devuelve `'dominant'` para él mientras la sesión exista. La rama `'spectator'`
 * ya está completa y lista para cuando Fase 4b (`controlRequest`) empiece a producirla en la
 * práctica (p. ej. un segundo dispositivo que abre la app mientras el primero tiene una sesión
 * activa ya la ve como espectador hoy, aunque todavía no pueda pedir el control).
 */
export function resolveDeviceRole(active: ActiveSession | null, device: DeviceIdentity): DeviceRole | null {
  if (!active) return null;
  return active.dominantDeviceId === device.deviceId ? 'dominant' : 'spectator';
}
