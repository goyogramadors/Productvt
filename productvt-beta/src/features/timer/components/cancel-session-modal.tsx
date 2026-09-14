import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, StatusColors } from '@/constants/theme';
import type { useCancelStudySession } from '@/features/timer/hooks/useCancelStudySession';
import { useTheme } from '@/hooks/use-theme';
import { timerCopy } from '@/i18n/es';
import { useAuthStore } from '@/store/auth/authStore';
import { updateCancellationPhraseService } from '@/features/settings/services/settings-service';

interface CancelSessionModalProps {
  /**
   * La misma instancia que devuelve `useCancelStudySession` en el padre (`timer-active-panel.tsx`,
   * que también dispara `cancellation.open()` desde su botón "Cancelar sesión") — nunca una
   * instancia propia: el estado de la doble confirmación (`phase`) debe ser uno solo.
   */
  cancellation: ReturnType<typeof useCancelStudySession>;
}

/**
 * Doble confirmación 15+15s (docs/03-CRONOMETRO.md sección 8.1): "Cancelar sesión" con la frase
 * personalizable del perfil (editable in situ con el ícono lápiz, SPEC.md sección 20.2). No pausa
 * la ventana de respuesta del estado de origen — corre en paralelo (sección 8.2).
 */
export function CancelSessionModal({ cancellation }: CancelSessionModalProps) {
  const theme = useTheme();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [isEditingPhrase, setIsEditingPhrase] = useState(false);
  const [draftPhrase, setDraftPhrase] = useState(profile?.cancellationPhrase ?? '');

  function handleClose() {
    cancellation.dismiss();
  }

  async function handleSavePhrase() {
    if (!user) return;
    await updateCancellationPhraseService(user.uid, draftPhrase);
    await refreshProfile();
    setIsEditingPhrase(false);
  }

  const isLocked = cancellation.phase === 'waiting_first' || cancellation.phase === 'waiting_second';
  const isSecondStep = cancellation.phase === 'waiting_second' || cancellation.phase === 'ready_second';

  const confirmLabel = isLocked
    ? isSecondStep
      ? timerCopy.cancelSession.secondConfirmLocked(cancellation.secondsRemaining)
      : timerCopy.cancelSession.firstConfirmLocked(cancellation.secondsRemaining)
    : isSecondStep
      ? timerCopy.cancelSession.secondConfirmReady
      : timerCopy.cancelSession.firstConfirmReady;

  return (
    <Modal visible={cancellation.isOpen} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.background }]}>
          <ThemedText type="subtitle">{timerCopy.cancelSession.title}</ThemedText>

          {isEditingPhrase ? (
            <View style={styles.editRow}>
              <TextInput
                value={draftPhrase}
                onChangeText={setDraftPhrase}
                multiline
                style={[styles.phraseInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              />
              <Pressable accessibilityRole="button" onPress={handleSavePhrase}>
                <ThemedText type="linkPrimary">Guardar</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.editRow}>
              <ThemedText style={styles.phraseText}>{profile?.cancellationPhrase}</ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={timerCopy.cancelSession.editPhrase}
                onPress={() => {
                  setDraftPhrase(profile?.cancellationPhrase ?? '');
                  setIsEditingPhrase(true);
                }}>
                <ThemedText>✏️</ThemedText>
              </Pressable>
            </View>
          )}

          {cancellation.error ? (
            <ThemedText type="small" style={styles.errorText}>
              {cancellation.error}
            </ThemedText>
          ) : null}

          <View style={styles.buttonsRow}>
            <Pressable accessibilityRole="button" onPress={handleClose} style={styles.dismissButton}>
              <ThemedText type="smallBold">{timerCopy.cancelSession.dismiss}</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isLocked || cancellation.isDispatching}
              onPress={cancellation.confirm}
              style={[
                styles.confirmButton,
                { backgroundColor: StatusColors.danger, opacity: isLocked || cancellation.isDispatching ? 0.5 : 1 },
              ]}>
              <ThemedText type="smallBold" themeColor="background">
                {confirmLabel}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radii.large,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  phraseText: { flex: 1 },
  phraseInput: {
    flex: 1,
    borderRadius: Radii.medium,
    padding: Spacing.two,
    minHeight: 60,
  },
  buttonsRow: { flexDirection: 'row', gap: Spacing.two, justifyContent: 'flex-end' },
  dismissButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.medium,
  },
  confirmButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.medium,
  },
  errorText: { color: '#E05252' },
});
