import { Platform } from 'react-native';
import { create } from 'zustand';

import type { UserProfile, UserSettings } from '@/domain/entities/user-profile';
import {
  consumeGoogleRedirectResultWeb,
  loginWithEmail as firebaseLoginWithEmail,
  logout as firebaseLogout,
  onAuthStateChangedListener,
  registerWithEmail as firebaseRegisterWithEmail,
  signInWithGoogleIdToken as firebaseSignInWithGoogleIdToken,
  signInWithGooglePopupWeb as firebaseSignInWithGooglePopupWeb,
  type FirebaseUser,
} from '@/infrastructure/firebase/auth';
import { ensureStandardPresetExists } from '@/features/presets/services/preset-service';
import { ensureUserProfileAndSettings } from '@/repositories/user/userRepository';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

/** Recorte mínimo y estable de `FirebaseUser` que el resto de la app consume (evita filtrar todo
 * el SDK de Firebase por la app). */
export interface AuthenticatedUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

function toAuthenticatedUser(user: FirebaseUser): AuthenticatedUser {
  return { uid: user.uid, email: user.email, displayName: user.displayName };
}

interface AuthState {
  /**
   * `loading` hasta que el primer callback de `onAuthStateChanged` resuelve (evita un parpadeo
   * hacia la pantalla de login antes de saber si ya hay sesión persistida).
   */
  status: AuthStatus;
  user: AuthenticatedUser | null;
  profile: UserProfile | null;
  settings: UserSettings | null;
  /** Error de la última acción de login/registro/Google, para mostrar en el formulario que la disparó. */
  actionError: string | null;
  /** true mientras una acción de login/registro/Google está en curso (evita doble submit). */
  isSubmitting: boolean;
}

interface AuthActions {
  /** Debe llamarse una única vez desde el layout raíz. Devuelve la función de `unsubscribe`. */
  initialize: () => () => void;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  registerWithEmail: (email: string, password: string, displayName?: string) => Promise<boolean>;
  /** Android: intercambia el idToken nativo de `@react-native-google-signin/google-signin`. */
  signInWithGoogleIdToken: (idToken: string) => Promise<boolean>;
  /** Web: usa el popup nativo de Firebase, sin dependencias adicionales. */
  signInWithGooglePopup: () => Promise<boolean>;
  logout: () => Promise<void>;
  clearActionError: () => void;
  /** Para errores originados fuera de los adapters de Firebase (p.ej. el SDK nativo de Google). */
  setActionError: (message: string) => void;
  /** Vuelve a leer profile/settings desde Firestore (p.ej. tras editarlos en Configuración). */
  refreshProfile: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

interface MinimalAuthenticatedUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
}

async function loadProfileAndSettings(user: MinimalAuthenticatedUser): Promise<{
  profile: UserProfile | null;
  settings: UserSettings | null;
}> {
  const result = await ensureUserProfileAndSettings(
    user.uid,
    user.email ?? '',
    user.displayName ?? undefined
  );
  if (!result.success) {
    // No hay perfil legible pero sí hay sesión de Firebase: se mantiene `signedIn` con
    // profile/settings en null en vez de forzar un logout por un error transitorio de red.
    console.warn('[authStore] No se pudo cargar/crear profile+settings:', result.error.message);
    return { profile: null, settings: null };
  }
  return result.data;
}

/**
 * Siembra idempotente del preset "Estándar" (SPEC.md sección 13.1) para usuarios nuevos — funciona
 * igual para registro por email y primer login con Google, porque ambos disparan el mismo
 * `onAuthStateChanged`. Se llama solo una vez por transición `signedOut -> signedIn` (no en cada
 * `refreshProfile`, que se dispara en cada guardado de Configuración) para no repetir una lectura
 * de Firestore innecesaria en cada edición de ajustes.
 */
async function seedStandardPresetIfNeeded(uid: string): Promise<void> {
  const presetResult = await ensureStandardPresetExists(uid);
  if (!presetResult.success) {
    console.warn('[authStore] No se pudo sembrar el preset estándar:', presetResult.error.message);
  }
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  status: 'loading',
  user: null,
  profile: null,
  settings: null,
  actionError: null,
  isSubmitting: false,

  initialize: () => {
    if (Platform.OS === 'web') {
      // Recoge el resultado de un signInWithRedirect anterior (fallback cuando el popup fue
      // bloqueado). Si tuvo éxito, onAuthStateChanged de abajo ya recibirá el usuario resultante;
      // aquí solo nos interesa capturar un eventual error para mostrarlo.
      consumeGoogleRedirectResultWeb().then((result) => {
        if (!result.success) {
          set({ actionError: result.error.message });
        }
      });
    }

    const unsubscribe = onAuthStateChangedListener((firebaseUser) => {
      if (!firebaseUser) {
        set({ status: 'signedOut', user: null, profile: null, settings: null });
        return;
      }

      set({ status: 'signedIn', user: toAuthenticatedUser(firebaseUser) });
      void loadProfileAndSettings(firebaseUser).then(({ profile, settings }) => {
        // Si el usuario ya cerró sesión mientras esto cargaba, no pisar el estado `signedOut`.
        if (get().user?.uid === firebaseUser.uid) {
          set({ profile, settings });
        }
      });
      void seedStandardPresetIfNeeded(firebaseUser.uid);
    });

    return unsubscribe;
  },

  loginWithEmail: async (email, password) => {
    set({ isSubmitting: true, actionError: null });
    const result = await firebaseLoginWithEmail(email, password);
    set({ isSubmitting: false });
    if (!result.success) {
      set({ actionError: result.error.message });
      return false;
    }
    return true;
  },

  registerWithEmail: async (email, password, displayName) => {
    set({ isSubmitting: true, actionError: null });
    const result = await firebaseRegisterWithEmail(email, password, displayName);
    set({ isSubmitting: false });
    if (!result.success) {
      set({ actionError: result.error.message });
      return false;
    }
    return true;
  },

  signInWithGoogleIdToken: async (idToken) => {
    set({ isSubmitting: true, actionError: null });
    const result = await firebaseSignInWithGoogleIdToken(idToken);
    set({ isSubmitting: false });
    if (!result.success) {
      set({ actionError: result.error.message });
      return false;
    }
    return true;
  },

  signInWithGooglePopup: async () => {
    set({ isSubmitting: true, actionError: null });
    const result = await firebaseSignInWithGooglePopupWeb();
    set({ isSubmitting: false });
    if (!result.success) {
      // Si terminó en un signInWithRedirect (popup bloqueado), no es realmente un fallo del
      // usuario: no lo mostramos como error, onAuthStateChanged completará el login tras el
      // redirect. Cualquier otro código sí se muestra.
      if (result.error.code !== 'auth/popup-blocked') {
        set({ actionError: result.error.message });
      }
      return false;
    }
    return true;
  },

  logout: async () => {
    const result = await firebaseLogout();
    if (!result.success) {
      set({ actionError: result.error.message });
    }
    // El propio listener de onAuthStateChanged limpia user/profile/settings/status.
  },

  clearActionError: () => set({ actionError: null }),

  setActionError: (message) => set({ actionError: message }),

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;
    const { profile, settings } = await loadProfileAndSettings(user);
    set({ profile, settings });
  },
}));
