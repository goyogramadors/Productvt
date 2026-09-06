import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

/** Placeholder: las estadísticas (SPEC.md sección 25) llegan en una fase futura. */
export default function StatsScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">Estadísticas</ThemedText>
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
