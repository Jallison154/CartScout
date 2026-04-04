import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, touchTargetMin } from '@/constants/theme';

type SecondaryButtonProps = PropsWithChildren<{
  onPress: () => void;
}>;

/** Plain text / borderless control — common on iOS sign-in flows. */
export function SecondaryButton({ onPress, children }: SecondaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: touchTargetMin,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  pressed: {
    opacity: 0.55,
  },
  label: {
    color: colors.systemBlue,
    fontSize: 17,
    fontWeight: '400',
  },
});
