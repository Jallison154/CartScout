import { StyleSheet } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';

export const authFormStyles = StyleSheet.create({
  lead: {
    fontSize: 17,
    color: colors.label,
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  error: {
    fontSize: 15,
    color: colors.systemRed,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.secondaryLabel,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  input: {
    minHeight: 48,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    fontSize: 17,
    color: colors.label,
    backgroundColor: colors.systemGray6,
  },
  cta: {
    marginTop: spacing.lg,
  },
});
