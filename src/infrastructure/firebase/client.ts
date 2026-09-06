import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, initializeAuth, type Auth } from 'firebase/auth';
// `getReactNativePersistence` exists at runtime: `firebase/auth` re-exports everything from
// `@firebase/auth` (see node_modules/firebase/auth/dist/*/index.*), and Metro resolves that
// nested import against `@firebase/auth`'s own "react-native" export condition, which does
// declare the function. The `firebase` wrapper package's *types*, however, are resolved
// unconditionally by TypeScript to a generic .d.ts that omits it — a known upstream gap
// (https://github.com/firebase/firebase-js-sdk/issues/9316), not a real missing export.
// @ts-expect-error -- see comment above; remove once upstream types include this condition.
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Único punto de inicialización de Firebase (ARCHITECTURE.md sección 24.1 y 24.4: "nunca
 * inicializar Firebase en múltiples lugares dispersos"). Toda otra capa (auth, repositorios)
 * debe importar `app`/`auth`/`db` desde aquí, nunca llamar `initializeApp` por su cuenta.
 *
 * La configuración viene de variables de entorno EXPO_PUBLIC_* (ver `.env.example` en la raíz del
 * proyecto). Expo las inyecta en `process.env` en build/dev time sin necesidad de dotenv manual.
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

const REQUIRED_FIREBASE_ENV_VARS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
] as const;

function warnIfFirebaseConfigIncomplete(): void {
  const missing = REQUIRED_FIREBASE_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    // No lanzamos: dejamos que la app arranque y muestre pantallas no-auth (si las hay) en vez de
    // crashear en el import raíz. Cualquier llamada real a Firebase Auth/Firestore fallará con un
    // error claro de Firebase hasta que se completen las variables.
    console.warn(
      `[firebase] Faltan variables de entorno: ${missing.join(', ')}. ` +
        'Copia .env.example a .env y complétalas con la config de tu proyecto Firebase ' +
        '(Firebase Console > Configuración del proyecto > Tus apps > SDK setup and configuration).'
    );
  }
}

warnIfFirebaseConfigIncomplete();

export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

/**
 * `initializeAuth` solo puede llamarse una vez por `FirebaseApp`; con Fast Refresh en desarrollo
 * este módulo puede volver a evaluarse, así que si ya existe una instancia recurrimos a
 * `getAuth(app)` en vez de fallar con `auth/already-initialized`.
 */
function createAuth(): Auth {
  try {
    return initializeAuth(app, {
      persistence:
        Platform.OS === 'web' ? browserLocalPersistence : getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}

export const auth: Auth = createAuth();

export const db: Firestore = getFirestore(app);
