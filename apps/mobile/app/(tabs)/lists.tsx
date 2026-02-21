import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/auth";
import { useLists } from "../../hooks/useLists";
import { getApiErrorMessage } from "../../lib/errors";

export default function ListsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const {
    lists,
    isLoading,
    isError,
    error,
    refetch,
    isOffline,
    createList,
    createListPending,
    deleteList,
    deleteListPending,
  } = useLists();

  const handleCreateList = () => {
    createList().catch((e) => Alert.alert("Error", getApiErrorMessage(e)));
  };

  const handleDeleteList = (item: { id: string; name: string }) => {
    Alert.alert(
      "Delete list",
      `Delete "${item.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteList(item.id).catch((e) => Alert.alert("Error", getApiErrorMessage(e))),
        },
      ]
    );
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{getApiErrorMessage(error)}</Text>
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>Showing cached lists. Reconnect to refresh.</Text>
        </View>
      )}
      <Pressable
        style={[styles.addButton, createListPending && styles.addButtonDisabled]}
        onPress={handleCreateList}
        disabled={createListPending}
      >
        <Text style={styles.addButtonText}>{createListPending ? "…" : "+ New list"}</Text>
      </Pressable>
      <FlatList
        data={lists}
        keyExtractor={(item, index) => item?.id ?? `list-${index}`}
        ListEmptyComponent={<Text style={styles.empty}>No lists yet. Tap "+ New list" to create one.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/list/${item.id}`)}
            onLongPress={() => handleDeleteList(item)}
            disabled={deleteListPending}
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
  errorText: { color: "#666", textAlign: "center", paddingHorizontal: 24, marginBottom: 16 },
  retryButton: { backgroundColor: "#0066cc", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  retryButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  offlineBanner: { backgroundColor: "#fff3cd", paddingVertical: 8, paddingHorizontal: 16, marginBottom: 12, borderRadius: 8 },
  offlineBannerText: { fontSize: 13, color: "#856404" },
  addButton: { backgroundColor: "#0066cc", padding: 14, borderRadius: 10, alignItems: "center", marginBottom: 16 },
  addButtonDisabled: { opacity: 0.6 },
  addButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  empty: { color: "#666", padding: 24, textAlign: "center" },
  row: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#eee" },
  listName: { fontSize: 17, fontWeight: "600" },
  listMeta: { fontSize: 13, color: "#666", marginTop: 4 },
});
