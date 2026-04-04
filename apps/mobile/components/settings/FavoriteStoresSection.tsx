import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import {
  addFavoriteStore,
  fetchFavoriteStores,
  fetchStores,
  removeFavoriteStore,
} from '@/api/stores';
import { colors, spacing, touchTargetMin } from '@/constants/theme';
import { FALLBACK_STORES, type Store } from '@/types/stores';
import { formatApiErrorMessage } from '@/utils/apiMessage';

export function FavoriteStoresSection() {
  const [stores, setStores] = useState<Store[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [offlineStores, setOfflineStores] = useState(false);
  const [favoritesLoadFailed, setFavoritesLoadFailed] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFavoritesLoadFailed(false);

    const [storesResult, favoritesResult] = await Promise.allSettled([
      fetchStores(),
      fetchFavoriteStores(),
    ]);

    if (storesResult.status === 'fulfilled') {
      setStores(storesResult.value);
      setOfflineStores(false);
    } else {
      setStores(FALLBACK_STORES);
      setOfflineStores(true);
    }

    if (favoritesResult.status === 'fulfilled') {
      setFavoriteIds(new Set(favoritesResult.value.map((s) => s.id)));
    } else {
      setFavoriteIds(new Set());
      setFavoritesLoadFailed(true);
    }

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const toggleFavorite = useCallback(async (storeId: number, next: boolean) => {
    setFavoriteIds((prev) => {
      const n = new Set(prev);
      if (next) {
        n.add(storeId);
      } else {
        n.delete(storeId);
      }
      return n;
    });
    setBusyId(storeId);
    try {
      if (next) {
        await addFavoriteStore(storeId);
      } else {
        await removeFavoriteStore(storeId);
      }
    } catch (e) {
      setFavoriteIds((prev) => {
        const n = new Set(prev);
        if (next) {
          n.delete(storeId);
        } else {
          n.add(storeId);
        }
        return n;
      });
      Alert.alert('Could not update favorites', formatApiErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }, []);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>Favorite stores</Text>
      <View style={styles.card}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator accessibilityLabel="Loading stores" color={colors.systemBlue} />
            <Text style={styles.loadingCaption}>Loading stores…</Text>
          </View>
        ) : (
          stores.map((store, index) => (
            <View
              key={store.id}
              style={[
                styles.row,
                index > 0 && styles.rowBorder,
              ]}
            >
              <View style={styles.rowText}>
                <Text style={styles.storeName}>{store.name}</Text>
                {store.chain && store.chain !== store.name ? (
                  <Text style={styles.storeChain} numberOfLines={1}>
                    {store.chain}
                  </Text>
                ) : null}
              </View>
              <Switch
                accessibilityLabel={`Favorite ${store.name}`}
                disabled={busyId !== null}
                ios_backgroundColor={colors.systemGray6}
                onValueChange={(value) => void toggleFavorite(store.id, value)}
                trackColor={{
                  false: colors.systemGray6,
                  true: '#34C759',
                }}
                value={favoriteIds.has(store.id)}
              />
            </View>
          ))
        )}
      </View>
      {offlineStores ? (
        <Text style={styles.hint}>
          Couldn&apos;t load stores from the server. Showing Walmart and Costco. Toggles
          save when you&apos;re back online.
        </Text>
      ) : favoritesLoadFailed ? (
        <View style={styles.favoritesError}>
          <Text style={styles.hint}>
            Couldn&apos;t load your favorites. Your switches may be out of date until this succeeds.
          </Text>
          <SecondaryButton onPress={() => void load()}>Retry</SecondaryButton>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.secondaryLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 10,
    overflow: 'hidden',
  },
  loadingRow: {
    minHeight: touchTargetMin + spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  loadingCaption: {
    fontSize: 15,
    color: colors.secondaryLabel,
  },
  favoritesError: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.xs,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touchTargetMin,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
  },
  rowText: {
    flex: 1,
    marginRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  storeName: {
    fontSize: 17,
    color: colors.label,
  },
  storeChain: {
    fontSize: 15,
    color: colors.secondaryLabel,
    marginTop: 2,
  },
  hint: {
    fontSize: 13,
    color: colors.secondaryLabel,
    lineHeight: 18,
    marginTop: spacing.sm,
    marginHorizontal: spacing.xs,
  },
});
