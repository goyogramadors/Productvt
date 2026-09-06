import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import type { SoundPreferences } from '@/domain/entities/user-profile';
import { SOUND_OPTIONS, SOUND_SLOTS, type SoundSlotKey } from '@/features/settings/domain/sound-catalog';
import { useUserSettings } from '@/features/settings/hooks/useUserSettings';
import { useTheme } from '@/hooks/use-theme';

/**
 * Placeholder de preferencias de sonido (SPEC.md secciones 28.2/28.3): activar/desactivar,
 * elegir entre sonidos predefinidos por ranura, y volumen relativo. La reproducción real y la
 * importación de audio propio del dispositivo llegan en la Fase 4 (núcleo del timer).
 */
export function SoundPreferencesSection() {
  const theme = useTheme();
  const { settings, updateSoundPreferences, isSubmitting, error } = useUserSettings();
  const preferences = settings?.soundPreferences;

  if (!preferences) return null;

  function handleVolumeStep(delta: number) {
    if (!preferences) return;
    const next = Math.min(1, Math.max(0, Math.round((preferences.volume + delta) * 10) / 10));
    void updateSoundPreferences({ volume: next });
  }

  function handleSlotSelect(slotKey: SoundSlotKey, soundId: string) {
    const patch: Partial<SoundPreferences> = { [slotKey]: soundId };
    void updateSoundPreferences(patch);
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="smallBold">Sonidos</ThemedText>
        <Switch
          value={preferences.enabled}
          disabled={isSubmitting}
          onValueChange={(value) => void updateSoundPreferences({ enabled: value })}
        />
      </View>

      {preferences.enabled
        ? SOUND_SLOTS.map(({ key, label }) => (
            <View key={key} style={styles.slotBlock}>
              <ThemedText type="small" themeColor="textSecondary">
                {label}
              </ThemedText>
              <View style={styles.optionsRow}>
                {SOUND_OPTIONS.map((option) => {
                  const selected = preferences[key] === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      accessibilityRole="button"
                      onPress={() => handleSlotSelect(key, option.id)}
                      style={[
                        styles.optionChip,
                        { backgroundColor: theme.backgroundElement },
                        selected && [styles.optionChipSelected, { borderColor: theme.text }],
                      ]}>
                      <ThemedText type="small">{option.label}</ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        : null}

      <View style={styles.volumeRow}>
        <ThemedText type="small" themeColor="textSecondary">
          Volumen: {Math.round(preferences.volume * 100)}%
        </ThemedText>
        <View style={styles.volumeButtons}>
          <Pressable
            accessibilityRole="button"
            style={[styles.volumeButton, { backgroundColor: theme.backgroundElement }]}
            onPress={() => handleVolumeStep(-0.1)}>
            <ThemedText type="smallBold">−</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[styles.volumeButton, { backgroundColor: theme.backgroundElement }]}
            onPress={() => handleVolumeStep(0.1)}>
            <ThemedText type="smallBold">+</ThemedText>
          </Pressable>
        </View>
      </View>

      {error ? (
        <ThemedText type="small" style={styles.errorText}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotBlock: {
    gap: Spacing.one,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  optionChip: {
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  optionChipSelected: {
    borderWidth: 1.5,
  },
  volumeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  volumeButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  volumeButton: {
    width: 32,
    height: 32,
    borderRadius: Radii.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#E05252',
  },
});
