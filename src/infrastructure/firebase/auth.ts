import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type Unsubscribe,
  type User as FirebaseUser,
} from 'firebase/auth';
import { Platform } from 'react-native';

import { type AsyncResult, err, ok } from '@/types/common';

import { auth } from './client';

/**
 * Adapter de Firebase Authentication (ARCHITECTURE.md sección 24.2: "login, register, logout,
 * auth state listener, Google sign-in"). Es la ÚNICA capa que importa `firebase/auth` fuera de
 * `client.ts`; el store (`store/auth/authStore.ts`) y los hooks de `features/auth` consumen
 * exclusivamente estas funciones, nunca el SDK de Firebase directo (mismo principio de
 * "nada habla directo con Firebase" que ARCHITECTURE.md sección 15.3 exige para Firestore).
 *
 * Todas las funciones devuelven `Result`/`AsyncResult` (types/common.ts) en vez de lanzar, para que
 * el store y la UI manejen errores de forma tipada y sin try/catch repetido.
 */

/** Error de autenticación con el código crudo de Firebase (`auth/...`) y un mensaje ya traducido. */
export class AuthError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

const FRIENDLY_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'El correo ingresado no es válido.',
  'auth/user-disabled': 'Esta cuenta fue deshabilitada.',
  'auth/user-not-found': 'No existe una cuenta con ese correo.',
  'auth/wrong-password': 'Contraseña incorrecta.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/too-many-requests': 'Demasiados intentos. Espera un momento antes de volver a intentar.',
  'auth/network-request-failed': 'Error de red. Revisa tu conexión e intenta de nuevo.',
  'auth/popup-closed-by-user': 'Se cerró la ventana de Google antes de completar el inicio de sesión.',
  'auth/cancelled-popup-request': 'Ya había una solicitud de inicio de sesión con Google en curso.',
  'auth/account-exists-with-different-credential':
    'Ya existe una cuenta con este correo usando otro método de acceso.',
  'auth/popup-blocked': 'El navegador bloqueó la ventana emergente de Google.',
  'auth/operation-not-supported-in-this-environment':
    'El inicio de sesión con Google no está disponible en este entorno.',
};

function mapFirebaseAuthError(error: unknown): AuthError {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : 'auth/unknown';
  const message = FRIENDLY_MESSAGES[code] ?? 'Ocurrió un error de autenticación. Intenta nuevamente.';
  return new AuthError(code, message);
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName?: string
): AsyncResult<FirebaseUser, AuthError> {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      // No bloqueamos el registro si esto falla; el nombre también puede completarse luego desde
      // Configuración. Los errores aquí son de red/permiso, no de validación del usuario.
      await updateProfile(credential.user, { displayName }).catch(() => undefined);
    }
    return ok(credential.user);
  } catch (error) {
    return err(mapFirebaseAuthError(error));
  }
}

export async function loginWithEmail(
  email: string,
  password: string
): AsyncResult<FirebaseUser, AuthError> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return ok(credential.user);
  } catch (error) {
    return err(mapFirebaseAuthError(error));
  }
}

export async function logout(): AsyncResult<void, AuthError> {
  try {
    await signOut(auth);
    return ok(undefined);
  } catch (error) {
    return err(mapFirebaseAuthError(error));
  }
}

/** Suscripción al usuario autenticado actual. Devuelve la función de `unsubscribe`. */
export function onAuthStateChangedListener(
  callback: (user: FirebaseUser | null) => void
): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

/**
 * Intercambia un Google ID token (obtenido nativamente en Android vía
 * `@react-native-google-signin/google-signin`, ver `features/auth/hooks/useGoogleSignIn.ts`) por
 * una sesión de Firebase.
 */
export async function signInWithGoogleIdToken(
  idToken: string
): AsyncResult<FirebaseUser, AuthError> {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    return ok(result.user);
  } catch (error) {
    return err(mapFirebaseAuthError(error));
  }
}

/**
 * Flujo de Google Sign-In para web: usa el popup nativo de Firebase (sin dependencias nativas).
 * Si el navegador bloquea el popup, hace fallback a `signInWithRedirect`; en ese caso esta función
 * devuelve un error informativo y el resultado real llega después de la navegación de vuelta,
 * recogido por `consumeGoogleRedirectResultWeb()`.
 *
 * Guardia dura: `signInWithPopup`/`signInWithRedirect`/`getRedirectResult` directamente NO existen
 * en el build de `@firebase/auth` para React Native (solo en el build de navegador), así que esta
 * función jamás debe ejecutarse en Android/iOS. Se valida explícitamente en vez de confiar en que
 * el call-site (`useGoogleSignIn`) siempre lo evite correctamente.
 */
export async function signInWithGooglePopupWeb(): AsyncResult<FirebaseUser, AuthError> {
  if (Platform.OS !== 'web') {
    return err(
      new AuthError(
        'auth/operation-not-supported-in-this-environment',
        'El inicio de sesión con Google por popup solo está disponible en la versión web.'
      )
    );
  }

  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return ok(result.user);
  } catch (error) {
    const authError = mapFirebaseAuthError(error);
    if (
      authError.code === 'auth/popup-blocked' ||
      authError.code === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(auth, provider);
    }
    return err(authError);
  }
}

/**
 * Debe llamarse una vez al cargar la web (por ejemplo desde el store al inicializar) para recoger
 * el resultado de un `signInWithRedirect` previo, si lo hubo. Devuelve `data: null` si no había
 * ningún redirect pendiente.
 */
export async function consumeGoogleRedirectResultWeb(): AsyncResult<FirebaseUser | null, AuthError> {
  if (Platform.OS !== 'web') {
    return ok(null);
  }

  try {
    const result = await getRedirectResult(auth);
    return ok(result?.user ?? null);
  } catch (error) {
    return err(mapFirebaseAuthError(error));
  }
}

export type { FirebaseUser };
