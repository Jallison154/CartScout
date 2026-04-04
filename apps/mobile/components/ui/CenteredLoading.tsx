import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';

type Props = {
  message?: string;
  /** For VoiceOver when there is no message */
  accessibilityLabel?: string;
};

export function CenteredLoading({ message, accessibilityLabel }: Props) {
  return (
    <View
      accessibilityLabel={accessibilityLabel ?? message ?? 'Loading'}
      accessibilityRole="progressbar"
      style={styles.wrap}
    >
      <ActivityIndicator color={colors.systemBlue} size="large" />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.groupedBackground,
    gap: spacing.md,
  },
  message: {
    fontSize: 16,
    color: colors.secondaryLabel,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.sm,
  },
});
