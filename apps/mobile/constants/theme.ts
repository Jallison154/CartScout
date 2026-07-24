import { Platform } from 'react-native';

/**
 * CartScout brand tokens — market-green scout identity (not system-blue iOS clone).
 */
export const colors = {
  label: '#142019',
  secondaryLabel: '#5A6B60',
  tertiaryLabel: '#8A9A90',
  /** Primary brand / interactive accent */
  accent: '#0F5C45',
  /** @deprecated alias — prefer `accent` */
  systemBlue: '#0F5C45',
  systemRed: '#C23B2E',
  systemGray6: '#E4EDE7',
  separator: 'rgba(20, 32, 25, 0.14)',
  background: '#FFFFFF',
  groupedBackground: '#EAF1EC',
  savings: '#1F7A4D',
  amber: '#A67C00',
  heroWash: '#C5DCCF',
  heroWashDeep: '#9FC4B0',
  surfaceTint: '#F3F8F5',
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
  md: 12,
  lg: 18,
} as const;

export const touchTargetMin = 44;

/** Display face for brand marks (platform built-ins — no font package required). */
export const fonts = {
  display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }) as string,
  ui: Platform.select({
    ios: 'Avenir Next',
    android: 'sans-serif',
    default: 'System',
  }) as string,
} as const;
