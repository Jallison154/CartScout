import { View, Text, StyleSheet } from "react-native";

export default function StoreTotalsScreen() {
  return (
    <View style={styles.centered}>
      <Text style={styles.title}>Store totals</Text>
      <Text style={styles.subtitle}>See estimated totals by store for your list. Coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  subtitle: { fontSize: 16, color: "#666", textAlign: "center" },
});
