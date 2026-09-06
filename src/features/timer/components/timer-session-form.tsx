import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { usePresets } from '@/features/presets/hooks/usePresets';
import { useStartStudySession } from '@/features/timer/hooks/useStartStudySession';
import { useTheme } from '@/hooks/use-theme';

/**
 * Formulario de inicio de una sesión de estudio (`START_SESSION`, T1): nombre, categoría (árbol
 * `study`) y preset. La UI es delgada — toda la lógica de arranque vive en
 * `useStartStudySession`/`StudySessionCoordinator` (ARCHITECTURE.md sección 2.2).
 */
export function TimerSessionForm() {
  const theme = useTheme();
  const { categories, isLoading: isLoadingCategories } = useCategories('study');
  const { presets, isLoading: isLoadingPresets } = usePresets();
  const { start, isSubmitting, error, clearError } = useStartStudySession();

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [presetId, setPresetId] = useState<string | null>(null);

  const activeCategories = categories.filter((c) => !c.isArchived);
  const selectedPreset = presets.find((p) => p.id === presetId);

  if (!categoryId && activeCategories.length > 0) setCategoryId(activeCategories[0].id);
  if (!presetId && presets.length > 0) setPresetId(presets.find((p) => p.isDefault)?.id ?? presets[0].id);

  const canSubmit = name.trim().length > 0 && !!categoryId && !!presetId && !isSubmitting;

  async function handleSubmit() {
    if (!categoryId || !presetId) return;
    clearError();
    await start({ name: name.trim(), categoryId, presetId });
  }

  if (isLoadingCategories || isLoadingPresets) {
    return <ActivityIndicator />;
  }

  if (activeCategories.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Creá primero una categoría de estudio en Configuración.
      </ThemedText>
    );
  }

  return (
    <View style={styles.form}>
      <View style={styles.field}>
        <ThemedText type="smallBold">Nombre de la sesión</ThemedText>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ej. Cálculo 3 — Guía 4"
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
        <ThemedText type="smallBold">Preset</ThemedText>
        <View style={styles.chipsRow}>
          {presets.map((preset) => (
            <Pressable
              key={preset.id}
              accessibilityRole="button"
              onPress={() => setPresetId(preset.id)}
              style={[
                styles.chip,
                { backgroundColor: theme.backgroundElement },
                presetId === preset.id && { borderColor: theme.text, borderWidth: 2 },
              ]}>
              <ThemedText type="small">{preset.name}</ThemedText>
            </Pressable>
          ))}
        </View>
        {selectedPreset ? (
          <ThemedText type="small" themeColor="textSecondary">
            {selectedPreset.studyDurationMinutes} min estudio · {selectedPreset.shortBreakMinutes} min descanso corto ·
            descanso largo de {selectedPreset.longBreakMinutes} min cada {selectedPreset.cyclesBeforeLongBreak} bloques
          </ThemedText>
        ) : null}
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
            Iniciar sesión
          </ThemedText>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.four },
  field: { gap: Spacing.two },
  input: {
    borderRadius: Radii.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
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
  submitButton: {
    borderRadius: Radii.medium,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  errorText: { color: '#E05252' },
});
