import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useUserSettings } from '@/features/settings/hooks/useUserSettings';
import { useTheme } from '@/hooks/use-theme';

/**
 * Frase personalizada del panel de cancelación, editable con ícono lápiz (SPEC.md sección 20.2).
 * No hay librería de íconos vectoriales instalada en el proyecto todavía, así que el lápiz se
 * representa con el glifo "✏️" en vez de sumar una dependencia nueva solo para este botón.
 */
export function CancellationPhraseEditor() {
  const theme = useTheme();
  const { profile, updateCancellationPhrase, isSubmitting, error, clearError } = useUserSettings();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(profile?.cancellationPhrase ?? '');

  useEffect(() => {
    if (!isEditing) setDraft(profile?.cancellationPhrase ?? '');
  }, [profile?.cancellationPhrase, isEditing]);

  async function handleSave() {
    const saved = await updateCancellationPhrase(draft);
    if (saved) setIsEditing(false);
  }

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">Frase de cancelación</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Se muestra en el panel de confirmación al cancelar una sesión.
      </ThemedText>

      {isEditing ? (
        <View style={styles.editBlock}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            style={[styles.textArea, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                clearError();
                setIsEditing(false);
              }}>
              <ThemedText type="smallBold">Cancelar</ThemedText>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={handleSave}>
              {isSubmitting ? (
                <ActivityIndicator />
              ) : (
                <ThemedText type="smallBold" style={styles.saveText}>
                  Guardar
                </ThemedText>
              )}
            </Pressable>
          </View>
          {error ? (
            <ThemedText type="small" style={styles.errorText}>
              {error}
            </ThemedText>
          ) : null}
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          style={[styles.phraseRow, { backgroundColor: theme.backgroundElement }]}
          onPress={() => setIsEditing(true)}>
          <ThemedText style={styles.phraseText}>{profile?.cancellationPhrase ?? '—'}</ThemedText>
          <ThemedText>✏️</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  editBlock: {
    gap: Spacing.two,
  },
  textArea: {
    minHeight: 72,
    borderRadius: Radii.small,
    padding: Spacing.three,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.four,
  },
  saveText: {
    color: '#208AEF',
  },
  phraseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radii.small,
    padding: Spacing.three,
  },
  phraseText: {
    flex: 1,
  },
  errorText: {
    color: '#E05252',
  },
});
