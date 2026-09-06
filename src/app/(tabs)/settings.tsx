import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import type { CategoryType } from '@/domain/enums/category-type';
import { useAuthUser } from '@/features/auth/hooks/useAuthUser';
import { CancellationPhraseEditor } from '@/features/settings/components/cancellation-phrase-editor';
import { CategoryManagementSection } from '@/features/settings/components/category-management-section';
import { PresetManagementSection } from '@/features/settings/components/preset-management-section';
import { SoundPreferencesSection } from '@/features/settings/components/sound-preferences-section';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth/authStore';

const CATEGORY_TABS: { type: CategoryType; label: string }[] = [
  { type: 'study', label: 'Estudio' },
  { type: 'inverse', label: 'Ocio' },
  { type: 'invisible', label: 'Invisibles' },
];

/**
 * Pantalla real de Configuración/Gestión (SPEC.md sección 9.4): categorías (study/inverse/
 * invisible), presets, frase de cancelación y preferencias de sonido. Reemplaza el placeholder de
 * la Fase 2 — "Cerrar sesión" se mantiene igual.
 */
export default function SettingsScreen() {
  const theme = useTheme();
  const { user, profile } = useAuthUser();
  const logout = useAuthStore((s) => s.logout);
  const [activeCategoryTab, setActiveCategoryTab] = useState<CategoryType>('study');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <ThemedText type="subtitle">Configuración</ThemedText>
            <ThemedText themeColor="textSecondary">
              {profile?.displayName ? `${profile.displayName} · ` : ''}
              {user?.email}
            </ThemedText>
          </View>

          <View style={styles.block}>
            <ThemedText type="title" style={styles.blockTitle}>
              Categorías
            </ThemedText>
            <View style={styles.tabsRow}>
              {CATEGORY_TABS.map((tab) => {
                const selected = tab.type === activeCategoryTab;
                return (
                  <Pressable
                    key={tab.type}
                    accessibilityRole="button"
                    onPress={() => setActiveCategoryTab(tab.type)}
                    style={[
                      styles.tab,
                      { backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement },
                    ]}>
                    <ThemedText type="smallBold">{tab.label}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
            <CategoryManagementSection
              type={activeCategoryTab}
              title={CATEGORY_TABS.find((tab) => tab.type === activeCategoryTab)?.label ?? ''}
            />
          </View>

          <View style={styles.block}>
            <PresetManagementSection />
          </View>

          <View style={styles.block}>
            <CancellationPhraseEditor />
          </View>

          <View style={styles.block}>
            <SoundPreferencesSection />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void logout();
            }}
            style={({ pressed }) => [
              styles.logoutButton,
              { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
            ]}>
            <ThemedText type="smallBold">Cerrar sesión</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.five,
    paddingBottom: Spacing.six,
  },
  header: {
    gap: Spacing.one,
  },
  block: {
    gap: Spacing.three,
  },
  blockTitle: {
    fontSize: 20,
    lineHeight: 26,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tab: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radii.pill,
  },
  logoutButton: {
    marginTop: Spacing.two,
    borderRadius: Radii.small,
    paddingVertical: Spacing.two + Spacing.half,
    alignItems: 'center',
  },
});
