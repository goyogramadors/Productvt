import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useGoogleSignIn } from '@/features/auth/hooks/useGoogleSignIn';
import { useTheme } from '@/hooks/use-theme';

/**
 * Botón "Continuar con Google", multiplataforma (SPEC.md sección 11.2). Delega toda la lógica de
 * plataforma (Android nativo vs. popup web) a `useGoogleSignIn`; este componente solo pinta.
 */
export function GoogleSignInButton() {
  const theme = useTheme();
  const { promptGoogleSignIn, isSubmitting } = useGoogleSignIn();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isSubmitting}
      onPress={() => {
        void promptGoogleSignIn();
      }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.backgroundElement, opacity: pressed || isSubmitting ? 0.7 : 1 },
      ]}>
      {isSubmitting ? (
        <ActivityIndicator size="small" color={theme.text} />
      ) : (
        <ThemedText type="smallBold">Continuar con Google</ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + Spacing.half,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
