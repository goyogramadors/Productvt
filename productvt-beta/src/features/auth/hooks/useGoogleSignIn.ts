import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useCallback } from 'react';
import { Platform } from 'react-native';

import { useAuthStore } from '@/store/auth/authStore';

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

let nativeGoogleSignInConfigured = false;

/**
 * `GoogleSignin.configure` solo necesita llamarse una vez por proceso de la app (ARCHITECTURE.md
 * sección 24.2). Se hace perezosamente en el primer intento de login en vez de en el arranque de
 * la app, para no pagar el costo en plataformas/flows que nunca usan Google.
 */
function ensureNativeGoogleSignInConfigured(): void {
  if (nativeGoogleSignInConfigured) return;
  GoogleSignin.configure({
    // `webClientId` es obligatorio para que Android devuelva un idToken con la audiencia que
    // Firebase puede validar (ver .env.example). Sin él, GoogleSignin.signIn() solo entrega
    // accessToken, insuficiente para signInWithCredential/GoogleAuthProvider.
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });
  nativeGoogleSignInConfigured = true;
}

export interface UseGoogleSignInResult {
  /** Lanza el flujo de Google Sign-In para la plataforma actual. `true` si terminó autenticado. */
  promptGoogleSignIn: () => Promise<boolean>;
  isSubmitting: boolean;
}

/**
 * Google Sign-In multiplataforma (SPEC.md sección 11.2).
 *
 * - Android: usa el SDK nativo (`@react-native-google-signin/google-signin`, requiere development
 *   build local — decisiones-tomadas.md punto 17) para obtener un idToken y lo intercambia por
 *   sesión de Firebase vía `authStore`.
 * - Web: usa el popup nativo de Firebase (`authStore.signInWithGooglePopup`), sin dependencia nativa.
 *
 * Los componentes de UI (`LoginForm`/`RegisterForm`) no conocen esta rama de plataforma: solo
 * llaman `promptGoogleSignIn()`.
 */
export function useGoogleSignIn(): UseGoogleSignInResult {
  const signInWithGoogleIdToken = useAuthStore((s) => s.signInWithGoogleIdToken);
  const signInWithGooglePopup = useAuthStore((s) => s.signInWithGooglePopup);
  const setActionError = useAuthStore((s) => s.setActionError);
  const isSubmitting = useAuthStore((s) => s.isSubmitting);

  const promptGoogleSignIn = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return signInWithGooglePopup();
    }

    try {
      ensureNativeGoogleSignInConfigured();
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        // Usuario cerró el selector de cuentas: no es un error para mostrar en el formulario.
        return false;
      }

      const { idToken } = response.data;
      if (!idToken) {
        setActionError(
          'Google no devolvió un token válido. Revisa EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID en la configuración del proyecto.'
        );
        return false;
      }

      return signInWithGoogleIdToken(idToken);
    } catch (error) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          return false;
        }
        if (error.code === statusCodes.IN_PROGRESS) {
          setActionError('Ya hay un inicio de sesión con Google en curso.');
          return false;
        }
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          setActionError('Este dispositivo no tiene Google Play Services disponible o actualizado.');
          return false;
        }
      }
      setActionError('No se pudo iniciar sesión con Google. Intenta nuevamente.');
      return false;
    }
  }, [setActionError, signInWithGoogleIdToken, signInWithGooglePopup]);

  return { promptGoogleSignIn, isSubmitting };
}
