import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';

import { STORAGE_KEYS } from '@/infrastructure/storage/keys';

/**
 * Audio propio del dispositivo (decisiones-tomadas.md punto 18: preferencia LOCAL por dispositivo,
 * no sincronizada — evita costo de Storage en V1). Único archivo que llama a
 * `expo-document-picker`/`expo-audio` para esto.
 *
 * El catálogo de sonidos predefinidos (`features/settings/domain/sound-catalog.ts`) todavía no
 * tiene archivos de audio propios embebidos en `assets/` (es un catálogo de ids/etiquetas, sin
 * binarios de sonido reales) — reproducirlos queda pendiente de que el dueño del producto agregue
 * esos assets; mientras tanto, la alerta audible real la da la notificación local con sonido por
 * defecto del sistema (`timerNotificationService.ts`). Lo que SÍ es 100% funcional hoy, sin
 * ningún asset pendiente, es reproducir el archivo que el propio usuario elige aquí.
 */

let cachedPlayer: AudioPlayer | null = null;

export async function getCustomSoundUri(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.customSoundUri);
  } catch {
    return null;
  }
}

export async function clearCustomSoundUri(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.customSoundUri).catch(() => undefined);
}

export interface PickCustomSoundResult {
  uri: string;
  name: string;
}

/**
 * Abre el selector de archivos del sistema restringido a audio (solo Android, D18). Devuelve
 * `null` si el usuario cancela. Persiste la URI elegida para uso futuro (`getCustomSoundUri`).
 */
export async function pickCustomSoundFile(): Promise<PickCustomSoundResult | null> {
  if (Platform.OS !== 'android') return null;
  const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  await AsyncStorage.setItem(STORAGE_KEYS.customSoundUri, asset.uri);
  return { uri: asset.uri, name: asset.name };
}

/** Reproduce el audio propio elegido por el usuario, si hay uno configurado. No-op si no hay ninguno. */
export async function playCustomSound(volume = 1): Promise<void> {
  if (Platform.OS === 'web') return;
  const uri = await getCustomSoundUri();
  if (!uri) return;
  try {
    cachedPlayer?.remove();
    cachedPlayer = createAudioPlayer({ uri });
    cachedPlayer.volume = Math.min(1, Math.max(0, volume));
    cachedPlayer.play();
  } catch {
    // Un archivo movido/borrado por el sistema no debe romper el cronómetro: se ignora y la
    // notificación local (sonido por defecto) sigue siendo la alerta real.
  }
}

/** Solo para tests/HMR: libera el reproductor cacheado. */
export function releaseCustomSoundPlayer(): void {
  cachedPlayer?.remove();
  cachedPlayer = null;
}
