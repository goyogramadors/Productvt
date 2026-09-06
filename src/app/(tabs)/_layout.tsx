import { Tabs } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

/**
 * Tab bar estándar de Expo Router (cross-platform, sin estilizado custom). Las 4 áreas principales
 * del producto (SPEC.md sección 9); cada pantalla real llega en su propia fase — esta fase solo
 * deja el andamiaje de navegación protegido por `useRequireAuth` (ver `src/app/_layout.tsx`).
 */
export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.background },
      }}>
      <Tabs.Screen name="timer" options={{ title: 'Cronómetro' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendario' }} />
      <Tabs.Screen name="stats" options={{ title: 'Estadísticas' }} />
      <Tabs.Screen name="settings" options={{ title: 'Configuración' }} />
    </Tabs>
  );
}
