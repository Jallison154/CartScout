import Constants from 'expo-constants';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing, touchTargetMin } from '@/constants/theme';
import { useApiBaseUrl } from '@/hooks/useApiBaseUrl';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const apiBase = useApiBaseUrl();
  const version = Constants.expoConfig?.version ?? '—';

  return (
    <Screen edges={['top']}>
      <View style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Account</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Email</Text>
              <Text style={styles.rowValue} numberOfLines={2}>
                {user?.email ?? '—'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Connection</Text>
          <View style={styles.card}>
            <View style={[styles.row, styles.rowMultiline]}>
              <Text style={styles.rowLabel}>API</Text>
              <Text style={styles.rowValueSmall} selectable>
                {apiBase || 'Not configured (EXPO_PUBLIC_API_URL)'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>About</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Version</Text>
              <Text style={styles.rowValue}>{version}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            <Pressable
              accessibilityLabel="Log out"
              accessibilityRole="button"
              onPress={() => void signOut()}
              style={({ pressed }) => [styles.signOutWrap, pressed && styles.signOutPressed]}
            >
              <Text style={styles.signOut}>Log Out</Text>
            </Pressable>
          </View>
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.secondaryLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touchTargetMin,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowMultiline: {
    alignItems: 'flex-start',
    flexDirection: 'column',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  rowLabel: {
    fontSize: 17,
    color: colors.label,
    marginRight: spacing.md,
  },
  rowValue: {
    flex: 1,
    fontSize: 17,
    color: colors.secondaryLabel,
    textAlign: 'right',
  },
  rowValueSmall: {
    fontSize: 15,
    color: colors.secondaryLabel,
    lineHeight: 20,
  },
  signOutWrap: {
    minHeight: touchTargetMin,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  signOutPressed: {
    opacity: 0.55,
  },
  signOut: {
    fontSize: 17,
    color: colors.systemRed,
    fontWeight: '400',
  },
});
