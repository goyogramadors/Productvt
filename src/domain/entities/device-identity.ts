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
 * plataformas"; docs/04-SINCRONIZACION.md sección 5.1). Cambiar esto en V1.1 ("web dominante") es
 * literalmente esta única línea más las dos condiciones ya documentadas de `firestore.rules`
 * (`requestFromAndroid()` y `deviceInfo.platform == 'android'` en `create`).
 */
export function canBeDominant(platform: DeviceIdentity['platform']): boolean {
  return platform === 'android';
}

/**
 * `null` si no hay sesión activa; `'dominant'` si `active.dominantDeviceId === device.deviceId`;
 * `'spectator'` en cualquier otro caso. Ningún dispositivo "sabe" su rol de antemano: se recalcula
 * cada vez que se lee el singleton (docs/04-SINCRONIZACION.md sección 4.1) — `timerStore.ts` lo
 * hace en cada `onSnapshot`, nunca lo memoriza como un campo propio que se podría desincronizar de
 * la verdad remota.
 */
export function resolveDeviceRole(active: ActiveSession | null, device: DeviceIdentity): DeviceRole | null {
  if (!active) return null;
  return active.dominantDeviceId === device.deviceId ? 'dominant' : 'spectator';
}
