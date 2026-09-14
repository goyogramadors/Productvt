import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ROUTES } from '@/constants/routes';
import { Spacing } from '@/constants/theme';
import { AuthTextField } from '@/features/auth/components/auth-text-field';
import { GoogleSignInButton } from '@/features/auth/components/google-sign-in-button';
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas/auth-schemas';
import { useAuthStore } from '@/store/auth/authStore';

/**
 * Formulario de login (SPEC.md sección 11.2). La navegación tras un login exitoso no la decide
 * este componente: `useRequireAuth` (usado en el layout raíz) reacciona al cambio de `status` en
 * el store y redirige a las tabs.
 */
export function LoginForm() {
  const router = useRouter();
  const loginWithEmail = useAuthStore((s) => s.loginWithEmail);
  const isSubmitting = useAuthStore((s) => s.isSubmitting);
  const actionError = useAuthStore((s) => s.actionError);
  const clearActionError = useAuthStore((s) => s.clearActionError);

  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    await loginWithEmail(values.email, values.password);
  });

  return (
    <View style={styles.form}>
      <AuthTextField
        control={control}
        name="email"
        label="Correo"
        placeholder="tu@correo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <AuthTextField
        control={control}
        name="password"
        label="Contraseña"
        placeholder="••••••••"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
        textContentType="password"
      />

      {actionError ? (
        <ThemedText type="small" style={styles.errorBanner}>
          {actionError}
        </ThemedText>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={isSubmitting}
        onPress={onSubmit}
        style={({ pressed }) => [styles.primaryButton, { opacity: pressed || isSubmitting ? 0.8 : 1 }]}>
        {isSubmitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <ThemedText type="smallBold" style={styles.primaryButtonText}>
            Iniciar sesión
          </ThemedText>
        )}
      </Pressable>

      <ThemedText type="small" style={styles.dividerText}>
        o
      </ThemedText>

      <GoogleSignInButton />

      <Pressable
        onPress={() => {
          clearActionError();
          router.replace(ROUTES.auth.register);
        }}>
        <ThemedText type="link" style={styles.switchLink}>
          ¿No tienes cuenta? Regístrate
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
  },
  primaryButton: {
    backgroundColor: '#208AEF',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + Spacing.half,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  errorBanner: {
    color: '#E05252',
    textAlign: 'center',
  },
  dividerText: {
    textAlign: 'center',
  },
  switchLink: {
    textAlign: 'center',
  },
});
