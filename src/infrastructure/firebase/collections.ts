import { collection, doc, type CollectionReference, type DocumentReference } from 'firebase/firestore';

import type { Category } from '@/domain/entities/category';
import type { InverseSession } from '@/domain/entities/inverse-session';
import type { InvisibleEvent } from '@/domain/entities/invisible-event';
import type { Preset } from '@/domain/entities/preset';
import type { StudySession } from '@/domain/entities/study-session';
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
 */
export type SessionDocument = StudySession | InverseSession;

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
 * Documento de settings del usuario. En una fase posterior (núcleo del timer /
 * ARCHITECTURE.md sección 26.3) este mismo documento aloja además la referencia ligera a la
 * sesión de estudio activa (`activeStudySessionRef`) usada por el modelo dominante/espectador
 * (decisiones-tomadas.md puntos 14-16); esa forma extendida se tipará junto con esa fase para no
 * anticipar aquí un esquema que todavía puede cambiar.
 */
export function settingsDocRef(uid: string): DocumentReference<UserSettings> {
  return doc(db, 'users', uid, 'settings', SETTINGS_DOC_ID) as DocumentReference<UserSettings>;
}

export { userDocRef };
