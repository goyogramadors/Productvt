import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface AuthTextFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
}

/**
 * Campo de texto genérico para formularios de auth, integrado con React Hook Form. La UI se
 * mantiene delgada: solo pinta y delega valor/validación al `control` de RHF + Zod
 * (ARCHITECTURE.md sección 2.2).
 */
export function AuthTextField<T extends FieldValues>({
  control,
  name,
  label,
  ...inputProps
}: AuthTextFieldProps<T>) {
  const theme = useTheme();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <View style={styles.container}>
          <ThemedText type="smallBold">{label}</ThemedText>
          <TextInput
            value={typeof value === 'string' ? value : ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.backgroundElement,
                borderColor: error ? '#E05252' : 'transparent',
              },
            ]}
            {...inputProps}
          />
          {error ? (
            <ThemedText type="small" style={styles.errorText}>
              {error.message}
            </ThemedText>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  errorText: {
    color: '#E05252',
  },
});
