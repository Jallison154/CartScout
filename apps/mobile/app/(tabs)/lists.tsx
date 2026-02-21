import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/auth";
import { getCachedLists, setCachedLists } from "../../lib/offline";
import { getApiErrorMessage } from "../../lib/errors";
import type { List } from "@cartscout/types";

function dedupeById(lists: List[]): List[] {
  const seen = new Set<string>();
  return lists.filter((l) => {
    if (!l?.id || seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  });
}

export default function ListsScreen() {
  const router = useRouter();
  const { api, isAuthenticated } = useAuth();
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    api.lists(false)
      .then((res) => {
        const data = dedupeById(res.data || []);
        setLists(data);
        setOffline(false);
        setCachedLists(data);
      })
      .catch(async () => {
        const cached = await getCachedLists();
        setLists(Array.isArray(cached) ? (cached as List[]) : []);
        setOffline(Array.isArray(cached) && cached.length > 0);
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, api]);

  const createList = () => {
    api.createList({ name: "New list" }).then((res) => {
      if (res.data) {
        const newList = res.data as List;
        setLists((prev) => dedupeById([newList, ...prev]));
      }
    }).catch((e) => Alert.alert("Error", getApiErrorMessage(e)));
  };

  const deleteList = (item: List) => {
    Alert.alert(
      "Delete list",
      `Delete "${item.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => {
          api.deleteList(item.id).then(() => {
            setLists((prev) => prev.filter((l) => l.id !== item.id));
          }).catch((e) => Alert.alert("Error", getApiErrorMessage(e)));
        } },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {offline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>Showing cached lists. Reconnect to refresh.</Text>
        </View>
      )}
      <Pressable style={styles.addButton} onPress={createList}>
        <Text style={styles.addButtonText}>+ New list</Text>
      </Pressable>
      <FlatList
        data={lists}
        keyExtractor={(item, index) => item?.id ?? `list-${index}`}
        ListEmptyComponent={<Text style={styles.empty}>No lists yet. Tap "+ New list" to create one.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/list/${item.id}`)}
            onLongPress={() => deleteList(item)}
          >
            <Text style={styles.listName}>{item.name}</Text>
            <Text style={styles.listMeta}>{item.list_type} · {item.updated_at?.slice(0, 10)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  offlineBanner: { backgroundColor: "#fff3cd", paddingVertical: 8, paddingHorizontal: 16, marginBottom: 12, borderRadius: 8 },
  offlineBannerText: { fontSize: 13, color: "#856404" },
  addButton: { backgroundColor: "#0066cc", padding: 14, borderRadius: 10, alignItems: "center", marginBottom: 16 },
  addButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  empty: { color: "#666", padding: 24, textAlign: "center" },
  row: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#eee" },
  listName: { fontSize: 17, fontWeight: "600" },
  listMeta: { fontSize: 13, color: "#666", marginTop: 4 },
});
