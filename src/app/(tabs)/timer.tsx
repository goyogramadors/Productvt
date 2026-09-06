import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import { DominantHandoffDialog } from '@/features/timer/components/dominant-handoff-dialog';
import { InverseActivePanel } from '@/features/timer/components/inverse-active-panel';
import { InverseTimerForm } from '@/features/timer/components/inverse-timer-form';
import { TimerActivePanel } from '@/features/timer/components/timer-active-panel';
import { TimerSessionForm } from '@/features/timer/components/timer-session-form';
import { useActiveTimer } from '@/features/timer/hooks/useActiveTimer';
import { useTheme } from '@/hooks/use-theme';
import { timerCopy } from '@/i18n/es';

type StartMode = 'study' | 'inverse';

/**
 * Núcleo del cronómetro: sin sesión activa, ofrece arrancar un bloque de estudio o un tiempo libre
 * (excluyentes entre sí, docs/03-CRONOMETRO.md sección 12.4); con una sesión activa, muestra el
 * panel correspondiente. El estado en vivo viene de `useActiveTimer` (`timerStore`, hidratado una
 * única vez en `app/_layout.tsx` — docs/04-SINCRONIZACION.md sección 8).
 *
 * Restricción de plataforma web (docs/04-SINCRONIZACION.md sección 5.1 punto 1, sección 10):
 * `canBeDominant('web') === false`, así que sin sesión activa la web nunca ve los formularios de
 * inicio — no tendría sentido mostrar un botón que el coordinador rechazaría igual, y la sección
 * 5.1 pide explícitamente que ni siquiera se renderice.
 */
export default function TimerScreen() {
  const theme = useTheme();
  const { studyActive, inverseActive, isHydrating, remainingSeconds, liveEffectiveStudySeconds, isDominant } =
    useActiveTimer();
  const [startMode, setStartMode] = useState<StartMode>('study');

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
        <DominantHandoffDialog />
      </ThemedView>
    );
  }

  if (inverseActive) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <InverseActivePanel />
        </ScrollView>
        <DominantHandoffDialog />
      </ThemedView>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.webReadOnlyText}>
          {timerCopy.spectator.webReadOnly}
        </ThemedText>
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  webReadOnlyText: { textAlign: 'center' },
  modeSwitch: { flexDirection: 'row', borderRadius: Radii.pill, padding: Spacing.half },
  modeButton: { flex: 1, borderRadius: Radii.pill, paddingVertical: Spacing.two, alignItems: 'center' },
});
