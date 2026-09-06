import { AppState, type AppStateStatus } from 'react-native';
import { create } from 'zustand';

import { recoverActiveSessionIfStale } from '@/application/coordinators/ActiveTimerRecoveryService';
import type { ActiveSession } from '@/domain/entities/active-session';
import type { DeviceIdentity } from '@/domain/entities/device-identity';
import { getOrCreateDeviceIdentity } from '@/infrastructure/device/deviceIdentity';
import { subscribeActiveSession } from '@/repositories/active-session/activeSessionRepository';
import { cacheActiveSession, readCachedActiveSession } from '@/features/timer/services/timerPersistence';

/**
 * Estado en vivo del singleton `active/session` (docs/02-DOMINIO.md sección 2.5). Store fino: solo
 * hidratación y estado — la lógica de negocio (transiciones, validaciones) vive en los
 * coordinadores de `src/application/coordinators/` y se invoca desde los hooks de
 * `src/features/timer/hooks/`, nunca aquí (ARCHITECTURE.md sección 2.2).
 *
 * LÍMITE DE FASE (4a, no 4b): no hay campo de `role` (`dominant`/`spectator`) derivado en el store
 * todavía — `useActiveTimer` asume que el dispositivo actual siempre es el dominante de su propia
 * sesión. La resolución de rol (`resolveDeviceRole`, ya en `domain/entities/device-identity.ts`)
 * queda lista para que Fase 4b la use sin tocar este store.
 */

interface TimerState {
  device: DeviceIdentity | null;
  active: ActiveSession | null;
  /** `true` hasta que se resuelve el primer snapshot real de Firestore (la caché local no cuenta). */
  isHydrating: boolean;
  error: string | null;
}

interface TimerActions {
  /** Debe llamarse una única vez por sesión de usuario autenticado. Devuelve `unsubscribe`. */
  initialize: (uid: string) => () => void;
  setActive: (active: ActiveSession | null) => void;
  setError: (message: string | null) => void;
  reset: () => void;
}

type TimerStore = TimerState & TimerActions;

export const useTimerStore = create<TimerStore>((set, get) => ({
  device: null,
  active: null,
  isHydrating: true,
  error: null,

  initialize: (uid) => {
    let cancelled = false;

    void getOrCreateDeviceIdentity().then((device) => {
      if (!cancelled) set({ device });
    });

    void readCachedActiveSession().then((cached) => {
      if (!cancelled && cached && get().isHydrating) set({ active: cached });
    });

    const unsubscribe = subscribeActiveSession(
      uid,
      (active) => {
        if (cancelled) return;
        set({ active, isHydrating: false, error: null });
        void cacheActiveSession(active);
      },
      (error) => {
        if (cancelled) return;
        set({ isHydrating: false, error: error.message });
      }
    );

    // Cierre perezoso de sesiones vencidas/zombie (sección 9.2/9.3): se dispara al hidratar y cada
    // vez que la app vuelve a primer plano (pudo haber estado cerrada exactamente cuando venció una
    // ventana de respuesta o durante 24h). El resultado (si cierra algo) llega igual por el
    // `onSnapshot` de arriba.
    void recoverActiveSessionIfStale(uid).catch(() => undefined);

    const handleAppStateChange = (status: AppStateStatus) => {
      if (status === 'active' && !cancelled) void recoverActiveSessionIfStale(uid).catch(() => undefined);
    };
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      cancelled = true;
      appStateSubscription.remove();
      unsubscribe();
    };
  },

  setActive: (active) => {
    set({ active });
    void cacheActiveSession(active);
  },

  setError: (message) => set({ error: message }),

  reset: () => set({ active: null, isHydrating: true, error: null }),
}));
