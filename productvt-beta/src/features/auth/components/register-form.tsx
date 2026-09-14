import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ROUTES } from '@/constants/routes';
import { Spacing } from '@/constants/theme';
import { AuthTextField } from '@/features/auth/components/auth-text-field';
import { GoogleSignInButton } from '@/features/auth/components/google-sign-in-button';
import { registerSchema, type RegisterFormValues } from '@/features/auth/schemas/auth-schemas';
import { useAuthStore } from '@/store/auth/authStore';

/**
 * Formulario de registro (SPEC.md sección 11.2). Igual que en login, la redirección post-registro
 * la resuelve `useRequireAuth` reaccionando al store, no este componente.
 */
export function RegisterForm() {
  const router = useRouter();
  const registerWithEmail = useAuthStore((s) => s.registerWithEmail);
  const isSubmitting = useAuthStore((s) => s.isSubmitting);
  const actionError = useAuthStore((s) => s.actionError);
  const clearActionError = useAuthStore((s) => s.clearActionError);

  const { control, handleSubmit } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    await registerWithEmail(values.email, values.password, values.displayName || undefined);
  });

  return (
    <View style={styles.form}>
      <AuthTextField
        control={control}
        name="displayName"
        label="Nombre (opcional)"
        placeholder="¿Cómo te llamamos?"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
      />
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
        placeholder="Mínimo 6 caracteres"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password-new"
        textContentType="newPassword"
      />
      <AuthTextField
        control={control}
        name="confirmPassword"
        label="Confirmar contraseña"
        placeholder="Repite tu contraseña"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password-new"
        textContentType="newPassword"
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
            Crear cuenta
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
          router.replace(ROUTES.auth.login);
        }}>
        <ThemedText type="link" style={styles.switchLink}>
          ¿Ya tienes cuenta? Inicia sesión
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
