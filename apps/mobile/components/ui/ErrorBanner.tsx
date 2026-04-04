import { StyleSheet, Text, View } from 'react-native';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { colors, spacing } from '@/constants/theme';

type Props = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
};

/** Non-blocking error strip (e.g. under navigation). */
export function ErrorBanner({ message, onRetry, retryLabel = 'Retry' }: Props) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.text}>{message}</Text>
      {onRetry ? <SecondaryButton onPress={onRetry}>{retryLabel}</SecondaryButton> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  text: {
    color: colors.systemRed,
    fontSize: 15,
    lineHeight: 20,
  },
});
