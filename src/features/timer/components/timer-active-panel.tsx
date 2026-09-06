import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, StatusColors } from '@/constants/theme';
import type { ActiveStudySession } from '@/domain/entities/active-session';
import { secondsToMinutes } from '@/domain/value-objects/duration-seconds';
import { BreakSelectorModal } from '@/features/timer/components/break-selector-modal';
import { CancelSessionModal } from '@/features/timer/components/cancel-session-modal';
import { LunchPanel } from '@/features/timer/components/lunch-panel';
import { useBreakSelection } from '@/features/timer/hooks/useBreakSelection';
import { useCancelStudySession } from '@/features/timer/hooks/useCancelStudySession';
import { useStudyTimerDispatch } from '@/features/timer/hooks/useStudyTimerDispatch';
import { formatHoursMinutesSeconds, formatMinutesSeconds } from '@/features/timer/utils/formatDuration';
import { useTheme } from '@/hooks/use-theme';
import { timerCopy } from '@/i18n/es';

interface TimerActivePanelProps {
  active: ActiveStudySession;
  remainingSeconds: number;
  liveEffectiveStudySeconds: number;
  isDominant: boolean;
}

const STATE_LABELS: Record<ActiveStudySession['currentState'], string> = {
  idle: 'Inactivo',
  study_running: 'Estudiando',
  study_completed_waiting_response: 'Bloque terminado — ¿seguís?',
  break_selection: 'Elegí tu descanso',
  break_running: 'Descansando',
  break_completed_waiting_response: 'Descanso terminado — ¿continuás?',
  lunch_running: 'Almuerzo',
  session_completed: 'Sesión terminada',
  session_cancelled: 'Sesión cancelada',
  session_expired: 'Sesión expirada',
};

/**
 * Panel principal del cronómetro en curso (docs/03-CRONOMETRO.md, todos los estados activos):
 * muestra `remaining` (§10.1), `effectiveStudySeconds` en vivo (§10.3), ciclo, banco y el deadline
 * si aplica, y monta la acción/modal que corresponde al `currentState` vigente.
 */
export function TimerActivePanel({ active, remainingSeconds, liveEffectiveStudySeconds, isDominant }: TimerActivePanelProps) {
  const theme = useTheme();
  const breakSelection = useBreakSelection(active);
  const cancellation = useCancelStudySession(active);
  const { dispatch, isDispatching, error, clearError } = useStudyTimerDispatch();

  const showLunchPanel = active.currentState !== 'lunch_running';
  const isWaitingState =
    active.currentState === 'study_completed_waiting_response' ||
    active.currentState === 'break_selection' ||
    active.currentState === 'break_completed_waiting_response';

  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        {active.name}
      </ThemedText>
      <ThemedText type="smallBold">{STATE_LABELS[active.currentState]}</ThemedText>

      <ThemedText type="title" style={styles.clock}>
        {isWaitingState ? formatMinutesSeconds(remainingSeconds) : formatHoursMinutesSeconds(remainingSeconds)}
      </ThemedText>

      <View style={styles.statsRow}>
        <Stat label="Bloques" value={String(active.cyclesCompleted)} />
        <Stat label="Estudio efectivo" value={`${Math.round(secondsToMinutes(liveEffectiveStudySeconds))} min`} />
        <Stat label="Banco" value={`${Math.round(secondsToMinutes(active.bankRemainingSeconds))} min`} />
      </View>

      {!isDominant ? (
        <ThemedText type="small" themeColor="textSecondary">
          Estás viendo esta sesión desde otro dispositivo (modo espectador).
        </ThemedText>
      ) : null}

      {error ? (
        <ThemedText type="small" style={styles.errorText}>
          {error}
        </ThemedText>
      ) : null}

      {active.currentState === 'study_completed_waiting_response' ? (
        <Pressable
          accessibilityRole="button"
          disabled={isDispatching}
          onPress={() => {
            clearError();
            void dispatch(active, { type: 'ACK_STUDY_FINISHED' });
          }}
          style={[styles.primaryButton, { backgroundColor: theme.text }]}>
          <ThemedText type="smallBold" themeColor="background">
            Seguir
          </ThemedText>
        </Pressable>
      ) : null}

      {active.currentState === 'break_completed_waiting_response' ? (
        <View style={styles.buttonsRow}>
          <Pressable
            accessibilityRole="button"
            disabled={breakSelection.isDispatching}
            onPress={() => void breakSelection.continueStudy()}
            style={[styles.primaryButton, { backgroundColor: theme.text }]}>
            <ThemedText type="smallBold" themeColor="background">
              {timerCopy.waitingBreakCompleted.continueStudy}
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={breakSelection.isDispatching}
            onPress={() => void breakSelection.endSession()}
            style={[styles.secondaryButton, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">{timerCopy.waitingBreakCompleted.endSession}</ThemedText>
          </Pressable>
        </View>
      ) : null}

      {showLunchPanel ? <LunchPanel active={active} /> : null}

      <Pressable accessibilityRole="button" onPress={cancellation.open} style={styles.cancelLink}>
        <ThemedText type="small" style={{ color: StatusColors.danger }}>
          {timerCopy.cancelSession.title}
        </ThemedText>
      </Pressable>

      <BreakSelectorModal active={active} remainingSeconds={remainingSeconds} />
      <CancelSessionModal cancellation={cancellation} />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="smallBold">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three, alignItems: 'center' },
  clock: { fontVariant: ['tabular-nums'] },
  statsRow: { flexDirection: 'row', gap: Spacing.four, marginVertical: Spacing.two },
  stat: { alignItems: 'center', gap: Spacing.half },
  primaryButton: { borderRadius: Radii.medium, paddingVertical: Spacing.three, paddingHorizontal: Spacing.five, alignItems: 'center' },
  secondaryButton: { borderRadius: Radii.medium, paddingVertical: Spacing.three, paddingHorizontal: Spacing.five, alignItems: 'center' },
  buttonsRow: { flexDirection: 'row', gap: Spacing.two },
  cancelLink: { paddingVertical: Spacing.two },
  errorText: { color: '#E05252' },
});
