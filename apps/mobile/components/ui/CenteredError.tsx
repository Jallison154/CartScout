import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { colors, spacing } from '@/constants/theme';

type Props = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function CenteredError({ message, onRetry, retryLabel = 'Retry' }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <View style={styles.cta}>
          <PrimaryButton onPress={onRetry}>{retryLabel}</PrimaryButton>
        </View>
      ) : null}
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
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.label,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.secondaryLabel,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  cta: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
    maxWidth: 320,
    width: '100%',
  },
});
