import { AppState, type AppStateStatus } from 'react-native';
import { create } from 'zustand';

import { recoverActiveSession } from '@/application/coordinators/ActiveSessionRecoveryService';
import type { ActiveSession, DeviceRole } from '@/domain/entities/active-session';
import type { DeviceIdentity } from '@/domain/entities/device-identity';
import { resolveDeviceRole } from '@/domain/entities/device-identity';
import { computeClockOffsetMs } from '@/domain/rules/clock-offset';
import { getOrCreateDeviceIdentity } from '@/infrastructure/device/deviceIdentity';
import { subscribeActiveSession } from '@/repositories/active-session/activeSessionRepository';
import {
  cacheActiveSession,
  readCachedActiveSession,
  readClockOffsetMs,
  writeClockOffsetMs,
} from '@/features/timer/services/timerPersistence';

/**
 * Estado en vivo del singleton `active/session` (docs/02-DOMINIO.md sección 2.5). Store fino: solo
 * hidratación y estado — la lógica de negocio (transiciones, validaciones) vive en los
 * coordinadores de `src/application/coordinators/` y se invoca desde los hooks de
 * `src/features/timer/hooks/`, nunca aquí (ARCHITECTURE.md sección 2.2).
 *
 * Fase 4b (docs/04-SINCRONIZACION.md): `role` se recalcula con `resolveDeviceRole` cada vez que
 * cambia `active` o `device` — nunca se lee ni escribe como un campo propio de Firestore, es
 * siempre una función pura del documento remoto más la identidad local (sección 4.1). `clockOffsetMs`
 * se recalcula en cada snapshot confirmado por el servidor (sección 6.3) y se persiste en
 * `productvt.clockOffsetMs` — nunca se calcula una sola vez al arrancar.
 */

function computeRole(active: ActiveSession | null, device: DeviceIdentity | null): DeviceRole | null {
  return active && device ? resolveDeviceRole(active, device) : null;
}

interface TimerState {
  device: DeviceIdentity | null;
  active: ActiveSession | null;
  /** `'dominant' | 'spectator' | null` (sin sesión activa) — recalculado en cada cambio de `active`/`device`. */
  role: DeviceRole | null;
  /** `Date.now() + clockOffsetMs` es el único `nowMs` correcto (docs/04-SINCRONIZACION.md sección 6). */
  clockOffsetMs: number;
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
  role: null,
  clockOffsetMs: 0,
  isHydrating: true,
  error: null,

  initialize: (uid) => {
    let cancelled = false;

    async function bootstrap() {
      const [device, cachedActive, clockOffsetMs] = await Promise.all([
        getOrCreateDeviceIdentity(),
        readCachedActiveSession(),
        readClockOffsetMs(),
      ]);
      if (cancelled) return;
      set((state) => ({
        device,
        clockOffsetMs,
        active: state.active ?? cachedActive,
        role: computeRole(state.active ?? cachedActive, device),
      }));

      await runRecovery(device, clockOffsetMs);
    }

    // (a) Arranque en frío (docs/04-SINCRONIZACION.md sección 8, punto a).
    async function runRecovery(device: DeviceIdentity, clockOffsetMs: number) {
      try {
        const outcome = await recoverActiveSession(uid, device, clockOffsetMs);
        if (cancelled) return;
        if (outcome.kind === 'hydrated') {
          set({ active: outcome.active, role: outcome.role, isHydrating: false });
        } else {
          // 'idle' o 'closed_lazily': no queda sesión activa.
          set({ active: null, role: null, isHydrating: false });
        }
      } catch {
        // Sin red y sin caché útil: el `onSnapshot` de abajo resuelve `isHydrating` en cuanto pueda.
      }
    }

    void bootstrap();

    const unsubscribe = subscribeActiveSession(
      uid,
      (active, meta) => {
        if (cancelled) return;
        set((state) => ({
          active,
          role: computeRole(active, state.device),
          isHydrating: false,
          error: null,
        }));
        void cacheActiveSession(active);

        // Recálculo de `clockOffsetMs` en CADA snapshot confirmado por el servidor (nunca una sola
        // vez al arrancar, docs/04-SINCRONIZACION.md sección 6.1/6.3): cubre tanto al espectador
        // como al dominante, que también recibe sus propios checkpoints por este mismo `onSnapshot`.
        if (active && meta.isConfirmedByServer) {
          const newOffset = computeClockOffsetMs(active.lastCheckpointAt, Date.now());
          set({ clockOffsetMs: newOffset });
          void writeClockOffsetMs(newOffset);
        }
      },
      (error) => {
        if (cancelled) return;
        set({ isHydrating: false, error: error.message });
      }
    );

    // (b) Vuelta a primer plano (docs/04-SINCRONIZACION.md sección 8, punto b): la sesión pudo
    // haber vencido/zombeado mientras la app estaba en segundo plano; también cubre en la práctica
    // el punto (c) (reconexión de red), porque `AppState` suele pasar a `active` cuando el usuario
    // vuelve a la app tras recuperar señal.
    const handleAppStateChange = (status: AppStateStatus) => {
      if (status !== 'active' || cancelled) return;
      void (async () => {
        const device = get().device ?? (await getOrCreateDeviceIdentity());
        try {
          await recoverActiveSession(uid, device, get().clockOffsetMs);
        } catch {
          // Sin red: el `onSnapshot` (si reconecta) sigue siendo la fuente de verdad en vivo.
        }
      })();
    };
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      cancelled = true;
      appStateSubscription.remove();
      unsubscribe();
    };
  },

  setActive: (active) => {
    set((state) => ({ active, role: computeRole(active, state.device) }));
    void cacheActiveSession(active);
  },

  setError: (message) => set({ error: message }),

  reset: () => set({ active: null, role: null, isHydrating: true, error: null }),
}));
