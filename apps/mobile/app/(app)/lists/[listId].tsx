import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createListItem,
  deleteListItem,
  fetchListDetail,
  patchListItem,
} from '@/api/lists';
import { searchProducts } from '@/api/products';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { colors, radius, spacing, touchTargetMin } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { ListItem } from '@/types/lists';
import type { CanonicalProduct } from '@/types/products';
import { formatApiErrorMessage } from '@/utils/apiMessage';

const SEARCH_DEBOUNCE_MS = 320;

function itemDisplayLabel(item: ListItem): string {
  const fromProduct = item.product?.display_name?.trim();
  if (fromProduct) {
    return fromProduct;
  }
  return item.free_text?.trim() ?? '';
}

export default function ListDetailScreen() {
  const { listId: listIdParam } = useLocalSearchParams<{ listId: string }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const listId = Number(listIdParam);

  const [listName, setListName] = useState<string | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [suggestions, setSuggestions] = useState<CanonicalProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const debouncedDraft = useDebouncedValue(draft, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    const q = debouncedDraft.trim();
    if (!q) {
      setSuggestions([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    setSuggestions([]);

    void (async () => {
      try {
        const products = await searchProducts(q);
        if (!cancelled) {
          setSuggestions(products);
        }
      } catch {
        if (!cancelled) {
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedDraft]);

  const load = useCallback(async () => {
    if (!Number.isInteger(listId) || listId < 1) {
      setError('Invalid list.');
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const detail = await fetchListDetail(listId);
      setListName(detail.list.name);
      setItems(detail.items);
    } catch (e) {
      setError(formatApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [listId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useLayoutEffect(() => {
    if (listName) {
      navigation.setOptions({ title: listName });
    }
  }, [listName, navigation]);

  async function toggleItem(item: ListItem) {
    const next = !item.checked;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, checked: next } : i)),
    );
    try {
      await patchListItem(listId, item.id, { checked: next });
    } catch {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, checked: item.checked } : i)),
      );
      Alert.alert('Could not update', 'Please try again.');
    }
  }

  function confirmDeleteItem(item: ListItem) {
    const label = itemDisplayLabel(item) || 'Item';
    Alert.alert('Remove item?', label, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => void removeItem(item),
      },
    ]);
  }

  async function removeItem(item: ListItem) {
    try {
      await deleteListItem(listId, item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (e) {
      Alert.alert('Could not remove', formatApiErrorMessage(e));
    }
  }

  async function addItem() {
    const text = draft.trim();
    if (!text) {
      return;
    }
    setAdding(true);
    try {
      const item = await createListItem(listId, { free_text: text });
      setItems((prev) => [...prev, item]);
      setDraft('');
      setSuggestions([]);
    } catch (e) {
      Alert.alert('Could not add item', formatApiErrorMessage(e));
    } finally {
      setAdding(false);
    }
  }

  async function addCanonicalProduct(product: CanonicalProduct) {
    Keyboard.dismiss();
    setAdding(true);
    try {
      const item = await createListItem(listId, {
        canonical_product_id: product.id,
      });
      setItems((prev) => [...prev, item]);
      setDraft('');
      setSuggestions([]);
    } catch (e) {
      Alert.alert('Could not add item', formatApiErrorMessage(e));
    } finally {
      setAdding(false);
    }
  }

  const showSuggestions =
    draft.trim().length > 0 && (searchLoading || suggestions.length > 0);

  if (!Number.isInteger(listId) || listId < 1) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>This list is not valid.</Text>
      </View>
    );
  }

  if (loading && !listName) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.systemBlue} size="large" />
      </View>
    );
  }

  if (error && !listName) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <View style={{ height: spacing.md }} />
        <PrimaryButton onPress={() => void load()}>Retry</PrimaryButton>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      style={styles.flex}
    >
      <FlatList
        contentContainerStyle={styles.listContent}
        data={items}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No items yet. Add something below.</Text>
          </View>
        }
        refreshing={loading}
        onRefresh={() => void load()}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <Pressable
              accessibilityLabel={item.checked ? 'Mark not done' : 'Mark done'}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.checked }}
              hitSlop={8}
              onPress={() => void toggleItem(item)}
              style={styles.checkHit}
            >
              <Ionicons
                name={item.checked ? 'checkmark-circle' : 'ellipse-outline'}
                size={26}
                color={item.checked ? colors.systemBlue : colors.tertiaryLabel}
              />
            </Pressable>
            <Text
              style={[styles.itemText, item.checked && styles.itemTextDone]}
              numberOfLines={3}
            >
              {itemDisplayLabel(item)}
              {item.quantity ? ` · ${item.quantity}` : ''}
            </Text>
            <Pressable
              accessibilityLabel="Remove item"
              hitSlop={8}
              onPress={() => confirmDeleteItem(item)}
              style={styles.trashHit}
            >
              <Ionicons name="trash-outline" size={22} color={colors.systemRed} />
            </Pressable>
          </View>
        )}
        style={styles.listFlex}
      />

      {showSuggestions ? (
        <View style={styles.suggestionsCard}>
          {searchLoading && suggestions.length === 0 ? (
            <View style={styles.suggestionsLoading}>
              <ActivityIndicator color={colors.systemBlue} />
            </View>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              style={styles.suggestionsScroll}
            >
              {suggestions.map((p) => (
                <Pressable
                  key={p.id}
                  accessibilityLabel={`Add ${p.display_name}`}
                  accessibilityRole="button"
                  onPress={() => void addCanonicalProduct(p)}
                  style={({ pressed }) => [
                    styles.suggestionRow,
                    pressed && styles.suggestionRowPressed,
                  ]}
                >
                  <Text style={styles.suggestionTitle} numberOfLines={2}>
                    {p.display_name}
                  </Text>
                  {p.brand ? (
                    <Text style={styles.suggestionSubtitle} numberOfLines={1}>
                      {p.brand}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      ) : null}

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <TextInput
          onChangeText={setDraft}
          onSubmitEditing={() => void addItem()}
          placeholder="Add item"
          placeholderTextColor={colors.tertiaryLabel}
          returnKeyType="done"
          style={styles.footerInput}
          value={draft}
        />
        <View style={styles.addButton}>
          <PrimaryButton loading={adding} onPress={() => void addItem()}>
            Add
          </PrimaryButton>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.groupedBackground,
  },
  listFlex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.groupedBackground,
  },
  errorText: {
    fontSize: 16,
    color: colors.secondaryLabel,
    textAlign: 'center',
  },
  listContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  empty: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: colors.secondaryLabel,
    textAlign: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTargetMin + 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  checkHit: {
    marginRight: spacing.md,
  },
  itemText: {
    flex: 1,
    fontSize: 17,
    color: colors.label,
    lineHeight: 22,
  },
  itemTextDone: {
    color: colors.secondaryLabel,
    textDecorationLine: 'line-through',
  },
  trashHit: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
  },
  footerInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    fontSize: 17,
    backgroundColor: colors.systemGray6,
    color: colors.label,
  },
  addButton: {
    flexShrink: 0,
  },
  suggestionsCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    maxHeight: 220,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
    overflow: 'hidden',
  },
  suggestionsScroll: {
    maxHeight: 220,
  },
  suggestionsLoading: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  suggestionRowPressed: {
    backgroundColor: colors.systemGray6,
  },
  suggestionTitle: {
    fontSize: 17,
    color: colors.label,
  },
  suggestionSubtitle: {
    marginTop: 2,
    fontSize: 15,
    color: colors.secondaryLabel,
  },
});
