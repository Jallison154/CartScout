import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView, Alert } from "react-native";
import { useAuth } from "../../lib/auth";
import { getApiErrorMessage } from "../../lib/errors";
import type { Store } from "@cartscout/types";
import { DEFAULT_STORES } from "../../constants/stores";

export default function SettingsScreen() {
  const { api, isAuthenticated } = useAuth();
  const [stores, setStores] = useState<Store[]>(DEFAULT_STORES);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    Promise.all([
      api.stores().catch(() => ({ data: DEFAULT_STORES })),
      api.storeFavorites().catch(() => ({ data: [] as string[] })),
    ])
      .then(([storesRes, favRes]) => {
        const fromApi = storesRes.data?.length ? storesRes.data : DEFAULT_STORES;
        setStores(fromApi);
        setFavoriteIds(new Set(favRes.data || []));
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, api]);

  const toggleStore = (store: Store) => {
    if (saving) return;
    const isSelected = favoriteIds.has(store.id);
    setSaving(store.id);
    const promise = isSelected
      ? api.removeStoreFavorite(store.id)
      : api.addStoreFavorite(store.id);
    promise
      .then((res) => setFavoriteIds(new Set(res.data || [])))
      .catch((e) => Alert.alert("Error", getApiErrorMessage(e)))
      .finally(() => setSaving(null));
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Stores</Text>
      <Text style={styles.sectionSubtitle}>
        Select the stores you shop at. Suggestions and prices can use these stores.
      </Text>
      {stores.map((store) => {
        const isSelected = favoriteIds.has(store.id);
        const isSaving = saving === store.id;
        return (
          <Pressable
            key={store.id}
            style={[styles.row, isSelected && styles.rowSelected]}
            onPress={() => toggleStore(store)}
            disabled={isSaving}
          >
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <View style={styles.rowText}>
              <Text style={styles.storeName}>{store.name}</Text>
              {store.chain && store.chain !== store.name && (
                <Text style={styles.storeChain}>{store.chain}</Text>
              )}
            </View>
            {isSaving && <ActivityIndicator size="small" />}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  sectionTitle: { fontSize: 20, fontWeight: "700", paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
  sectionSubtitle: { fontSize: 14, color: "#666", paddingHorizontal: 16, paddingBottom: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  rowSelected: { backgroundColor: "#f0f8ff" },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#0066cc",
    marginRight: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: { backgroundColor: "#0066cc" },
  checkmark: { color: "#fff", fontWeight: "700", fontSize: 14 },
  rowText: { flex: 1 },
  storeName: { fontSize: 17, fontWeight: "600" },
  storeChain: { fontSize: 13, color: "#666", marginTop: 2 },
});
