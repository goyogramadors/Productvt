import { useCallback, useMemo, useState } from 'react';

import { canBeDominant } from '@/domain/entities/device-identity';
import {
  cancelControlRequest,
  requestControlOfActiveSession,
  takeoverActiveSession,
} from '@/repositories/active-session/activeSessionRepository';
import { useAuthStore } from '@/store/auth/authStore';
import { useTimerStore } from '@/features/timer/store/timerStore';

/**
 * Flujo completo de solicitud y cambio de dominante (docs/04-SINCRONIZACION.md sección 5): un
 * espectador Android pide el control tocando cualquier control deshabilitado (`requestControl`, ya
 * disparado por `useStudyTimerDispatch`/`useInverseTimer` — este hook expone además un botón
 * explícito "Tomar el control"); el MISMO diálogo se muestra en el dispositivo dominante y en el
 * espectador que pidió el control (sección 5.2/5.4); confirmar "Sí" en CUALQUIERA de los dos lados
 * ejecuta la MISMA transacción `validTakeover()` (sección 5.3: no es una carrera de UI, Firestore
 * serializa los commits); "No" del dominante borra la solicitud; la autoconfirmación del propio
 * solicitante es válida sin esperar respuesta del otro lado (sección 5.4).
 *
 * Restricción de plataforma (sección 5.1): un dispositivo web nunca puede pedir el control
 * (`canBeDominant('web') === false`) — `canRequestControl` ya lo excluye, así que el componente que
 * renderiza el botón "Tomar el control" puede confiar en este flag sin repetir la condición.
 */
export function useDominantHandoff() {
  const uid = useAuthStore((s) => s.user?.uid);
  const active = useTimerStore((s) => s.active);
  const device = useTimerStore((s) => s.device);
  const role = useTimerStore((s) => s.role);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const controlRequest = active?.controlRequest ?? null;
  const isRequester = !!controlRequest && !!device && controlRequest.requesterDeviceId === device.deviceId;

  const canRequestControl = useMemo(
    () => role === 'spectator' && !!device && canBeDominant(device.platform) && !controlRequest,
    [role, device, controlRequest]
  );

  const requestControl = useCallback(async () => {
    if (!uid || !device || !canBeDominant(device.platform)) return;
    setIsSubmitting(true);
    setError(null);
    const result = await requestControlOfActiveSession(uid, {
      requesterDeviceId: device.deviceId,
      requesterPlatform: device.platform,
      requesterDeviceName: device.deviceName,
    });
    setIsSubmitting(false);
    if (!result.success) setError(result.error.message);
  }, [uid, device]);

  /** "Sí" en cualquiera de los dos lados: misma transacción, sin importar quién la ejecuta (sección 5.3). */
  const confirmTakeover = useCallback(async () => {
    if (!uid || !controlRequest) return;
    setIsSubmitting(true);
    setError(null);
    const result = await takeoverActiveSession(uid, controlRequest.requesterDeviceId);
    setIsSubmitting(false);
    if (!result.success) setError(result.error.message);
  }, [uid, controlRequest]);

  /** "No" del dominante, o el propio solicitante retira su pedido (sección 5.4). */
  const rejectOrWithdraw = useCallback(async () => {
    if (!uid) return;
    setIsSubmitting(true);
    setError(null);
    const result = await cancelControlRequest(uid);
    setIsSubmitting(false);
    if (!result.success) setError(result.error.message);
  }, [uid]);

  return {
    role,
    isDialogVisible: !!controlRequest,
    isRequester,
    requesterDeviceName: controlRequest?.requesterDeviceName ?? null,
    canRequestControl,
    isSubmitting,
    error,
    clearError: () => setError(null),
    requestControl,
    confirmTakeover,
    rejectOrWithdraw,
  };
}
