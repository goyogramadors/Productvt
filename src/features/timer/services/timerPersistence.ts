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

/** Alias explícito para el paso 1 de `ActiveSessionRecoveryService` (docs/04-SINCRONIZACION.md
 * sección 8.1): "por si quedó un residuo de una sesión ya cerrada". */
export function clearCachedActiveSession(): Promise<void> {
  return cacheActiveSession(null);
}

/**
 * `productvt.clockOffsetMs` (docs/02-DOMINIO.md sección 6.4): último `clockOffsetMs` calculado por
 * `computeClockOffsetMs` (`domain/rules/clock-offset.ts`), recalculado en cada checkpoint/snapshot
 * confirmado (nunca una sola vez al arrancar, docs/04-SINCRONIZACION.md sección 6.3). `0` por
 * defecto (reloj sin corregir) cuando todavía no hay ningún valor persistido.
 */
export async function readClockOffsetMs(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.clockOffsetMs);
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

export async function writeClockOffsetMs(value: number): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.clockOffsetMs, String(value));
  } catch {
    // Conveniencia, no fuente de verdad: un fallo de escritura no debe romper nada.
  }
}
