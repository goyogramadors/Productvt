import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import type { ActiveStudySession } from '@/domain/entities/active-session';
import { minutesToSeconds, secondsToMinutes } from '@/domain/value-objects/duration-seconds';
import { useBreakSelection } from '@/features/timer/hooks/useBreakSelection';
import { LunchPanel } from '@/features/timer/components/lunch-panel';
import { formatMinutesSeconds } from '@/features/timer/utils/formatDuration';
import { useTheme } from '@/hooks/use-theme';
import { timerCopy } from '@/i18n/es';

interface BreakSelectorModalProps {
  active: ActiveStudySession;
  remainingSeconds: number | null;
}

/**
 * Las cinco salidas de `break_selection` (docs/03-CRONOMETRO.md sección 5): tomar sugerido,
 * personalizado, saltar, almuerzo, terminar sesión. Visible únicamente mientras
 * `active.currentState === 'break_selection'`.
 */
export function BreakSelectorModal({ active, remainingSeconds }: BreakSelectorModalProps) {
  const theme = useTheme();
  const breakSelection = useBreakSelection(active);
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('0');

  const visible = active.currentState === 'break_selection';
  const suggestedMinutes = Math.round(secondsToMinutes(breakSelection.grantedSeconds));
  const availableMinutes = Math.floor(secondsToMinutes(breakSelection.availableSeconds));

  async function handleCustomSubmit() {
    const minutes = Number(customMinutes);
    if (!Number.isFinite(minutes)) return;
    const chosenSeconds = minutesToSeconds(Math.min(Math.max(minutes, 0), availableMinutes));
    const outcome = await breakSelection.chooseCustom(chosenSeconds);
    if (outcome) setIsCustomOpen(false);
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.background }]}>
          <ThemedText type="subtitle">{timerCopy.breakSelection.title}</ThemedText>
          {remainingSeconds !== null ? (
            <ThemedText type="small" themeColor="textSecondary">
              Tenés {formatMinutesSeconds(remainingSeconds)} para elegir
            </ThemedText>
          ) : null}

          {breakSelection.error ? (
            <ThemedText type="small" style={styles.errorText}>
              {breakSelection.error}
            </ThemedText>
          ) : null}

          {breakSelection.grantedSeconds > 0 ? (
            <Pressable
              accessibilityRole="button"
              disabled={breakSelection.isDispatching}
              onPress={() => void breakSelection.chooseSuggested()}
              style={[styles.primaryButton, { backgroundColor: theme.text }]}>
              <ThemedText type="smallBold" themeColor="background">
                {timerCopy.breakSelection.takeSuggested(suggestedMinutes)}
              </ThemedText>
            </Pressable>
          ) : null}

          {isCustomOpen ? (
            <View style={styles.customRow}>
              <TextInput
                value={customMinutes}
                onChangeText={setCustomMinutes}
                keyboardType="number-pad"
                style={[styles.customInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              />
              <ThemedText type="small" themeColor="textSecondary">
                de hasta {availableMinutes} min
              </ThemedText>
              <Pressable accessibilityRole="button" onPress={() => void handleCustomSubmit()}>
                <ThemedText type="linkPrimary">Confirmar</ThemedText>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsCustomOpen(true)}
              style={[styles.secondaryButton, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">{timerCopy.breakSelection.custom}</ThemedText>
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={breakSelection.isDispatching}
            onPress={() => void breakSelection.skip()}
            style={[styles.secondaryButton, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">{timerCopy.breakSelection.skip}</ThemedText>
          </Pressable>

          <LunchPanel active={active} />

          <Pressable
            accessibilityRole="button"
            disabled={breakSelection.isDispatching}
            onPress={() => void breakSelection.endSession()}
            style={styles.endSessionButton}>
            <ThemedText type="small" themeColor="textSecondary">
              {timerCopy.breakSelection.endSession}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: Radii.large,
    borderTopRightRadius: Radii.large,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  primaryButton: { borderRadius: Radii.medium, paddingVertical: Spacing.three, alignItems: 'center' },
  secondaryButton: { borderRadius: Radii.medium, paddingVertical: Spacing.three, alignItems: 'center' },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  customInput: { borderRadius: Radii.small, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, width: 64, textAlign: 'center' },
  endSessionButton: { alignItems: 'center', paddingVertical: Spacing.two },
  errorText: { color: '#E05252' },
});
