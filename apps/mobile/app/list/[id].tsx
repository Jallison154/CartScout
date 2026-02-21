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
import { getApiErrorMessage } from "../../lib/errors";
import type { List, ListItem, CanonicalProduct, Store } from "@cartscout/types";
import { DEFAULT_STORES } from "../../constants/stores";

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
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [stores, setStores] = useState<Store[]>([]);
  const [listStoreIds, setListStoreIds] = useState<string[]>([]);
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
    if (!id || !list) return;
    setListStoreIds([]);
    api.listStores(id).then((res) => setListStoreIds(res.data || [])).catch(() => setListStoreIds([]));
  }, [id, list, api]);

  useEffect(() => {
    api.stores().then((res) => setStores(res.data || [])).catch(() => setStores([]));
  }, [api]);

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
      }).catch((e) => Alert.alert("Error", getApiErrorMessage(e))).finally(() => setAdding(false));
      return;
    }
    if (!text) return;
    setAdding(true);
    api.addListItem(id, { free_text: text, quantity: 1 }).then(() => {
      setNewItemText("");
      setSuggestions([]);
      loadList();
    }).catch((e) => Alert.alert("Error", getApiErrorMessage(e))).finally(() => setAdding(false));
  };

  const toggleChecked = (item: ListItem) => {
    if (!id) return;
    api.updateListItem(id, item.id, { checked: item.checked !== 1 }).then(loadList).catch((e) => Alert.alert("Error", getApiErrorMessage(e)));
  };

  const deleteItem = (item: ListItem) => {
    if (!id) return;
    Alert.alert("Remove item", `Remove "${item.free_text || item.display_name || "Item"}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => api.deleteListItem(id, item.id).then(loadList).catch((e) => Alert.alert("Error", getApiErrorMessage(e))) },
    ]);
  };

  const uncheckAll = () => {
    if (!id) return;
    const checkedItems = (list?.items || []).filter((i) => i.checked === 1);
    if (checkedItems.length === 0) return;
    Promise.all(checkedItems.map((item) => api.updateListItem(id, item.id, { checked: false })))
      .then(loadList)
      .catch((e) => Alert.alert("Error", getApiErrorMessage(e)));
  };

  const openRename = () => {
    if (list?.name) {
      setRenameValue(list.name);
      setRenameVisible(true);
    }
  };

  const saveRename = () => {
    const name = renameValue.trim();
    if (!id || !name || name === list?.name) {
      setRenameVisible(false);
      return;
    }
    api.updateList(id, { name }).then(() => {
      setList((prev) => (prev ? { ...prev, name } : null));
      setRenameVisible(false);
      loadList();
    }).catch((e) => Alert.alert("Error", getApiErrorMessage(e)));
  };

  const toggleListStore = (store: Store) => {
    if (!id) return;
    const next = listStoreIds.includes(store.id)
      ? listStoreIds.filter((s) => s !== store.id)
      : [...listStoreIds, store.id];
    setListStoreIds(next);
    api.setListStores(id, next).catch((e) => {
      Alert.alert("Error", getApiErrorMessage(e));
      setListStoreIds(listStoreIds);
    });
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
        <Pressable onPress={openRename} style={styles.renamePressable}>
          <Text style={styles.listName}>{list.name}</Text>
          <Text style={styles.renameHint}>Tap to rename</Text>
        </Pressable>
        {(list.items || []).some((i) => i.checked === 1) && (
          <Pressable onPress={uncheckAll} style={styles.uncheckAllBtn}>
            <Text style={styles.uncheckAllText}>Uncheck all</Text>
          </Pressable>
        )}
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

      <Modal visible={renameVisible} transparent animationType="fade">
        <Pressable style={styles.renameBackdrop} onPress={() => setRenameVisible(false)}>
          <View style={styles.renameBox}>
            <Text style={styles.renameTitle}>Rename list</Text>
            <TextInput
              style={styles.renameInput}
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="List name"
              autoFocus
              onSubmitEditing={saveRename}
            />
            <View style={styles.renameActions}>
              <Pressable style={styles.renameCancelBtn} onPress={() => setRenameVisible(false)}>
                <Text style={styles.renameCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.renameSaveBtn} onPress={saveRename}>
                <Text style={styles.renameSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.listStoresSection}>
            <Text style={styles.listStoresTitle}>Stores for this list</Text>
            <Text style={styles.listStoresSubtitle}>Choose where you might shop for this list.</Text>
            {(stores.length ? stores : DEFAULT_STORES).map((store) => {
              const isSelected = listStoreIds.includes(store.id);
              return (
                <Pressable
                  key={store.id}
                  style={[styles.storeRow, isSelected && styles.storeRowSelected]}
                  onPress={() => toggleListStore(store)}
                >
                  <View style={[styles.storeCheckbox, isSelected && styles.storeCheckboxSelected]}>
                    {isSelected && <Text style={styles.storeCheckmark}>✓</Text>}
                  </View>
                  <Text style={styles.storeName}>{store.name}</Text>
                </Pressable>
              );
            })}
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>No items yet. Add one above.</Text>}
        renderItem={({ item }) => {
          const isChecked = item.checked === 1;
          return (
            <Pressable
              style={styles.itemRow}
              onPress={() => toggleChecked(item)}
              onLongPress={() => deleteItem(item)}
            >
              <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                {isChecked && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.itemText, isChecked && styles.itemChecked]}>
                {item.free_text || item.display_name || "Item"}
              </Text>
              {item.quantity > 1 && <Text style={styles.itemQty}>×{item.quantity}</Text>}
            </Pressable>
          );
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#eee" },
  renamePressable: {},
  listName: { fontSize: 20, fontWeight: "700" },
  renameHint: { fontSize: 12, color: "#888", marginTop: 4 },
  uncheckAllBtn: { marginTop: 8 },
  uncheckAllText: { fontSize: 15, color: "#0066cc", fontWeight: "500" },
  renameBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 },
  renameBox: { backgroundColor: "#fff", borderRadius: 12, padding: 20 },
  renameTitle: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  renameInput: { borderWidth: 1, borderColor: "#ccc", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 16 },
  renameActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  renameCancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  renameCancelText: { fontSize: 16, color: "#666" },
  renameSaveBtn: { backgroundColor: "#0066cc", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  renameSaveText: { fontSize: 16, color: "#fff", fontWeight: "600" },
  addRow: { flexDirection: "row", padding: 16, gap: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  addBtn: { backgroundColor: "#0066cc", paddingHorizontal: 20, justifyContent: "center", borderRadius: 10 },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { color: "#fff", fontWeight: "600" },
  empty: { color: "#666", padding: 24, textAlign: "center" },
  itemRow: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#0066cc",
    marginRight: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: { backgroundColor: "#0066cc" },
  checkmark: { color: "#fff", fontWeight: "700", fontSize: 14 },
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
  listStoresSection: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#eee" },
  listStoresTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  listStoresSubtitle: { fontSize: 13, color: "#666", marginBottom: 12 },
  storeRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 0 },
  storeRowSelected: {},
  storeCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#0066cc", marginRight: 12, justifyContent: "center", alignItems: "center" },
  storeCheckboxSelected: { backgroundColor: "#0066cc" },
  storeCheckmark: { color: "#fff", fontWeight: "700", fontSize: 12 },
  storeName: { fontSize: 15 },
});
