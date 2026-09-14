import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

/** Placeholder: el calendario (SPEC.md sección 23) llega en una fase futura. */
export default function CalendarScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">Calendario</ThemedText>
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
