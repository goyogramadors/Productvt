import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

/** Placeholder: el núcleo del cronómetro (SPEC.md sección 15) llega en una fase futura. */
export default function TimerScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">Cronómetro</ThemedText>
      <ThemedText themeColor="textSecondary">Fase pendiente</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
