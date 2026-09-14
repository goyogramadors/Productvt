import { collection, doc, type CollectionReference, type DocumentReference } from 'firebase/firestore';

import type { ActiveSession } from '@/domain/entities/active-session';
import type { Category } from '@/domain/entities/category';
import type { InvisibleEvent } from '@/domain/entities/invisible-event';
import type { Preset } from '@/domain/entities/preset';
import type { SessionRecord } from '@/domain/entities/session-record';
import type { UserProfile, UserSettings } from '@/domain/entities/user-profile';
import type { WeeklyGoal } from '@/domain/entities/weekly-goal';

import { db } from './client';

/**
 * Helpers tipados para las rutas de Firestore bajo `users/{uid}/...`
 * (ARCHITECTURE.md sección 16). Este es el ÚNICO archivo que debe construir referencias crudas de
 * Firestore por nombre de colección/documento; los repositorios de cada agregado
 * (`src/repositories/*`, decisiones-tomadas.md punto 9) consumen estos helpers en vez de escribir
 * strings de ruta sueltos, y ningún componente de UI debe llamar a `collection`/`doc` directamente
 * (ARCHITECTURE.md sección 15.3).
 *
 * Las referencias se castean a su tipo de entidad para dar autocompletado en los repositorios; no
 * validan el shape en runtime (eso lo hace cada repositorio al mapear snapshots). Si más adelante
 * se necesita validación estricta, se puede añadir `withConverter` sin cambiar esta API pública.
 */

export const PROFILE_DOC_ID = 'main';
export const SETTINGS_DOC_ID = 'main';

function userDocRef(uid: string): DocumentReference {
  return doc(db, 'users', uid);
}

export function categoriesCollection(uid: string): CollectionReference<Category> {
  return collection(db, 'users', uid, 'categories') as CollectionReference<Category>;
}

export function categoryDocRef(uid: string, categoryId: string): DocumentReference<Category> {
  return doc(db, 'users', uid, 'categories', categoryId) as DocumentReference<Category>;
}

export function presetsCollection(uid: string): CollectionReference<Preset> {
  return collection(db, 'users', uid, 'presets') as CollectionReference<Preset>;
}

export function presetDocRef(uid: string, presetId: string): DocumentReference<Preset> {
  return doc(db, 'users', uid, 'presets', presetId) as DocumentReference<Preset>;
}

/**
 * Colección única que mezcla `StudySession` e `InverseSession`, discriminadas por su campo
 * `type` (ARCHITECTURE.md sección 16.2: simplifica consultas de calendario y estadísticas).
 * Alias de `SessionRecord` (docs/02-DOMINIO.md sección 2.3/2.4, `src/domain/entities/session-record.ts`,
 * Fase 5): la unión vive en el dominio para que las reglas puras de historial no dependan de este
 * archivo de infraestructura.
 */
export type SessionDocument = SessionRecord;

export function sessionsCollection(uid: string): CollectionReference<SessionDocument> {
  return collection(db, 'users', uid, 'sessions') as CollectionReference<SessionDocument>;
}

export function sessionDocRef(uid: string, sessionId: string): DocumentReference<SessionDocument> {
  return doc(db, 'users', uid, 'sessions', sessionId) as DocumentReference<SessionDocument>;
}

export function eventsCollection(uid: string): CollectionReference<InvisibleEvent> {
  return collection(db, 'users', uid, 'events') as CollectionReference<InvisibleEvent>;
}

export function eventDocRef(uid: string, eventId: string): DocumentReference<InvisibleEvent> {
  return doc(db, 'users', uid, 'events', eventId) as DocumentReference<InvisibleEvent>;
}

export function goalsCollection(uid: string): CollectionReference<WeeklyGoal> {
  return collection(db, 'users', uid, 'goals') as CollectionReference<WeeklyGoal>;
}

export function goalDocRef(uid: string, goalId: string): DocumentReference<WeeklyGoal> {
  return doc(db, 'users', uid, 'goals', goalId) as DocumentReference<WeeklyGoal>;
}

export function profileDocRef(uid: string): DocumentReference<UserProfile> {
  return doc(db, 'users', uid, 'profile', PROFILE_DOC_ID) as DocumentReference<UserProfile>;
}

/**
 * Documento de settings del usuario (`UserSettings`, sonido/visual/notificaciones). El singleton
 * de sesión activa NO vive aquí — el comentario as-built que lo anticipaba como
 * `activeStudySessionRef` queda superado por `activeSessionDocRef` (docs/02-DOMINIO.md sección
 * 2.1/5.1).
 */
export function settingsDocRef(uid: string): DocumentReference<UserSettings> {
  return doc(db, 'users', uid, 'settings', SETTINGS_DOC_ID) as DocumentReference<UserSettings>;
}

export const ACTIVE_SESSION_DOC_ID = 'session';

/**
 * Singleton `users/{uid}/active/session` (docs/02-DOMINIO.md sección 2.5/5.1): la fuente de verdad
 * de "hay algo corriendo" para todos los dispositivos del usuario. Solo `ActiveSessionRepository`
 * debe usar esta referencia.
 */
export function activeSessionDocRef(uid: string): DocumentReference<ActiveSession> {
  return doc(db, 'users', uid, 'active', ACTIVE_SESSION_DOC_ID) as DocumentReference<ActiveSession>;
}

export { userDocRef };
