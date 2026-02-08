import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useAuth } from "../../lib/auth";
import type { List, ListItem, CanonicalProduct } from "@cartscout/types";

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { api, isAuthenticated } = useAuth();
  const [list, setList] = useState<List | null>(null);
  const [loading, setLoading] = useState(true);
  const [newItemText, setNewItemText] = useState("");
  const [adding, setAdding] = useState(false);
  const [suggestions, setSuggestions] = useState<CanonicalProduct[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadList = useCallback(() => {
    if (!id || !isAuthenticated) return;
    api.list(id, true).then((res) => {
      setList(res.data || null);
    }).catch(() => setList(null)).finally(() => setLoading(false));
  }, [id, isAuthenticated, api]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (list?.name) navigation.setOptions({ title: list.name });
  }, [list?.name, navigation]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => router.push("/(tabs)/settings")}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, padding: 8, marginRight: 8 })}
        >
          <Text style={styles.headerButtonText}>Settings</Text>
        </Pressable>
      ),
    });
  }, [navigation, router]);

  useEffect(() => {
    const query = newItemText.trim();
    if (!query) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSuggestionsLoading(true);
      api.searchProducts(query, 12)
        .then((res) => setSuggestions(res.data || []))
        .catch(() => setSuggestions([]))
        .finally(() => { setSuggestionsLoading(false); debounceRef.current = null; });
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [newItemText, api]);

  const addItem = (product?: CanonicalProduct) => {
    const text = newItemText.trim();
    if (!id || adding) return;
    if (product) {
      setAdding(true);
      api.addListItem(id, { canonical_product_id: product.id, quantity: 1 }).then(() => {
        setNewItemText("");
        setSuggestions([]);
        loadList();
      }).catch((e) => Alert.alert("Error", e.message)).finally(() => setAdding(false));
      return;
    }
    if (!text) return;
    setAdding(true);
    api.addListItem(id, { free_text: text, quantity: 1 }).then(() => {
      setNewItemText("");
      setSuggestions([]);
      loadList();
    }).catch((e) => Alert.alert("Error", e.message)).finally(() => setAdding(false));
  };

  const toggleChecked = (item: ListItem) => {
    if (!id) return;
    api.updateListItem(id, item.id, { checked: item.checked ? 0 : 1 }).then(loadList).catch((e) => Alert.alert("Error", e.message));
  };

  const deleteItem = (item: ListItem) => {
    if (!id) return;
    Alert.alert("Remove item", `Remove "${item.free_text || item.display_name || "Item"}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => api.deleteListItem(id, item.id).then(loadList).catch((e) => Alert.alert("Error", e.message)) },
    ]);
  };

  if (!id) {
    router.back();
    return null;
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!list) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>List not found.</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const items = list.items || [];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={100}
    >
      <View style={styles.header}>
        <Text style={styles.listName}>{list.name}</Text>
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="Add item (e.g. Milk, Bread)"
          placeholderTextColor="#999"
          value={newItemText}
          onChangeText={setNewItemText}
          onSubmitEditing={() => addItem()}
          returnKeyType="done"
          editable={!adding}
        />
        <Pressable style={[styles.addBtn, adding && styles.addBtnDisabled]} onPress={() => addItem()} disabled={adding}>
          <Text style={styles.addBtnText}>{adding ? "..." : "Add"}</Text>
        </Pressable>
      </View>

      <Modal visible={!!newItemText.trim() && (suggestions.length > 0 || suggestionsLoading)} transparent animationType="fade">
        <Pressable style={styles.suggestionsBackdrop} onPress={() => setSuggestions([])}>
          <View style={styles.suggestionsBox}>
            {suggestionsLoading ? (
              <ActivityIndicator style={styles.suggestionsLoader} />
            ) : (
              <>
                <Text style={styles.suggestionsTitle}>Suggestions</Text>
                {suggestions.map((p) => (
                  <Pressable
                    key={p.id}
                    style={styles.suggestionRow}
                    onPress={() => addItem(p)}
                  >
                    <Text style={styles.suggestionName}>{p.display_name}</Text>
                    {p.brand && <Text style={styles.suggestionBrand}>{p.brand}</Text>}
                  </Pressable>
                ))}
                {newItemText.trim() && (
                  <Pressable style={styles.suggestionRow} onPress={() => addItem()}>
                    <Text style={styles.suggestionAdd}>Add &quot;{newItemText.trim()}&quot; as plain text</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No items yet. Add one above.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.itemRow}
            onPress={() => toggleChecked(item)}
            onLongPress={() => deleteItem(item)}
          >
            <Text style={[styles.itemText, item.checked ? styles.itemChecked : null]}>
              {item.free_text || item.display_name || "Item"}
            </Text>
            {item.quantity > 1 && <Text style={styles.itemQty}>×{item.quantity}</Text>}
          </Pressable>
        )}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#eee" },
  listName: { fontSize: 20, fontWeight: "700" },
  addRow: { flexDirection: "row", padding: 16, gap: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  addBtn: { backgroundColor: "#0066cc", paddingHorizontal: 20, justifyContent: "center", borderRadius: 10 },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { color: "#fff", fontWeight: "600" },
  empty: { color: "#666", padding: 24, textAlign: "center" },
  itemRow: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  itemText: { fontSize: 17, flex: 1 },
  itemChecked: { textDecorationLine: "line-through", color: "#888" },
  itemQty: { fontSize: 15, color: "#666", marginLeft: 8 },
  backBtn: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: "#eee", borderRadius: 10 },
  backBtnText: { fontSize: 16 },
  suggestionsBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-start", paddingHorizontal: 16, paddingTop: 8 },
  suggestionsBox: { backgroundColor: "#fff", borderRadius: 12, padding: 12, maxHeight: 320 },
  suggestionsLoader: { padding: 24 },
  suggestionsTitle: { fontSize: 13, fontWeight: "600", color: "#666", marginBottom: 8 },
  suggestionRow: { paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  suggestionName: { fontSize: 16 },
  suggestionBrand: { fontSize: 13, color: "#666", marginTop: 2 },
  suggestionAdd: { fontSize: 15, color: "#0066cc", fontStyle: "italic" },
  headerButtonText: { fontSize: 16, color: "#0066cc", fontWeight: "500" },
});
