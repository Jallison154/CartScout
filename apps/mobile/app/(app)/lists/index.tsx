import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { createList, fetchLists } from '@/api/lists';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { colors, radius, spacing, touchTargetMin } from '@/constants/theme';
import type { GroceryList } from '@/types/lists';
import { formatApiErrorMessage } from '@/utils/apiMessage';

export default function ListsIndexScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await fetchLists();
      setLists(data);
    } catch (e) {
      setError(formatApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityLabel="New list"
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => {
            setNewName('');
            setCreateError(null);
            setModalOpen(true);
          }}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
        >
          <Ionicons name="add" size={28} color={colors.systemBlue} />
        </Pressable>
      ),
    });
  }, [navigation]);

  async function submitNewList() {
    const name = newName.trim();
    if (!name) {
      setCreateError('Enter a name.');
      return;
    }
    setCreateError(null);
    setCreating(true);
    try {
      const list = await createList(name);
      setModalOpen(false);
      setNewName('');
      setLists((prev) => [list, ...prev]);
      router.push(`/lists/${list.id}`);
    } catch (e) {
      setCreateError(formatApiErrorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  if (loading && lists.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.systemBlue} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {error ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{error}</Text>
          <SecondaryButton onPress={() => void load()}>Retry</SecondaryButton>
        </View>
      ) : null}

      <FlatList
        contentContainerStyle={lists.length === 0 ? styles.emptyList : styles.listContent}
        data={lists}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No lists yet</Text>
            <Text style={styles.emptyBody}>Tap + to create your first grocery list.</Text>
          </View>
        }
        refreshing={loading}
        onRefresh={() => void load()}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/lists/${item.id}`)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.tertiaryLabel} />
          </Pressable>
        )}
      />

      <Modal animationType="fade" transparent visible={modalOpen} onRequestClose={() => setModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>New list</Text>
            <TextInput
              autoFocus
              onChangeText={setNewName}
              placeholder="List name"
              placeholderTextColor={colors.tertiaryLabel}
              style={styles.modalInput}
              value={newName}
            />
            {createError ? <Text style={styles.modalError}>{createError}</Text> : null}
            <View style={styles.modalActions}>
              <PrimaryButton loading={creating} onPress={() => void submitNewList()}>
                Create
              </PrimaryButton>
              <View style={{ height: spacing.sm }} />
              <SecondaryButton onPress={() => setModalOpen(false)}>Cancel</SecondaryButton>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.groupedBackground,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.groupedBackground,
  },
  banner: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  bannerText: {
    color: colors.systemRed,
    fontSize: 15,
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  emptyList: {
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTargetMin,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  rowPressed: {
    backgroundColor: colors.systemGray6,
  },
  rowTitle: {
    flex: 1,
    fontSize: 17,
    color: colors.label,
  },
  empty: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.label,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    fontSize: 16,
    color: colors.secondaryLabel,
    textAlign: 'center',
    lineHeight: 22,
  },
  headerBtn: {
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnPressed: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing.md,
    color: colors.label,
  },
  modalInput: {
    borderRadius: radius.sm,
    backgroundColor: colors.systemGray6,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    fontSize: 17,
    color: colors.label,
    marginBottom: spacing.sm,
  },
  modalError: {
    color: colors.systemRed,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  modalActions: {
    marginTop: spacing.md,
  },
});
