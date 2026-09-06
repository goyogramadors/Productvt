import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import { useAuthUser } from '@/features/auth/hooks/useAuthUser';
import { InverseActivePanel } from '@/features/timer/components/inverse-active-panel';
import { InverseTimerForm } from '@/features/timer/components/inverse-timer-form';
import { TimerActivePanel } from '@/features/timer/components/timer-active-panel';
import { TimerSessionForm } from '@/features/timer/components/timer-session-form';
import { useActiveTimer } from '@/features/timer/hooks/useActiveTimer';
import { useTimerStore } from '@/features/timer/store/timerStore';
import { useTheme } from '@/hooks/use-theme';

type StartMode = 'study' | 'inverse';

/**
 * Núcleo del cronómetro (Fase 4a): reemplaza el placeholder. Sin sesión activa, ofrece arrancar un
 * bloque de estudio o un tiempo libre (excluyentes entre sí, docs/03-CRONOMETRO.md sección 12.4);
 * con una sesión activa, muestra el panel correspondiente. El estado en vivo viene de
 * `useActiveTimer` (`timerStore`, hidratado aquí una vez por sesión de usuario).
 */
export default function TimerScreen() {
  const theme = useTheme();
  const { user } = useAuthUser();
  const initialize = useTimerStore((s) => s.initialize);
  const { studyActive, inverseActive, isHydrating, remainingSeconds, liveEffectiveStudySeconds, isDominant } =
    useActiveTimer();
  const [startMode, setStartMode] = useState<StartMode>('study');

  useEffect(() => {
    if (!user) return;
    return initialize(user.uid);
  }, [user, initialize]);

  if (isHydrating) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText themeColor="textSecondary">Cargando…</ThemedText>
      </ThemedView>
    );
  }

  if (studyActive) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TimerActivePanel
            active={studyActive}
            remainingSeconds={remainingSeconds ?? 0}
            liveEffectiveStudySeconds={liveEffectiveStudySeconds ?? 0}
            isDominant={isDominant}
          />
        </ScrollView>
      </ThemedView>
    );
  }

  if (inverseActive) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <InverseActivePanel />
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.modeSwitch, { backgroundColor: theme.backgroundElement }]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setStartMode('study')}
            style={[styles.modeButton, startMode === 'study' && { backgroundColor: theme.background }]}>
            <ThemedText type="smallBold">Estudio</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setStartMode('inverse')}
            style={[styles.modeButton, startMode === 'inverse' && { backgroundColor: theme.background }]}>
            <ThemedText type="smallBold">Tiempo libre</ThemedText>
          </Pressable>
        </View>

        {startMode === 'study' ? <TimerSessionForm /> : <InverseTimerForm />}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.four, gap: Spacing.four },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modeSwitch: { flexDirection: 'row', borderRadius: Radii.pill, padding: Spacing.half },
  modeButton: { flex: 1, borderRadius: Radii.pill, paddingVertical: Spacing.two, alignItems: 'center' },
});
