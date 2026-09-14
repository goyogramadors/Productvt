/**
 * Copys en español para el cronómetro (docs/02-DOMINIO.md sección 1.1, tabla de mapeo
 * obligatoria; brief §8 citado por esa misma sección para mover aquí los textos de usuario).
 *
 * Vocabulario canónico que toda UI de esta fase debe respetar:
 * - "sesión" = el `StudySession` completo (arranca con el formulario inicial, termina
 *   completada/cancelada/expirada).
 * - "bloque" = cada tramo de estudio de ~25 min (`StudySegment`/`cycleNumber` en el código).
 * La palabra "ciclo" no se usa en copys para el usuario. Los identificadores de código
 * (`cyclesCompleted`, `cycleNumber`, etc.) no cambian — esto es solo texto para humanos.
 */

/**
 * Frase por defecto del panel de doble confirmación de cancelación (docs/02-DOMINIO.md sección
 * 3.2, nota de vocabulario: corrige el copy as-built "de este bloque" a "de esta sesión", porque
 * lo que se cancela con este panel es la sesión completa — aunque, tras la confirmación de la
 * pregunta 25 (docs/03-CRONOMETRO.md sección 8.3), solo se pierda el tiempo efectivo del bloque en
 * curso; los bloques ya completados quedan a salvo). Editable por el usuario en Configuración.
 */
export const DEFAULT_CANCELLATION_PHRASE =
  '¿Seguro que quieres abandonar? Todo tu progreso de esta sesión se perderá.';

export const timerCopy = {
  cancelSession: {
    title: 'Cancelar sesión',
    firstConfirmLocked: (seconds: number) => `Esperá ${seconds} s para confirmar…`,
    firstConfirmReady: 'Cancelar sesión',
    secondConfirmLocked: (seconds: number) => `¿Seguro? Esperá ${seconds} s…`,
    secondConfirmReady: 'Sí, cancelar sesión',
    dismiss: 'Volver',
    editPhrase: 'Editar frase',
  },
  breakSelection: {
    title: 'Elegí qué hacer con tu descanso',
    takeSuggested: (minutes: number) => `Descansar ${minutes} min`,
    custom: 'Personalizado',
    skip: 'Saltar',
    lunch: 'Almuerzo',
    endSession: 'Terminar sesión',
  },
  waitingBreakCompleted: {
    continueStudy: 'Empezar bloque',
    endSession: 'Terminar sesión',
  },
  lunch: {
    button: 'Almuerzo',
    running: 'Almuerzo en curso',
    unavailable: (cyclesLeft: number) =>
      cyclesLeft <= 1
        ? 'Disponible después de 1 bloque más'
        : `Disponible después de ${cyclesLeft} bloques más`,
  },
  inverse: {
    cancelTitle: '¿Terminar sin guardar como completado?',
    cancelConfirm: 'Sí, terminar',
    cancelDismiss: 'Seguir',
    targetReachedNotificationTitle: 'Meta alcanzada',
    hardCapNotificationTitle: 'Tiempo libre registrado',
  },
  spectator: {
    banner: 'Estás viendo esta sesión desde otro dispositivo (modo espectador). Tocá "Tomar el control" para poder accionarla desde acá.',
    requestControlButton: 'Tomar el control',
    webReadOnly: 'La versión web solo puede ver el cronómetro en vivo. Iniciá o accioná la sesión desde el dispositivo Android.',
  },
  handoff: {
    title: '¿Cambiar de dominante?',
    bodyAsRequester: 'Pediste tomar el control del cronómetro desde este dispositivo.',
    bodyAsDominant: (deviceName: string) => `${deviceName} quiere tomar el control del cronómetro.`,
    confirm: 'Sí',
    reject: 'No',
  },
} as const;

/**
 * Copys de las notificaciones locales programadas por transición (docs/03-CRONOMETRO.md sección
 * 11 para estudio, sección 12.3 para el inverso) — una entrada por `NotificationPurpose`
 * (`src/domain/machines/notification-intents.ts`).
 */
export const notificationCopy = {
  study_segment_finished: { title: 'Bloque terminado', body: 'Tocá para ver tu descanso.' },
  study_ack_expiration: { title: '¿Seguís ahí?', body: 'Tenés poco tiempo para responder antes de que la sesión expire.' },
  break_selection_expiration: { title: 'Elegí tu descanso', body: 'Tenés poco tiempo para elegir antes de que la sesión expire.' },
  break_segment_finished: { title: 'Descanso terminado', body: 'Toca estudiar.' },
  break_ack_expiration: { title: 'Toca estudiar', body: 'Tenés poco tiempo para responder antes de que la sesión expire.' },
  lunch_finished: { title: 'Almuerzo terminado', body: 'Volvé a tu sesión cuando quieras.' },
  inverse_reminder: { title: 'Tiempo libre en curso', body: 'Seguís en tu bloque inverso.' },
  inverse_target_reached: { title: 'Meta alcanzada', body: 'Podés finalizar cuando quieras.' },
  inverse_hard_cap: { title: 'Tiempo libre registrado', body: 'Se cerró automáticamente al llegar al tope.' },
} as const;

export const soundEffectCopy = {
  study_finished: { title: 'Bloque terminado', body: 'Tocá para ver tu descanso.' },
  break_finished: { title: 'Descanso terminado', body: 'Toca estudiar.' },
  study_time_alarm: { title: 'Toca estudiar', body: 'Tu descanso terminó.' },
  lunch_finished: { title: 'Almuerzo terminado', body: 'Volvé cuando quieras.' },
  cancelled: { title: 'Sesión cancelada', body: '' },
  inverse_reminder: { title: 'Tiempo libre en curso', body: '' },
} as const;
