import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CategoryPalette, Radii, Spacing } from '@/constants/theme';
import {
  clampRgbChannel,
  hexToRgb,
  isPaletteColor,
  rgbToHex,
} from '@/features/categories/domain/category-rules';
import { useTheme } from '@/hooks/use-theme';

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
}

const RGB_CHANNELS = ['r', 'g', 'b'] as const;
const CHANNEL_LABEL: Record<(typeof RGB_CHANNELS)[number], string> = { r: 'R', g: 'G', b: 'B' };

/**
 * Selector de color de categoría (SPEC.md sección 12.3): grilla de colores suaves predefinidos
 * (`CategoryPalette`) + paleta RGB manual. Componente puramente de presentación — la persistencia
 * la maneja quien lo use (p.ej. `category-form.tsx`) vía `onChange`.
 */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const theme = useTheme();
  const [showCustom, setShowCustom] = useState(!isPaletteColor(value));
  const rgb = hexToRgb(value) ?? { r: 0, g: 0, b: 0 };

  function updateChannel(channel: (typeof RGB_CHANNELS)[number], text: string) {
    const parsed = clampRgbChannel(Number(text.replace(/[^0-9]/g, '')) || 0);
    onChange(rgbToHex({ ...rgb, [channel]: parsed }));
  }

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">Color</ThemedText>
      <View style={styles.swatchRow}>
        {CategoryPalette.map((paletteColor) => {
          const selected = !showCustom && value.toUpperCase() === paletteColor.toUpperCase();
          return (
            <Pressable
              key={paletteColor}
              accessibilityRole="button"
              accessibilityLabel={`Color ${paletteColor}`}
              onPress={() => {
                setShowCustom(false);
                onChange(paletteColor);
              }}
              style={[
                styles.swatch,
                { backgroundColor: paletteColor },
                selected && [styles.swatchSelected, { borderColor: theme.text }],
              ]}
            />
          );
        })}
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowCustom(true)}
          style={[
            styles.swatch,
            styles.customSwatchButton,
            { backgroundColor: theme.backgroundElement },
            showCustom && [styles.swatchSelected, { borderColor: theme.text }],
          ]}>
          <ThemedText type="small">RGB</ThemedText>
        </Pressable>
      </View>

      {showCustom ? (
        <View style={styles.customPanel}>
          <View style={[styles.preview, { backgroundColor: value, borderColor: theme.backgroundSelected }]} />
          <View style={styles.channelsColumn}>
            {RGB_CHANNELS.map((channel) => (
              <View key={channel} style={styles.channelRow}>
                <ThemedText type="smallBold" style={styles.channelLabel}>
                  {CHANNEL_LABEL[channel]}
                </ThemedText>
                <TextInput
                  value={String(rgb[channel])}
                  onChangeText={(text) => updateChannel(channel, text)}
                  keyboardType="number-pad"
                  maxLength={3}
                  style={[
                    styles.channelInput,
                    { color: theme.text, backgroundColor: theme.backgroundElement },
                  ]}
                />
              </View>
            ))}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {value.toUpperCase()}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderWidth: 3,
  },
  customSwatchButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  customPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  preview: {
    width: 40,
    height: 40,
    borderRadius: Radii.medium,
    borderWidth: 1,
  },
  channelsColumn: {
    gap: Spacing.one,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  channelLabel: {
    width: 16,
  },
  channelInput: {
    width: 56,
    borderRadius: Radii.small,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    fontSize: 14,
  },
});
