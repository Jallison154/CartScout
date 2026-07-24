import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createList, fetchLists } from '@/api/lists';
import { BrandAtmosphere } from '@/components/ui/BrandAtmosphere';
import { CenteredLoading } from '@/components/ui/CenteredLoading';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { colors, fonts, radius, spacing, touchTargetMin } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import type { GroceryList } from '@/types/lists';
import { formatApiErrorMessage } from '@/utils/apiMessage';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await fetchLists();
      setLists(data);
    } catch (e) {
      setError(formatApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const firstName = user?.email?.split('@')[0] ?? '';
  const recent = lists.slice(0, 5);

  async function startNewList() {
    setCreating(true);
    try {
      const d = new Date();
      const name = `List ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
      const list = await createList(name);
      router.push(`/lists/${list.id}`);
    } catch (e) {
      setError(formatApiErrorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  if (loading && lists.length === 0 && !error) {
    return <CenteredLoading accessibilityLabel="Loading home" message="Loading…" />;
  }

  return (
    <View style={styles.root}>
      <BrandAtmosphere />
      <Screen edges={['top']} scroll transparent>
        <Text accessibilityRole="header" style={styles.mark}>
          CartScout
        </Text>
        <Text style={styles.greeting}>
          {firstName ? `Hi, ${firstName}` : 'Ready to shop smarter'}
        </Text>

        {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}

        <View style={styles.actions}>
          <PrimaryButton loading={creating} onPress={() => void startNewList()}>
            New list
          </PrimaryButton>
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/lists/import-receipt')}
              style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            >
              <Ionicons name="document-text-outline" size={20} color={colors.accent} />
              <Text style={styles.chipLabel}>Import receipt</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/lists')}
              style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            >
              <Ionicons name="list-outline" size={20} color={colors.accent} />
              <Text style={styles.chipLabel}>All lists</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Recent lists</Text>
        {recent.length === 0 ? (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyTitle}>No lists yet</Text>
            <Text style={styles.emptyBody}>
              Create a list, match items to the catalog, then open Store savings to see the cheapest
              one-stop vs split-shopping plan.
            </Text>
          </View>
        ) : (
          <View style={styles.listPanel}>
            {recent.map((list, index) => (
              <Pressable
                key={list.id}
                accessibilityLabel={`Open list ${list.name}`}
                accessibilityRole="button"
                onPress={() => router.push(`/lists/${list.id}`)}
                style={({ pressed }) => [
                  styles.listRow,
                  index < recent.length - 1 && styles.listRowBorder,
                  pressed && styles.listRowPressed,
                ]}
              >
                <Text style={styles.listName} numberOfLines={1}>
                  {list.name}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.tertiaryLabel} />
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.tip}>
          <Ionicons name="pricetag-outline" size={18} color={colors.amber} />
          <Text style={styles.tipText}>
            Tip: set favorite stores in Settings so savings compare the places you actually shop.
          </Text>
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.groupedBackground,
  },
  mark: {
    fontFamily: fonts.display,
    fontSize: 36,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: -0.8,
    marginBottom: spacing.xs,
  },
  greeting: {
    fontSize: 18,
    color: colors.secondaryLabel,
    marginBottom: spacing.lg,
  },
  actions: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flex: 1,
    minHeight: touchTargetMin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.separator,
    paddingHorizontal: spacing.md,
  },
  chipPressed: {
    opacity: 0.75,
  },
  chipLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  emptyPanel: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.separator,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.label,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.secondaryLabel,
  },
  listPanel: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.separator,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTargetMin + 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  listRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  listRowPressed: {
    backgroundColor: colors.surfaceTint,
  },
  listName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    color: colors.label,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: 'rgba(166, 124, 0, 0.08)',
    borderRadius: radius.md,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.secondaryLabel,
  },
});
