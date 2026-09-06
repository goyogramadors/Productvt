import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import type { z } from 'zod';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import type { Preset } from '@/domain/entities/preset';
import { computeLongBreakTotalMinutes } from '@/features/presets/domain/preset-rules';
import { presetFormSchema, type PresetFormValues } from '@/features/presets/schemas/preset-schema';
import { useTheme } from '@/hooks/use-theme';

/**
 * Zod v4 tipa el INPUT de un campo `z.coerce.number()` como `unknown` (lo que sea que el usuario
 * escriba antes de coercionar), y el OUTPUT (`PresetFormValues`, vía `z.infer`) ya como `number`.
 * `useForm` necesita el tipo de input para que el resolver encaje; `handleSubmit` sigue entregando
 * el tipo de salida ya validado y coercionado (tercer genérico de RHF v7).
 */
type PresetFormInputValues = z.input<typeof presetFormSchema>;

interface PresetFormProps {
  initialValues?: Pick<
    Preset,
    'name' | 'studyDurationMinutes' | 'shortBreakMinutes' | 'cyclesBeforeLongBreak' | 'longBreakMinutes'
  >;
  onSubmit: (values: PresetFormValues) => Promise<boolean> | boolean;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

interface NumericFieldConfig {
  name: keyof PresetFormInputValues;
  label: string;
  suffix: string;
}

const NUMERIC_FIELDS: NumericFieldConfig[] = [
  { name: 'studyDurationMinutes', label: 'Estudio', suffix: 'min' },
  { name: 'shortBreakMinutes', label: 'Descanso corto', suffix: 'min' },
  { name: 'cyclesBeforeLongBreak', label: 'Ciclos antes del descanso largo', suffix: '' },
  { name: 'longBreakMinutes', label: 'Descanso largo', suffix: 'min' },
];

/**
 * Formulario reutilizable de preset (crear o editar), SPEC.md sección 13.2. El dominio trabaja en
 * minutos aquí (input directo del usuario) — la conversión a segundos ocurre recién en el motor
 * del timer (Fase 4), no en este formulario.
 */
export function PresetForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Guardar',
}: PresetFormProps) {
  const theme = useTheme();
  const { control, handleSubmit, watch, formState } = useForm<
    PresetFormInputValues,
    unknown,
    PresetFormValues
  >({
    resolver: zodResolver(presetFormSchema),
    defaultValues: {
      name: initialValues?.name ?? '',
      studyDurationMinutes: initialValues?.studyDurationMinutes ?? 25,
      shortBreakMinutes: initialValues?.shortBreakMinutes ?? 5,
      cyclesBeforeLongBreak: initialValues?.cyclesBeforeLongBreak ?? 4,
      longBreakMinutes: initialValues?.longBreakMinutes ?? 35,
    },
  });

  const values = watch();
  const longBreakTotal = computeLongBreakTotalMinutes({
    name: values.name ?? '',
    studyDurationMinutes: Number(values.studyDurationMinutes) || 0,
    shortBreakMinutes: Number(values.shortBreakMinutes) || 0,
    cyclesBeforeLongBreak: Number(values.cyclesBeforeLongBreak) || 0,
    longBreakMinutes: Number(values.longBreakMinutes) || 0,
  });

  const submit = handleSubmit(async (formValues) => {
    await onSubmit(formValues);
  });

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="name"
        render={({ field: { value, onChange, onBlur } }) => (
          <View style={styles.field}>
            <ThemedText type="smallBold">Nombre</ThemedText>
            <TextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="p. ej. Sprint corto"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            {formState.errors.name ? (
              <ThemedText type="small" style={styles.errorText}>
                {formState.errors.name.message}
              </ThemedText>
            ) : null}
          </View>
        )}
      />

      {NUMERIC_FIELDS.map(({ name, label, suffix }) => (
        <Controller
          key={name}
          control={control}
          name={name}
          render={({ field: { value, onChange, onBlur } }) => (
            <View style={styles.field}>
              <ThemedText type="smallBold">{label}</ThemedText>
              <View style={styles.numericRow}>
                <TextInput
                  value={String(value ?? '')}
                  onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ''))}
                  onBlur={onBlur}
                  keyboardType="number-pad"
                  style={[
                    styles.numericInput,
                    { color: theme.text, backgroundColor: theme.backgroundElement },
                  ]}
                />
                {suffix ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {suffix}
                  </ThemedText>
                ) : null}
              </View>
              {formState.errors[name] ? (
                <ThemedText type="small" style={styles.errorText}>
                  {formState.errors[name]?.message}
                </ThemedText>
              ) : null}
            </View>
          )}
        />
      ))}

      <ThemedText type="small" themeColor="textSecondary">
        Descanso total al llegar al ciclo largo: {longBreakTotal} min.
      </ThemedText>

      <View style={styles.actionsRow}>
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.secondaryButton}>
          <ThemedText type="smallBold">Cancelar</ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={submit}
          style={[styles.primaryButton, { opacity: isSubmitting ? 0.7 : 1 }]}>
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <ThemedText type="smallBold" style={styles.primaryButtonText}>
              {submitLabel}
            </ThemedText>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    borderRadius: Radii.small,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  numericRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  numericInput: {
    width: 72,
    borderRadius: Radii.small,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  errorText: {
    color: '#E05252',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  secondaryButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radii.small,
  },
  primaryButton: {
    backgroundColor: '#208AEF',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radii.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
  },
});
