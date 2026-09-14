import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, StatusColors } from '@/constants/theme';
import { PresetForm } from '@/features/presets/components/preset-form';
import { useCreatePreset } from '@/features/presets/hooks/useCreatePreset';
import { usePresets } from '@/features/presets/hooks/usePresets';
import { useUpdatePreset } from '@/features/presets/hooks/useUpdatePreset';
import type { PresetFormValues } from '@/features/presets/schemas/preset-schema';
import { useTheme } from '@/hooks/use-theme';

/** Gestión CRUD de presets (SPEC.md sección 13). El preset "Estándar" no puede eliminarse. */
export function PresetManagementSection() {
  const theme = useTheme();
  const { presets, isLoading } = usePresets();
  const { createPreset, isSubmitting: isCreating, error: createError, clearError: clearCreateError } =
    useCreatePreset();
  const { updatePreset, deletePreset, isSubmitting: isUpdating, error: updateError } = useUpdatePreset();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleCreate(values: PresetFormValues) {
    const created = await createPreset(values);
    if (created) setIsAdding(false);
    return created;
  }

  async function handleUpdate(presetId: string, values: PresetFormValues) {
    const updated = await updatePreset(presetId, values);
    if (updated) setEditingId(null);
    return updated;
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="smallBold">Presets</ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setEditingId(null);
            clearCreateError();
            setIsAdding((value) => !value);
          }}>
          <ThemedText type="linkPrimary">{isAdding ? 'Cerrar' : '+ Nuevo'}</ThemedText>
        </Pressable>
      </View>

      {isAdding ? (
        <View style={[styles.formCard, { backgroundColor: theme.backgroundElement }]}>
          <PresetForm onSubmit={handleCreate} onCancel={() => setIsAdding(false)} isSubmitting={isCreating} submitLabel="Crear" />
          {createError ? (
            <ThemedText type="small" style={styles.errorText}>
              {createError}
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      {isLoading ? <ActivityIndicator style={styles.loader} /> : null}

      {presets.map((preset) =>
        editingId === preset.id ? (
          <View key={preset.id} style={[styles.formCard, { backgroundColor: theme.backgroundElement }]}>
            <PresetForm
              initialValues={preset}
              onSubmit={(values) => handleUpdate(preset.id, values)}
              onCancel={() => setEditingId(null)}
              isSubmitting={isUpdating}
              submitLabel="Guardar"
            />
          </View>
        ) : (
          <Pressable
            key={preset.id}
            style={styles.presetRow}
            onPress={() => {
              setIsAdding(false);
              setEditingId(preset.id);
            }}>
            <View style={styles.presetInfo}>
              <View style={styles.presetNameRow}>
                <ThemedText type="smallBold">{preset.name}</ThemedText>
                {preset.isDefault ? (
                  <View style={[styles.badge, { backgroundColor: StatusColors.info }]}>
                    <ThemedText type="small" style={styles.badgeText}>
                      Por defecto
                    </ThemedText>
                  </View>
                ) : null}
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {preset.studyDurationMinutes}/{preset.shortBreakMinutes}/{preset.cyclesBeforeLongBreak}/
                {preset.longBreakMinutes} min
              </ThemedText>
            </View>
            {!preset.isDefault ? (
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={(event) => {
                  event.stopPropagation();
                  void deletePreset(preset);
                }}>
                <ThemedText type="small" style={styles.deleteText}>
                  Eliminar
                </ThemedText>
              </Pressable>
            ) : null}
          </Pressable>
        )
      )}

      {updateError ? (
        <ThemedText type="small" style={styles.errorText}>
          {updateError}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formCard: {
    borderRadius: Radii.medium,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  loader: {
    marginVertical: Spacing.two,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  presetInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  presetNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  badge: {
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#ffffff',
  },
  deleteText: {
    color: '#E05252',
  },
  errorText: {
    color: '#E05252',
  },
});
