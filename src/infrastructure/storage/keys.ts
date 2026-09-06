/**
 * Claves de almacenamiento local (docs/02-DOMINIO.md sección 6.4). AsyncStorage en nativo; en web,
 * la misma API sobre `localStorage` (ya lo resuelve `@react-native-async-storage/async-storage`
 * por su cuenta). Centralizadas aquí para que ningún módulo repita el string suelto.
 */
export const STORAGE_KEYS = {
  /** `DeviceIdentity` serializado — todas las plataformas. */
  deviceIdentity: 'productvt.deviceIdentity',
  /** Último `ActiveSession` conocido (acelera el arranque del dominante; la verdad es Firestore). */
  activeSessionCache: 'productvt.activeSessionCache',
  /** Último `clockOffset` calculado (Fase 4b) — todas las plataformas. */
  clockOffsetMs: 'productvt.clockOffsetMs',
  /** URI del audio propio elegido con `expo-document-picker` (D18: local, no sincronizado) — solo Android. */
  customSoundUri: 'productvt.customSoundUri',
  /** Última pestaña visitada (conveniencia) — todas las plataformas. */
  lastRoute: 'productvt.lastRoute',
} as const;
