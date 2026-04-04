import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export default function HomeScreen() {
  const { user } = useAuth();

  return (
    <Screen edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.mark}>CartScout</Text>
        <Text style={styles.greeting}>Hi{user?.email ? `, ${user.email.split('@')[0]}` : ''}</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your lists</Text>
          <Text style={styles.body}>
            Open the Lists tab to view grocery lists, add items, and check things off as you shop.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.groupedBackground,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  mark: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.label,
    marginBottom: spacing.xs,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '400',
    color: colors.secondaryLabel,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.lg,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.label,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.secondaryLabel,
  },
});
