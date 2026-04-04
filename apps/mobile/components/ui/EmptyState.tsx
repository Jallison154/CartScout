import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';

type Props = {
  title: string;
  body: string;
};

/** Consistent empty copy for lists and detail screens. */
export function EmptyState({ title, body }: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="text">
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.label,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    color: colors.secondaryLabel,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
});
