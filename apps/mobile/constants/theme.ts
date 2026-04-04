/**
 * iOS-aligned tokens — system fonts, SF-style spacing, standard tint.
 */
export const colors = {
  label: '#000000',
  secondaryLabel: 'rgba(60, 60, 67, 0.6)',
  tertiaryLabel: 'rgba(60, 60, 67, 0.3)',
  systemBlue: '#007AFF',
  systemRed: '#FF3B30',
  systemGray6: '#F2F2F7',
  separator: 'rgba(60, 60, 67, 0.29)',
  background: '#FFFFFF',
  groupedBackground: '#F2F2F7',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 14,
} as const;

export const touchTargetMin = 44;
