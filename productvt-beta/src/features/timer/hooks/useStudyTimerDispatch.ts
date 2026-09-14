import { useCallback, useState } from 'react';

import {
  dispatchStudyTimerEvent,
  type StudyTimerDispatchOutcome,
} from '@/application/coordinators/StudySessionCoordinator';
import type { ActiveStudySession } from '@/domain/entities/active-session';
import { canBeDominant } from '@/domain/entities/device-identity';
import type { StudyTimerEvent } from '@/domain/machines/study-timer-events';
import { requestControlOfActiveSession } from '@/repositories/active-session/activeSessionRepository';
import { useAuthStore } from '@/store/auth/authStore';
import { useTimerStore } from '@/features/timer/store/timerStore';

/**
 * Helper interno compartido por `useBreakSelection`, `useCancelStudySession` y `useLunchAction`
 * (evita repetir en cada uno el mismo plomería de uid/settings/coordinador/actualización del
 * store). No es un hook de la lista explícita de esta fase, pero es exactamente el tipo de
 * factorización que ARCHITECTURE.md sección 2.2 pide para mantener la UI delgada.
 *
 * Punto único de disciplina dominante/espectador (docs/04-SINCRONIZACION.md sección 4.2, sección
 * 5.2): un espectador no puede escribir transiciones de la máquina de estados. Las reglas de
 * seguridad no pueden impedir esto por su cuenta (no saben qué dispositivo físico escribe, sección
 * 11 de ese documento) — la disciplina real es de cliente. En vez de deshabilitar cada botón de
 * cada componente uno por uno, este hook intercepta el `dispatch`: si el rol no es dominante,
 * ningún evento de la máquina se envía — en su lugar, se dispara la solicitud de control
 * (`controlRequest`, sección 5.2), exactamente "espectador toca cualquier control deshabilitado".
 */
export function useStudyTimerDispatch() {
  const uid = useAuthStore((s) => s.user?.uid);
  const soundPreferences = useAuthStore((s) => s.settings?.soundPreferences);
  const setActive = useTimerStore((s) => s.setActive);
  const role = useTimerStore((s) => s.role);
  const device = useTimerStore((s) => s.device);
  const clockOffsetMs = useTimerStore((s) => s.clockOffsetMs);

  const [isDispatching, setIsDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dispatch = useCallback(
    async (active: ActiveStudySession, event: StudyTimerEvent): Promise<StudyTimerDispatchOutcome | null> => {
      if (!uid) {
        setError('Debes iniciar sesión.');
        return null;
      }

      if (role !== 'dominant') {
        // Espectador: el control aparece "deshabilitado" pero tocarlo pide el control en vez de
        // accionar nada (docs/04-SINCRONIZACION.md sección 5.2). Un espectador web nunca llega
        // aquí con `canBeDominant(device.platform)` en `true` (§5.1 punto 2 ya oculta ese botón),
        // así que este `if` es la red de seguridad, no el único punto de bloqueo.
        if (device && canBeDominant(device.platform)) {
          setIsDispatching(true);
          const result = await requestControlOfActiveSession(uid, {
            requesterDeviceId: device.deviceId,
            requesterPlatform: device.platform,
            requesterDeviceName: device.deviceName,
          });
          setIsDispatching(false);
          if (!result.success) setError(result.error.message);
        }
        return null;
      }

      setIsDispatching(true);
      setError(null);
      const result = await dispatchStudyTimerEvent({
        uid,
        active,
        event,
        soundEnabled: soundPreferences?.enabled ?? true,
        volume: soundPreferences?.volume ?? 1,
        clockOffsetMs,
      });
      setIsDispatching(false);

      if (!result.success) {
        setError(result.error.message);
        return null;
      }
      if (result.data.outcome === 'updated') setActive(result.data.active);
      if (result.data.outcome === 'closed' || result.data.outcome === 'closed_lazily') setActive(null);
      return result.data;
    },
    [uid, role, device, soundPreferences, clockOffsetMs, setActive]
  );

  return { dispatch, isDispatching, error, clearError: () => setError(null) };
}
