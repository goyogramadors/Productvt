import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DefaultCategoryColor, Radii, Spacing } from '@/constants/theme';
import type { Category } from '@/domain/entities/category';
import type { CategoryType } from '@/domain/enums/category-type';
import { ColorPicker } from '@/features/categories/components/color-picker';
import { categoryFormSchema, type CategoryFormValues } from '@/features/categories/schemas/category-schema';
import { useTheme } from '@/hooks/use-theme';

interface CategoryFormProps {
  type: CategoryType;
  initialValues?: Pick<Category, 'name' | 'color'>;
  onSubmit: (values: CategoryFormValues) => Promise<boolean> | boolean;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

/**
 * Formulario reutilizable de categoría (crear o editar): nombre + selector de color
 * (SPEC.md sección 12.3). Usado desde `features/settings` para la gestión de categorías, y
 * pensado para reutilizarse más adelante en la creación rápida "en el momento" desde el inicio de
 * un bloque (SPEC.md sección 14.2) — por eso no asume nada sobre dónde se monta.
 */
export function CategoryForm({
  type,
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Guardar',
}: CategoryFormProps) {
  const theme = useTheme();
  const { control, handleSubmit, formState } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: initialValues?.name ?? '',
      color: initialValues?.color ?? DefaultCategoryColor,
    },
  });

  const submit = handleSubmit(async (values) => {
    await onSubmit(values);
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
              placeholder={categoryTypePlaceholder(type)}
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

      <Controller
        control={control}
        name="color"
        render={({ field: { value, onChange } }) => <ColorPicker value={value} onChange={onChange} />}
      />

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

function categoryTypePlaceholder(type: CategoryType): string {
  switch (type) {
    case 'study':
      return 'p. ej. Cálculo 3';
    case 'inverse':
      return 'p. ej. YouTube';
    case 'invisible':
      return 'p. ej. Gimnasio';
  }
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
