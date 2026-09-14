import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, StatusColors } from '@/constants/theme';
import { useDominantHandoff } from '@/features/timer/hooks/useDominantHandoff';
import { useTheme } from '@/hooks/use-theme';
import { timerCopy } from '@/i18n/es';

/**
 * Diálogo "¿Cambiar de dominante?" (docs/04-SINCRONIZACION.md sección 5.2/5.4): el MISMO componente
 * se monta tanto en el dispositivo dominante como en el espectador que pidió el control — ambos ven
 * exactamente los mismos botones "Sí"/"No", porque `confirmTakeover()`/`rejectOrWithdraw()` son la
 * misma operación sin importar quién la ejecuta (sección 5.3: Firestore, no la UI, decide quién
 * gana si ambos confirman casi al mismo tiempo). Se monta una única vez en `app/(tabs)/timer.tsx`,
 * visible independientemente de qué panel esté activo.
 */
export function DominantHandoffDialog() {
  const theme = useTheme();
  const handoff = useDominantHandoff();

  if (!handoff.isDialogVisible) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.background }]}>
          <ThemedText type="subtitle">{timerCopy.handoff.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {handoff.isRequester
              ? timerCopy.handoff.bodyAsRequester
              : timerCopy.handoff.bodyAsDominant(handoff.requesterDeviceName ?? 'Otro dispositivo')}
          </ThemedText>

          {handoff.error ? (
            <ThemedText type="small" style={styles.errorText}>
              {handoff.error}
            </ThemedText>
          ) : null}

          <View style={styles.buttonsRow}>
            <Pressable
              accessibilityRole="button"
              disabled={handoff.isSubmitting}
              onPress={() => void handoff.rejectOrWithdraw()}
              style={[styles.button, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">{timerCopy.handoff.reject}</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={handoff.isSubmitting}
              onPress={() => void handoff.confirmTakeover()}
              style={[styles.button, { backgroundColor: StatusColors.success }]}>
              <ThemedText type="smallBold" themeColor="background">
                {timerCopy.handoff.confirm}
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
    maxWidth: 380,
    borderRadius: Radii.large,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  buttonsRow: { flexDirection: 'row', gap: Spacing.two, justifyContent: 'flex-end' },
  button: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.four, borderRadius: Radii.medium },
  errorText: { color: '#E05252' },
});
