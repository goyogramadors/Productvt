import type { SessionDeviceInfo } from './study-session';

/**
 * Nombre canónico `status` por decisiones-tomadas.md punto 12. `'interrupted'` queda reservado
 * (docs/02-DOMINIO.md sección 8, REV-MEDIA-8): ningún flujo de V1 lo produce — no hay una noción
 * de "interrupción" distinta de cancelar, expirar por zombie o el auto-cierre en `2·T`.
 */
export type InverseSessionStatus = 'active' | 'completed' | 'cancelled' | 'interrupted';

/**
 * Sesión de ocio / anti-estudio (SPEC.md secciones 21 y 22.3; ARCHITECTURE.md sección 9.5).
 * Documento persistido en `users/{uid}/sessions/{sessionId}` con `type: 'inverse'`, en la misma
 * colección que `StudySession` (ARCHITECTURE.md sección 16.2).
 *
 * Regla de agregación (ARCHITECTURE.md sección 18.9): las estadísticas de ocio usan
 * `totalElapsedSeconds` (no existe un "tiempo efectivo" separado para bloques inversos).
 */
export interface InverseSession {
  id: string;
  userId: string;
  type: 'inverse';
  name: string;
  categoryId: string;
  categoryNameSnapshot: string;
  /** Histórico únicamente, ver la misma nota en `study-session.ts` sobre decisiones-tomadas.md punto 6. */
  colorSnapshot: string;
  startedAt: string;
  endedAt?: string;
  /**
   * Duración objetivo definida por el usuario al iniciar (SPEC.md sección 21.3). El temporizador
   * NO se autodetiene al alcanzarla: sigue corriendo hasta un tope de `2 * targetDurationSeconds`,
   * donde se fuerza el cierre automático y se guarda igual el bloque (decisiones-tomadas.md
   * punto 4). Al alcanzar este valor (antes del tope) se dispara una notificación de "meta
   * alcanzada", pero la sesión sigue activa.
   */
  targetDurationSeconds: number;
  totalElapsedSeconds: number;
  /** Nombre canónico `remindersTriggered` (no `reminderCount`) por decisiones-tomadas.md punto 11. */
  remindersTriggered: number;
  status: InverseSessionStatus;
  /**
   * ADICIÓN de esta fase (docs/02-DOMINIO.md sección 3.3): `true` si el cierre fue forzado por el
   * tope `2 * targetDurationSeconds` (docs/03-CRONOMETRO.md sección 12.3), `false` en cierre manual
   * o cancelación. Un lector que no encuentre este campo en un documento antiguo lo trata como `false`.
   */
  autoFinished: boolean;
  /** ADICIÓN de esta fase: paridad con `StudySession.deviceInfo` para diagnóstico. */
  deviceInfo?: SessionDeviceInfo;
  createdAt: string;
  updatedAt: string;
}
