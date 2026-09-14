import type { InverseSession } from './inverse-session';
import type { StudySession } from './study-session';

/**
 * Unión discriminada por `type` de los dos documentos que puede tener `sessions/{sessionId}`
 * (docs/02-DOMINIO.md secciones 2.3/2.4/5.1). Se define aquí, en el dominio puro, para que las
 * funciones de `src/domain/rules/session-history.ts` (Fase 5, historial) puedan tiparse sin
 * importar `src/infrastructure/firebase/collections.ts` (ARCHITECTURE.md sección 2/30.4: el
 * dominio nunca importa Firebase). `SessionDocument`, ya as-built en `collections.ts` desde la
 * Fase 1, se redefine en ese archivo como alias de este mismo tipo para no duplicar la unión.
 */
export type SessionRecord = StudySession | InverseSession;
