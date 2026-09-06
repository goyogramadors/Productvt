import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import type { DeviceIdentity } from '@/domain/entities/device-identity';
import { STORAGE_KEYS } from '@/infrastructure/storage/keys';

/**
 * Adaptador de infraestructura para `DeviceIdentity` (docs/02-DOMINIO.md sección 3.5/6.4): genera
 * un `deviceId` uuid v4 la primera vez que la app arranca en este dispositivo y lo persiste en
 * `productvt.deviceIdentity`. Reinstalar la app genera un `deviceId` nuevo — el singleton remoto
 * sigue siendo la verdad y el dispositivo reinstalado arranca como espectador hasta tomar el
 * control (Fase 4b).
 *
 * Único archivo que debe llamar a `AsyncStorage`/`expo-crypto`/`expo-device` para esto: el resto de
 * la app consume `getOrCreateDeviceIdentity()`.
 */

let cached: DeviceIdentity | null = null;

function resolvePlatform(): DeviceIdentity['platform'] {
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'ios') return 'ios';
  return 'web';
}

function resolveDeviceName(): string | undefined {
  if (Platform.OS === 'web') return 'Navegador web';
  return Device.deviceName ?? undefined;
}

function resolveAppVersion(): string | undefined {
  return Constants.expoConfig?.version ?? undefined;
}

async function readStoredIdentity(): Promise<DeviceIdentity | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.deviceIdentity);
    if (!raw) return null;
    return JSON.parse(raw) as DeviceIdentity;
  } catch {
    return null;
  }
}

async function persistIdentity(identity: DeviceIdentity): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.deviceIdentity, JSON.stringify(identity));
}

/** Idempotente: crea la identidad la primera vez, la reutiliza (y la cachea en memoria) después. */
export async function getOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
  if (cached) return cached;

  const stored = await readStoredIdentity();
  if (stored) {
    cached = stored;
    return stored;
  }

  const identity: DeviceIdentity = {
    deviceId: Crypto.randomUUID(),
    platform: resolvePlatform(),
    deviceName: resolveDeviceName(),
    appVersion: resolveAppVersion(),
    createdAt: new Date().toISOString(),
  };
  await persistIdentity(identity);
  cached = identity;
  return identity;
}

/** Solo para tests: limpia la identidad cacheada en memoria entre corridas. */
export function __resetDeviceIdentityCacheForTests(): void {
  cached = null;
}
