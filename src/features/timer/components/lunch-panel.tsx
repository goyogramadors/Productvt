import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import type { ActiveStudySession } from '@/domain/entities/active-session';
import { useLunchAction } from '@/features/timer/hooks/useLunchAction';
import { useTheme } from '@/hooks/use-theme';
import { timerCopy } from '@/i18n/es';

interface LunchPanelProps {
  active: ActiveStudySession;
}

/**
 * Botón "Almuerzo" (docs/03-CRONOMETRO.md sección 7): disponible desde `study_running`,
 * `break_running` y los 3 estados de espera — el padre (`timer-active-panel.tsx`) decide cuándo
 * montarlo (nunca durante `lunch_running`, que no es un origen válido de `REQUEST_LUNCH`).
 */
export function LunchPanel({ active }: LunchPanelProps) {
  const theme = useTheme();
  const lunch = useLunchAction(active);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!lunch.available || lunch.isDispatching}
      onPress={lunch.requestLunch}
      style={[styles.button, { backgroundColor: theme.backgroundElement, opacity: lunch.available ? 1 : 0.5 }]}>
      <ThemedText type="smallBold">🍽️ {timerCopy.lunch.button}</ThemedText>
      {!lunch.available ? (
        <ThemedText type="small" themeColor="textSecondary">
          {timerCopy.lunch.unavailable(lunch.cyclesUntilAvailable)}
        </ThemedText>
      ) : null}
      {lunch.error ? (
        <ThemedText type="small" style={styles.errorText}>
          {lunch.error}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Radii.medium,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    gap: Spacing.half,
  },
  errorText: { color: '#E05252' },
});
