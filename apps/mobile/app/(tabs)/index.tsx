import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/auth";
import { useMockApi } from "../../lib/mockApi";

export default function TabHome() {
  const router = useRouter();
  const { logout } = useAuth();
  const isMockApi = useMockApi();

  return (
    <View style={styles.centered}>
      {isMockApi && (
        <View style={styles.mockBanner}>
          <Text style={styles.mockBannerText}>Using mock API (no server)</Text>
        </View>
      )}
      <Text style={styles.title}>CartScout</Text>
      <Text style={styles.subtitle}>Your grocery lists, meal planning, and store totals.</Text>
      <Pressable style={styles.button} onPress={() => router.push("/(tabs)/lists")}>
        <Text style={styles.buttonText}>Go to Lists</Text>
      </Pressable>
      <Pressable style={[styles.button, styles.buttonSecondary]} onPress={() => router.push("/(tabs)/meal-plan")}>
        <Text style={styles.buttonTextSecondary}>Meal planning</Text>
      </Pressable>
      <Pressable style={[styles.button, styles.buttonSecondary]} onPress={() => router.push("/(tabs)/store-totals")}>
        <Text style={styles.buttonTextSecondary}>Store totals</Text>
      </Pressable>
      <Pressable style={[styles.button, styles.buttonSecondary]} onPress={() => logout().then(() => router.replace("/"))}>
        <Text style={styles.buttonTextSecondary}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 24 },
  button: {
    backgroundColor: "#0066cc",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginBottom: 10,
  },
  buttonSecondary: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#0066cc" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  buttonTextSecondary: { color: "#0066cc", fontSize: 16, fontWeight: "600" },
  mockBanner: { backgroundColor: "#f0f0a0", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, marginBottom: 16 },
  mockBannerText: { fontSize: 12, color: "#666" },
});
