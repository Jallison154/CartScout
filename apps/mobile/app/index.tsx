import { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../lib/auth";

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      router.replace("/(tabs)/lists");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.text}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <Text style={styles.title}>CartScout</Text>
      <Text style={styles.subtitle}>Grocery lists for your next trip</Text>
      <Pressable style={styles.button} onPress={() => router.push("/login")}>
        <Text style={styles.buttonText}>Sign in</Text>
      </Pressable>
      <Pressable style={[styles.button, styles.buttonSecondary]} onPress={() => router.push("/register")}>
        <Text style={styles.buttonTextSecondary}>Create account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 32 },
  text: { fontSize: 16 },
  button: {
    backgroundColor: "#0066cc",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    width: "100%",
    maxWidth: 280,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonSecondary: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#0066cc" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  buttonTextSecondary: { color: "#0066cc", fontSize: 16, fontWeight: "600" },
});
