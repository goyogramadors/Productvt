import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ActiveSession } from '@/domain/entities/active-session';
import { STORAGE_KEYS } from '@/infrastructure/storage/keys';

/**
 * Caché local de la última `ActiveSession` conocida (docs/02-DOMINIO.md sección 3.4/6.4):
 * "AsyncStorage solo acelera el arranque del dominante" — Firestore (`active/session`) sigue
 * siendo la fuente de verdad. Se usa para pintar el HUD del timer sin parpadeo mientras se resuelve
 * el primer `onSnapshot`, y se limpia en cuanto la sesión se cierra.
 */

export async function cacheActiveSession(active: ActiveSession | null): Promise<void> {
  try {
    if (!active) {
      await AsyncStorage.removeItem(STORAGE_KEYS.activeSessionCache);
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEYS.activeSessionCache, JSON.stringify(active));
  } catch {
    // La caché es una conveniencia, no la fuente de verdad: un fallo de escritura no debe romper nada.
  }
}

export async function readCachedActiveSession(): Promise<ActiveSession | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.activeSessionCache);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveSession;
  } catch {
    return null;
  }
}
