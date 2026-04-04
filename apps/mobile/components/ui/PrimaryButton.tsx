import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, touchTargetMin } from '@/constants/theme';

type PrimaryButtonProps = PropsWithChildren<{
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}>;

export function PrimaryButton({ onPress, disabled, loading, children }: PrimaryButtonProps) {
  const isBusy = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: !!loading, disabled: isBusy }}
      disabled={isBusy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isBusy && styles.disabled,
        pressed && !isBusy && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={[styles.label, disabled && styles.labelDisabled]}>{children}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTargetMin,
    borderRadius: radius.md,
    backgroundColor: colors.systemBlue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    backgroundColor: colors.systemGray6,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  labelDisabled: {
    color: colors.tertiaryLabel,
  },
});
