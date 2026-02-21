import { View, Text, StyleSheet } from "react-native";

export default function MealPlanScreen() {
  return (
    <View style={styles.centered}>
      <Text style={styles.title}>Meal planning</Text>
      <Text style={styles.subtitle}>Plan meals and add ingredients to your lists. Coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  subtitle: { fontSize: 16, color: "#666", textAlign: "center" },
});
