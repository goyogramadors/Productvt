import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { useAuthUser } from '@/features/auth/hooks/useAuthUser';
import { ensureNotificationPermissions } from '@/features/timer/services/timerNotificationService';
import { useTimerStore } from '@/features/timer/store/timerStore';
import { useAuthStore } from '@/store/auth/authStore';

SplashScreen.preventAutoHideAsync();

/**
 * Layout raíz: AuthGate real (ARCHITECTURE.md sección 7.1: `AuthGate -> Login/Register | AppTabs`).
 *
 * - Suscribe el listener de Firebase Auth una única vez (`useAuthStore.initialize`), limpiándolo al
 *   desmontar.
 * - `useRequireAuth` observa `status` y fuerza la navegación: sin sesión -> `(auth)`, con sesión ->
 *   `(tabs)`. Ninguna pantalla necesita reimplementar esa regla.
 * - `useTimerStore.initialize` (docs/04-SINCRONIZACION.md sección 8, puntos a/b) se engancha AQUÍ,
 *   no en la pantalla del cronómetro: `ActiveSessionRecoveryService` debe correr en el arranque en
 *   frío de la app y al volver a primer plano sin importar en qué pestaña esté el usuario — si
 *   viviera en `app/(tabs)/timer.tsx` no correría hasta que el usuario visitara esa pestaña.
 * - El `Stack` sin header no declara cada `Stack.Screen` a mano: Expo Router descubre los grupos
 *   `(auth)` y `(tabs)` por convención de carpetas.
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuthUser();
  const initializeTimer = useTimerStore((s) => s.initialize);

  useEffect(() => {
    const unsubscribe = useAuthStore.getState().initialize();
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Permiso de notificaciones locales (docs/03-CRONOMETRO.md sección 11): no-op en web.
    void ensureNotificationPermissions();
  }, []);

  useEffect(() => {
    if (!user) return;
    return initializeTimer(user.uid);
  }, [user, initializeTimer]);

  useRequireAuth();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
