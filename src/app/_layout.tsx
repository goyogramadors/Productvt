import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { useAuthStore } from '@/store/auth/authStore';

SplashScreen.preventAutoHideAsync();

/**
 * Layout raíz: AuthGate real (ARCHITECTURE.md sección 7.1: `AuthGate -> Login/Register | AppTabs`).
 *
 * - Suscribe el listener de Firebase Auth una única vez (`useAuthStore.initialize`), limpiándolo al
 *   desmontar.
 * - `useRequireAuth` observa `status` y fuerza la navegación: sin sesión -> `(auth)`, con sesión ->
 *   `(tabs)`. Ninguna pantalla necesita reimplementar esa regla.
 * - El `Stack` sin header no declara cada `Stack.Screen` a mano: Expo Router descubre los grupos
 *   `(auth)` y `(tabs)` por convención de carpetas.
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const unsubscribe = useAuthStore.getState().initialize();
    return unsubscribe;
  }, []);

  useRequireAuth();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
