import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { minutesToSeconds } from '@/domain/value-objects/duration-seconds';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { useInverseTimer } from '@/features/timer/hooks/useInverseTimer';
import { useTheme } from '@/hooks/use-theme';

/** Formulario de inicio del temporizador inverso (`START_INVERSE`, docs/03-CRONOMETRO.md sección 12). */
export function InverseTimerForm() {
  const theme = useTheme();
  const { categories, isLoading } = useCategories('inverse');
  const { start, isSubmitting, error, clearError } = useInverseTimer();

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [targetMinutes, setTargetMinutes] = useState('30');

  const activeCategories = categories.filter((c) => !c.isArchived);
  if (!categoryId && activeCategories.length > 0) setCategoryId(activeCategories[0].id);

  const parsedMinutes = Number(targetMinutes);
  const canSubmit =
    name.trim().length > 0 && !!categoryId && Number.isFinite(parsedMinutes) && parsedMinutes > 0 && !isSubmitting;

  async function handleSubmit() {
    if (!categoryId) return;
    clearError();
    await start({ name: name.trim(), categoryId, targetDurationSeconds: minutesToSeconds(parsedMinutes) });
  }

  if (isLoading) return <ActivityIndicator />;

  if (activeCategories.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Creá primero una categoría de ocio en Configuración.
      </ThemedText>
    );
  }

  return (
    <View style={styles.form}>
      <View style={styles.field}>
        <ThemedText type="smallBold">Nombre</ThemedText>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ej. Ver una serie"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
        />
      </View>

      <View style={styles.field}>
        <ThemedText type="smallBold">Categoría</ThemedText>
        <View style={styles.chipsRow}>
          {activeCategories.map((category) => (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              onPress={() => setCategoryId(category.id)}
              style={[
                styles.chip,
                { backgroundColor: theme.backgroundElement },
                categoryId === category.id && { borderColor: category.color, borderWidth: 2 },
              ]}>
              <View style={[styles.colorDot, { backgroundColor: category.color }]} />
              <ThemedText type="small">{category.name}</ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <ThemedText type="smallBold">Duración objetivo (minutos)</ThemedText>
        <TextInput
          value={targetMinutes}
          onChangeText={setTargetMinutes}
          keyboardType="number-pad"
          style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
        />
        <ThemedText type="small" themeColor="textSecondary">
          Sigue corriendo después del objetivo; se cierra solo al llegar al doble (tope de seguridad).
        </ThemedText>
      </View>

      {error ? (
        <ThemedText type="small" style={styles.errorText}>
          {error}
        </ThemedText>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={!canSubmit}
        onPress={handleSubmit}
        style={[styles.submitButton, { backgroundColor: theme.text, opacity: canSubmit ? 1 : 0.5 }]}>
        {isSubmitting ? (
          <ActivityIndicator color={theme.background} />
        ) : (
          <ThemedText type="smallBold" themeColor="background">
            Iniciar tiempo libre
          </ThemedText>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.four },
  field: { gap: Spacing.two },
  input: { borderRadius: Radii.medium, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, fontSize: 16 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Radii.pill,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  submitButton: { borderRadius: Radii.medium, paddingVertical: Spacing.three, alignItems: 'center' },
  errorText: { color: '#E05252' },
});
