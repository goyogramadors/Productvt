import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, StatusColors } from '@/constants/theme';
import { useInverseTimer } from '@/features/timer/hooks/useInverseTimer';
import { formatHoursMinutesSeconds } from '@/features/timer/utils/formatDuration';
import { useTheme } from '@/hooks/use-theme';
import { timerCopy } from '@/i18n/es';

/**
 * Panel del temporizador inverso en curso (docs/03-CRONOMETRO.md sección 12): tiempo transcurrido,
 * aviso de "meta alcanzada" al llegar a `T` (solo resalta el botón, no cierra nada), recordatorios
 * cada 15 min, y cancelación con confirmación SIMPLE (un solo toque, sección 12.5 — no la doble
 * confirmación 15+15s del estudio).
 */
export function InverseActivePanel() {
  const theme = useTheme();
  const inverse = useInverseTimer();
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  if (!inverse.inverseActive) return null;

  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        {inverse.inverseActive.name}
      </ThemedText>
      <ThemedText type="smallBold">Tiempo libre</ThemedText>

      <ThemedText type="title" style={styles.clock}>
        {formatHoursMinutesSeconds(inverse.elapsedSeconds)}
      </ThemedText>

      {inverse.targetReached ? (
        <ThemedText type="small" style={{ color: StatusColors.success }}>
          {timerCopy.inverse.targetReachedNotificationTitle} 🎉
        </ThemedText>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Objetivo: {formatHoursMinutesSeconds(inverse.inverseActive.targetDurationSeconds)}
        </ThemedText>
      )}

      {inverse.remindersDue > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {inverse.remindersDue} recordatorio{inverse.remindersDue === 1 ? '' : 's'} desde que empezaste
        </ThemedText>
      ) : null}

      {inverse.error ? (
        <ThemedText type="small" style={styles.errorText}>
          {inverse.error}
        </ThemedText>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={inverse.isSubmitting}
        onPress={() => void inverse.finish()}
        style={[
          styles.finishButton,
          { backgroundColor: inverse.targetReached ? StatusColors.success : theme.text },
        ]}>
        <ThemedText type="smallBold" themeColor="background">
          Finalizar
        </ThemedText>
      </Pressable>

      <Pressable accessibilityRole="button" onPress={() => setIsCancelOpen(true)} style={styles.cancelLink}>
        <ThemedText type="small" style={{ color: StatusColors.danger }}>
          Cancelar
        </ThemedText>
      </Pressable>

      <Modal visible={isCancelOpen} transparent animationType="fade" onRequestClose={() => setIsCancelOpen(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.card, { backgroundColor: theme.background }]}>
            <ThemedText type="smallBold">{timerCopy.inverse.cancelTitle}</ThemedText>
            <View style={styles.buttonsRow}>
              <Pressable accessibilityRole="button" onPress={() => setIsCancelOpen(false)}>
                <ThemedText type="smallBold">{timerCopy.inverse.cancelDismiss}</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={async () => {
                  setIsCancelOpen(false);
                  await inverse.confirmCancel();
                }}>
                <ThemedText type="smallBold" style={{ color: StatusColors.danger }}>
                  {timerCopy.inverse.cancelConfirm}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three, alignItems: 'center' },
  clock: { fontVariant: ['tabular-nums'] },
  finishButton: { borderRadius: Radii.medium, paddingVertical: Spacing.three, paddingHorizontal: Spacing.five, alignItems: 'center' },
  cancelLink: { paddingVertical: Spacing.two },
  errorText: { color: '#E05252' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.four },
  card: { width: '100%', maxWidth: 380, borderRadius: Radii.large, padding: Spacing.four, gap: Spacing.three },
  buttonsRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
