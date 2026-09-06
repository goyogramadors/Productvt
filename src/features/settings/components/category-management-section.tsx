import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import type { CategoryType } from '@/domain/enums/category-type';
import { CategoryForm } from '@/features/categories/components/category-form';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { useCreateCategory } from '@/features/categories/hooks/useCreateCategory';
import { useUpdateCategory } from '@/features/categories/hooks/useUpdateCategory';
import type { CategoryFormValues } from '@/features/categories/schemas/category-schema';
import { useTheme } from '@/hooks/use-theme';

interface CategoryManagementSectionProps {
  type: CategoryType;
  title: string;
}

/**
 * Gestión CRUD de categorías de un tipo (study/inverse/invisible), SPEC.md sección 12. Cada
 * instancia de este componente es independiente por `type` (tres sistemas de categoría separados,
 * SPEC.md sección 12.1) — `settings.tsx` monta una por pestaña/sección.
 */
export function CategoryManagementSection({ type, title }: CategoryManagementSectionProps) {
  const theme = useTheme();
  const { categories, isLoading } = useCategories(type);
  const { createCategory, isSubmitting: isCreating, error: createError, clearError: clearCreateError } =
    useCreateCategory();
  const { updateCategory, setArchived, isSubmitting: isUpdating, error: updateError } = useUpdateCategory();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const visibleCategories = categories.filter((category) => !category.isArchived);

  async function handleCreate(values: CategoryFormValues) {
    const created = await createCategory({ type, name: values.name, color: values.color });
    if (created) setIsAdding(false);
    return created;
  }

  async function handleUpdate(categoryId: string, values: CategoryFormValues) {
    const updated = await updateCategory(categoryId, { name: values.name, color: values.color });
    if (updated) setEditingId(null);
    return updated;
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setEditingId(null);
            clearCreateError();
            setIsAdding((value) => !value);
          }}>
          <ThemedText type="linkPrimary">{isAdding ? 'Cerrar' : '+ Nueva'}</ThemedText>
        </Pressable>
      </View>

      {isAdding ? (
        <View style={[styles.formCard, { backgroundColor: theme.backgroundElement }]}>
          <CategoryForm
            type={type}
            onSubmit={handleCreate}
            onCancel={() => setIsAdding(false)}
            isSubmitting={isCreating}
            submitLabel="Crear"
          />
          {createError ? (
            <ThemedText type="small" style={styles.errorText}>
              {createError}
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      {isLoading ? <ActivityIndicator style={styles.loader} /> : null}

      {!isLoading && visibleCategories.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Sin categorías todavía.
        </ThemedText>
      ) : null}

      {visibleCategories.map((category) =>
        editingId === category.id ? (
          <View key={category.id} style={[styles.formCard, { backgroundColor: theme.backgroundElement }]}>
            <CategoryForm
              type={type}
              initialValues={category}
              onSubmit={(values) => handleUpdate(category.id, values)}
              onCancel={() => setEditingId(null)}
              isSubmitting={isUpdating}
              submitLabel="Guardar"
            />
          </View>
        ) : (
          <Pressable
            key={category.id}
            style={styles.categoryRow}
            onPress={() => {
              setIsAdding(false);
              setEditingId(category.id);
            }}>
            <View style={[styles.swatch, { backgroundColor: category.color }]} />
            <ThemedText style={styles.categoryName}>{category.name}</ThemedText>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={(event) => {
                event.stopPropagation();
                void setArchived(category.id, true);
              }}>
              <ThemedText type="small" themeColor="textSecondary">
                Archivar
              </ThemedText>
            </Pressable>
          </Pressable>
        )
      )}

      {updateError ? (
        <ThemedText type="small" style={styles.errorText}>
          {updateError}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formCard: {
    borderRadius: Radii.medium,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  loader: {
    marginVertical: Spacing.two,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: Radii.pill,
  },
  categoryName: {
    flex: 1,
  },
  errorText: {
    color: '#E05252',
  },
});
