import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuthUser } from '@/features/auth/hooks/useAuthUser';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth/authStore';

/**
 * Placeholder de Configuración/Gestión (SPEC.md sección 9.4): categorías, presets, sonidos, frase
 * de cancelación, etc. llegan en fases futuras. Se deja funcional "Cerrar sesión" desde ya porque
 * es parte de esta fase de autenticación, no del resto de Configuración.
 */
export default function SettingsScreen() {
  const theme = useTheme();
  const { user, profile } = useAuthUser();
  const logout = useAuthStore((s) => s.logout);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Configuración</ThemedText>
        <ThemedText themeColor="textSecondary">
          {profile?.displayName ? `${profile.displayName} · ` : ''}
          {user?.email}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Categorías, presets, sonidos y frase de cancelación: fase pendiente.
        </ThemedText>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void logout();
          }}
          style={({ pressed }) => [
            styles.logoutButton,
            { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
          ]}>
          <ThemedText type="smallBold">Cerrar sesión</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  logoutButton: {
    marginTop: Spacing.four,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + Spacing.half,
    alignItems: 'center',
  },
});
