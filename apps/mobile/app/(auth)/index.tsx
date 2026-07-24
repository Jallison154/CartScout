import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { BrandAtmosphere } from '@/components/ui/BrandAtmosphere';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { colors, fonts, spacing } from '@/constants/theme';
import { useApiBaseUrl } from '@/hooks/useApiBaseUrl';

export default function LandingScreen() {
  const apiBase = useApiBaseUrl();

  return (
    <View style={styles.root}>
      <BrandAtmosphere />
      <Screen scroll transparent>
        <View style={styles.hero}>
          <Text accessibilityRole="header" style={styles.mark}>
            CartScout
          </Text>
          <Text style={styles.tagline}>Find the cheapest way to shop your list.</Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton onPress={() => router.push('/register')}>Create account</PrimaryButton>
          <View style={styles.gap} />
          <SecondaryButton onPress={() => router.push('/login')}>Log in</SecondaryButton>
        </View>

        <Text style={styles.hint}>
          {apiBase
            ? `Connected to ${apiBase}`
            : 'Set EXPO_PUBLIC_API_URL in .env (e.g. http://192.168.x.x:4000).'}
        </Text>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.groupedBackground,
  },
  hero: {
    marginTop: spacing.xl * 1.5,
    marginBottom: spacing.xl * 1.75,
  },
  mark: {
    fontFamily: fonts.display,
    fontSize: 48,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: -1,
    lineHeight: 54,
  },
  tagline: {
    marginTop: spacing.md,
    fontSize: 20,
    fontWeight: '400',
    color: colors.label,
    lineHeight: 28,
    maxWidth: 300,
  },
  actions: {
    gap: 0,
  },
  gap: {
    height: spacing.sm,
  },
  hint: {
    marginTop: spacing.xl,
    fontSize: 13,
    color: colors.tertiaryLabel,
    lineHeight: 18,
  },
});
