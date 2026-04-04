import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  fetchListOptimization,
  patchListItem,
} from '@/api/lists';
import { fetchProductStorePrices, searchProducts } from '@/api/products';
import { CenteredError } from '@/components/ui/CenteredError';
import { CenteredLoading } from '@/components/ui/CenteredLoading';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { colors, radius, spacing, touchTargetMin } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { ListOptimizationResult } from '@/types/listOptimization';
import type { ListItem } from '@/types/lists';
import type { PriceSource, StoreProductPrice } from '@/types/productPrices';
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

function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const SOURCE_LABEL: Record<PriceSource, string> = {
  manual: 'Manual',
  estimate: 'Estimate',
  receipt: 'Receipt',
};

type ItemPriceState =
  | { status: 'loading'; prices: [] }
  | { status: 'ready'; prices: StoreProductPrice[] }
  | { status: 'error'; prices: []; errorMessage: string };

const SAVINGS_GREEN = '#34C759';

type ListOptimizationPanelProps = {
  loading: boolean;
  error: string | null;
  data: ListOptimizationResult | null;
  planExpanded: boolean;
  onTogglePlan: () => void;
};

function ListOptimizationPanel({
  loading,
  error,
  data,
  planExpanded,
  onTogglePlan,
}: ListOptimizationPanelProps) {
  return (
    <View style={optimizeStyles.wrap}>
      <View style={optimizeStyles.card}>
        <Text style={optimizeStyles.cardTitle}>Store savings</Text>

        {loading && !data ? (
          <View style={optimizeStyles.cardLoading}>
            <ActivityIndicator color={colors.systemBlue} size="small" />
            <Text style={optimizeStyles.cardMuted}>Comparing stores…</Text>
          </View>
        ) : null}

        {error && !data ? (
          <Text style={optimizeStyles.cardError}>{error}</Text>
        ) : null}

        {data && data.optimizable_line_count === 0 ? (
          <Text style={optimizeStyles.cardMuted}>
            Add catalog items (from search) to compare prices and see savings.
          </Text>
        ) : null}

        {data && data.optimizable_line_count > 0 ? (
          <>
            <View style={optimizeStyles.metricBlock}>
              <Text style={optimizeStyles.metricLabel}>Cheapest one-stop shop</Text>
              <Text style={optimizeStyles.metricValue}>
                {data.best_single_store
                  ? `${data.best_single_store.store.name} · ${formatUsd(data.best_single_store.total)}`
                  : 'No single store prices every item'}
              </Text>
            </View>

            <View style={optimizeStyles.metricBlock}>
              <Text style={optimizeStyles.metricLabel}>Multi-store total</Text>
              <Text style={optimizeStyles.metricValue}>{formatUsd(data.split_total)}</Text>
              <Text style={optimizeStyles.metricHint}>
                If you buy each line at its cheapest store
              </Text>
            </View>

            <View style={optimizeStyles.metricBlock}>
              <Text style={optimizeStyles.metricLabel}>You save</Text>
              {data.savings != null ? (
                <>
                  <Text
                    style={[
                      optimizeStyles.metricValueLarge,
                      data.savings > 0 && optimizeStyles.metricSavingsPositive,
                    ]}
                  >
                    {formatUsd(data.savings)}
                  </Text>
                  <Text style={optimizeStyles.metricHint}>
                    {data.savings > 0 && data.best_single_store
                      ? `vs. ${data.best_single_store.store.name} for everything priced`
                      : data.savings === 0
                        ? 'Same total as the best single-store run'
                        : 'Compared to your best one-stop total'}
                  </Text>
                </>
              ) : (
                <Text style={optimizeStyles.metricValueMuted}>
                  Add prices so we can compare one-stop vs. split shopping
                </Text>
              )}
            </View>

            {loading && data ? (
              <Text style={optimizeStyles.updatingHint}>Updating…</Text>
            ) : null}
          </>
        ) : null}

        {error && data ? <Text style={optimizeStyles.cardErrorSmall}>{error}</Text> : null}
      </View>

      {data && data.optimizable_line_count > 0 && data.split_plan.length > 0 ? (
        <View style={optimizeStyles.planCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: planExpanded }}
            onPress={onTogglePlan}
            style={({ pressed }) => [
              optimizeStyles.planToggle,
              pressed && optimizeStyles.planTogglePressed,
            ]}
          >
            <Text style={optimizeStyles.planToggleLabel}>Shopping plan</Text>
            <Ionicons
              name={planExpanded ? 'chevron-up' : 'chevron-down'}
              size={22}
              color={colors.secondaryLabel}
            />
          </Pressable>

          {planExpanded ? (
            <View style={optimizeStyles.planBody}>
              <Text style={optimizeStyles.planIntro}>
                Buy each item at the store where it costs least:
              </Text>
              {data.split_plan.map((group, gi) => (
                <View key={`${group.store.id}-${gi}`} style={optimizeStyles.planStoreBlock}>
                  <Text style={optimizeStyles.planStoreName}>{group.store.name}</Text>
                  {group.items.map((line) => (
                    <View key={line.list_item_id} style={optimizeStyles.planItemRow}>
                      <Text style={optimizeStyles.planBullet}>–</Text>
                      <Text style={optimizeStyles.planItemName} numberOfLines={2}>
                        {line.product_display_name}
                      </Text>
                      <Text style={optimizeStyles.planItemPrice}>{formatUsd(line.price)}</Text>
                    </View>
                  ))}
                  <Text style={optimizeStyles.planSubtotal}>
                    Subtotal {formatUsd(group.subtotal)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {data && data.optimizable_line_count > 0 && data.split_plan.length === 0 ? (
        <View style={optimizeStyles.planCard}>
          <Text style={optimizeStyles.planEmpty}>
            Shopping plan appears when at least one catalog item has a store price.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const optimizeStyles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.md,
  },
  cardLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardMuted: {
    fontSize: 15,
    color: colors.secondaryLabel,
    lineHeight: 21,
  },
  cardError: {
    fontSize: 15,
    color: colors.systemRed,
    lineHeight: 21,
  },
  cardErrorSmall: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.systemRed,
  },
  metricBlock: {
    marginBottom: spacing.md,
  },
  metricLabel: {
    fontSize: 13,
    color: colors.secondaryLabel,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.label,
  },
  metricValueLarge: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.label,
    fontVariant: ['tabular-nums'],
  },
  metricValueMuted: {
    fontSize: 15,
    color: colors.secondaryLabel,
    lineHeight: 21,
  },
  metricSavingsPositive: {
    color: SAVINGS_GREEN,
  },
  metricHint: {
    marginTop: 4,
    fontSize: 13,
    color: colors.tertiaryLabel,
    lineHeight: 18,
  },
  updatingHint: {
    marginTop: -spacing.xs,
    fontSize: 13,
    color: colors.secondaryLabel,
  },
  planCard: {
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
    overflow: 'hidden',
  },
  planToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touchTargetMin,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  planTogglePressed: {
    opacity: 0.65,
  },
  planToggleLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.label,
  },
  planBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
  },
  planIntro: {
    fontSize: 14,
    color: colors.secondaryLabel,
    lineHeight: 19,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  planStoreBlock: {
    marginTop: spacing.md,
  },
  planStoreName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.label,
    marginBottom: spacing.xs,
  },
  planItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    gap: spacing.sm,
  },
  planBullet: {
    fontSize: 16,
    color: colors.secondaryLabel,
    width: 14,
    lineHeight: 22,
  },
  planItemName: {
    flex: 1,
    fontSize: 16,
    color: colors.label,
    lineHeight: 22,
  },
  planItemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.label,
    fontVariant: ['tabular-nums'],
    lineHeight: 22,
  },
  planSubtotal: {
    marginTop: spacing.sm,
    fontSize: 14,
    fontWeight: '500',
    color: colors.secondaryLabel,
    fontVariant: ['tabular-nums'],
  },
  planEmpty: {
    fontSize: 15,
    color: colors.secondaryLabel,
    lineHeight: 21,
    padding: spacing.md,
  },
});

function ListItemStorePrices({ state }: { state: ItemPriceState | undefined }) {
  if (state === undefined || state.status === 'loading') {
    return (
      <View style={[styles.priceSection, styles.priceLoadingRow]}>
        <ActivityIndicator color={colors.systemBlue} size="small" />
        <Text style={styles.priceStatusText}>Loading store prices…</Text>
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={styles.priceSection}>
        <Text style={styles.priceErrorText}>{state.errorMessage}</Text>
        <Text style={styles.priceHintText}>Pull down to retry with the list.</Text>
      </View>
    );
  }

  if (state.prices.length === 0) {
    return (
      <View style={styles.priceSection}>
        <Text style={styles.priceEmptyText}>No store prices for this item yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.priceSection}>
      <View style={styles.priceRows}>
        {state.prices.map((p) => (
          <View key={p.id} style={styles.priceRow}>
            <View style={styles.priceRowMain}>
              <Text style={styles.priceStoreName} numberOfLines={1}>
                {p.store.name}
              </Text>
              <Text style={styles.priceSourceLine}>{SOURCE_LABEL[p.source]}</Text>
            </View>
            <Text style={styles.priceAmount}>{formatUsd(p.price)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ListDetailScreen() {
  const { listId: listIdParam } = useLocalSearchParams<{ listId: string }>();
  const navigation = useNavigation();
  const router = useRouter();
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
  const [searchError, setSearchError] = useState<string | null>(null);
  const [priceStateByProductId, setPriceStateByProductId] = useState<
    Record<number, ItemPriceState>
  >({});
  const [priceCacheEpoch, setPriceCacheEpoch] = useState(0);
  const priceFullRefreshRef = useRef(false);
  const [optimize, setOptimize] = useState<ListOptimizationResult | null>(null);
  const [optimizeLoading, setOptimizeLoading] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const [planExpanded, setPlanExpanded] = useState(false);

  const refreshOptimization = useCallback(async () => {
    if (!Number.isInteger(listId) || listId < 1) {
      return;
    }
    setOptimizeLoading(true);
    try {
      const o = await fetchListOptimization(listId);
      setOptimize(o);
      setOptimizeError(null);
    } catch (e) {
      setOptimizeError(formatApiErrorMessage(e));
    } finally {
      setOptimizeLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    setOptimize(null);
    setOptimizeError(null);
    setPlanExpanded(false);
    setError(null);
    setSearchError(null);
  }, [listId]);

  const productIdsKey = useMemo(() => {
    const ids = new Set<number>();
    for (const i of items) {
      if (i.canonical_product_id != null) {
        ids.add(i.canonical_product_id);
      }
    }
    return [...ids].sort((a, b) => a - b).join(',');
  }, [items]);

  const debouncedDraft = useDebouncedValue(draft, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    const q = debouncedDraft.trim();
    if (!q) {
      setSuggestions([]);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    setSuggestions([]);
    setSearchError(null);

    void (async () => {
      try {
        const products = await searchProducts(q);
        if (!cancelled) {
          setSuggestions(products);
        }
      } catch (e) {
        if (!cancelled) {
          setSuggestions([]);
          setSearchError(formatApiErrorMessage(e));
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

  useEffect(() => {
    const productIds =
      productIdsKey === ''
        ? []
        : productIdsKey.split(',').map((s) => Number(s)).filter((n) => Number.isInteger(n) && n > 0);

    if (productIds.length === 0) {
      setPriceStateByProductId({});
      return;
    }

    let cancelled = false;
    const fullRefresh = priceFullRefreshRef.current;
    priceFullRefreshRef.current = false;

    setPriceStateByProductId((prev) => {
      const next: Record<number, ItemPriceState> = {};
      for (const k of Object.keys(prev)) {
        const id = Number(k);
        if (!productIds.includes(id)) {
          continue;
        }
        next[id] = prev[id]!;
      }
      for (const pid of productIds) {
        if (fullRefresh || next[pid] === undefined) {
          next[pid] = { status: 'loading', prices: [] };
        }
      }
      return next;
    });

    void Promise.all(
      productIds.map(async (pid) => {
        try {
          const prices = await fetchProductStorePrices(pid);
          if (cancelled) {
            return;
          }
          setPriceStateByProductId((p) => ({
            ...p,
            [pid]: { status: 'ready', prices },
          }));
        } catch (e) {
          if (cancelled) {
            return;
          }
          setPriceStateByProductId((p) => ({
            ...p,
            [pid]: {
              status: 'error',
              prices: [],
              errorMessage: formatApiErrorMessage(e),
            },
          }));
        }
      }),
    );

    return () => {
      cancelled = true;
    };
  }, [productIdsKey, priceCacheEpoch]);

  const load = useCallback(
    async (opts?: { refreshPrices?: boolean }) => {
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
        if (opts?.refreshPrices) {
          priceFullRefreshRef.current = true;
          setPriceCacheEpoch((e) => e + 1);
        }
        void refreshOptimization();
      } catch (e) {
        setError(formatApiErrorMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [listId, refreshOptimization],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useLayoutEffect(() => {
    const listIdOk = Number.isInteger(listId) && listId >= 1;
    navigation.setOptions({
      title: listName ?? 'List',
      headerRight:
        listIdOk
          ? () => (
              <Pressable
                accessibilityLabel="Scan barcode to add item"
                hitSlop={10}
                onPress={() =>
                  router.push({
                    pathname: '/lists/scan',
                    params: { listId: String(listId) },
                  })
                }
                style={{ paddingLeft: spacing.sm, paddingRight: 4 }}
              >
                <Ionicons name="barcode-outline" size={26} color={colors.systemBlue} />
              </Pressable>
            )
          : undefined,
    });
  }, [listId, listName, navigation, router]);

  async function toggleItem(item: ListItem) {
    const next = !item.checked;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, checked: next } : i)),
    );
    try {
      await patchListItem(listId, item.id, { checked: next });
    } catch (e) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, checked: item.checked } : i)),
      );
      Alert.alert('Could not update', formatApiErrorMessage(e));
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
      void refreshOptimization();
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
      void refreshOptimization();
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
      void refreshOptimization();
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
      <CenteredError message="This list does not exist or the link is invalid." onRetry={() => router.back()} retryLabel="Go back" />
    );
  }

  if (loading && !listName) {
    return <CenteredLoading accessibilityLabel="Loading list" message="Loading list…" />;
  }

  if (error && !listName) {
    return <CenteredError message={error} onRetry={() => void load()} />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      style={styles.flex}
    >
      {error && listName ? (
        <ErrorBanner message={error} onRetry={() => void load({ refreshPrices: true })} />
      ) : null}
      <FlatList
        contentContainerStyle={styles.listContent}
        data={items}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <ListOptimizationPanel
            data={optimize}
            error={optimizeError}
            loading={optimizeLoading}
            onTogglePlan={() => setPlanExpanded((e) => !e)}
            planExpanded={planExpanded}
          />
        }
        ListEmptyComponent={
          <EmptyState
            body="Type in the bar below or tap the barcode icon to add your first item."
            title="No items yet"
          />
        }
        refreshing={loading}
        onRefresh={() => void load({ refreshPrices: true })}
        renderItem={({ item }) => {
          const productId = item.canonical_product_id;
          const priceState =
            productId != null ? priceStateByProductId[productId] : undefined;
          return (
            <View style={styles.itemBlock}>
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
                <View style={styles.itemMain}>
                  <Text
                    style={[styles.itemText, item.checked && styles.itemTextDone]}
                    numberOfLines={3}
                  >
                    {itemDisplayLabel(item)}
                    {item.quantity ? ` · ${item.quantity}` : ''}
                  </Text>
                  {productId != null ? (
                    <ListItemStorePrices state={priceState} />
                  ) : null}
                </View>
                <Pressable
                  accessibilityLabel="Remove item"
                  hitSlop={8}
                  onPress={() => confirmDeleteItem(item)}
                  style={styles.trashHit}
                >
                  <Ionicons name="trash-outline" size={22} color={colors.systemRed} />
                </Pressable>
              </View>
            </View>
          );
        }}
        style={styles.listFlex}
      />

      {draft.trim().length > 0 && searchError ? (
        <View style={styles.searchErrorBanner}>
          <Text style={styles.searchErrorText}>{searchError}</Text>
        </View>
      ) : null}

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
          submitBehavior="submit"
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
  listContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  searchErrorBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
  },
  searchErrorText: {
    fontSize: 14,
    color: colors.systemRed,
    lineHeight: 19,
    textAlign: 'center',
  },
  itemBlock: {
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: touchTargetMin + 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  checkHit: {
    marginRight: spacing.md,
    paddingTop: 2,
  },
  itemMain: {
    flex: 1,
    minWidth: 0,
  },
  itemText: {
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
    paddingTop: 6,
  },
  priceSection: {
    marginTop: spacing.sm,
  },
  priceRows: {
    gap: spacing.xs,
  },
  priceLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  priceStatusText: {
    fontSize: 13,
    color: colors.secondaryLabel,
    flex: 1,
  },
  priceErrorText: {
    fontSize: 14,
    color: colors.systemRed,
    lineHeight: 19,
  },
  priceHintText: {
    marginTop: 4,
    fontSize: 13,
    color: colors.secondaryLabel,
    lineHeight: 18,
  },
  priceEmptyText: {
    fontSize: 14,
    color: colors.secondaryLabel,
    lineHeight: 19,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 4,
  },
  priceRowMain: {
    flex: 1,
    minWidth: 0,
  },
  priceStoreName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.label,
    lineHeight: 20,
  },
  priceSourceLine: {
    marginTop: 2,
    fontSize: 12,
    color: colors.tertiaryLabel,
    lineHeight: 16,
  },
  priceAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.label,
    fontVariant: ['tabular-nums'],
    lineHeight: 20,
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
