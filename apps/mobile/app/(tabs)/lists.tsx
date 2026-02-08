import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/auth";
import type { List } from "@cartscout/types";

export default function ListsScreen() {
  const router = useRouter();
  const { api, isAuthenticated } = useAuth();
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.lists(false).then((res) => {
      setLists(res.data || []);
    }).catch(() => {
      setLists([]);
    }).finally(() => setLoading(false));
  }, [isAuthenticated, api]);

  const createList = () => {
    api.createList({ name: "New list" }).then((res) => {
      if (res.data) setLists((prev) => [res.data as List, ...prev]);
    }).catch((e) => Alert.alert("Error", e.message));
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
      <Pressable style={styles.addButton} onPress={createList}>
        <Text style={styles.addButtonText}>+ New list</Text>
      </Pressable>
      <FlatList
        data={lists}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No lists yet. Tap "+ New list" to create one.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/list/${item.id}`)}>
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
  addButton: { backgroundColor: "#0066cc", padding: 14, borderRadius: 10, alignItems: "center", marginBottom: 16 },
  addButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  empty: { color: "#666", padding: 24, textAlign: "center" },
  row: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#eee" },
  listName: { fontSize: 17, fontWeight: "600" },
  listMeta: { fontSize: 13, color: "#666", marginTop: 4 },
});
