import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { colors, spacing } from '@/constants/theme';
import { useApiBaseUrl } from '@/hooks/useApiBaseUrl';

export default function LandingScreen() {
  const apiBase = useApiBaseUrl();

  return (
    <Screen scroll>
      <View style={styles.hero}>
        <Text style={styles.mark}>CartScout</Text>
        <Text style={styles.tagline}>Compare prices. Shop smarter.</Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton onPress={() => router.push('/register')}>Create account</PrimaryButton>
        <View style={styles.gap} />
        <SecondaryButton onPress={() => router.push('/login')}>Log in</SecondaryButton>
      </View>

      <Text style={styles.hint}>
        {apiBase
          ? `API: ${apiBase}`
          : 'Set EXPO_PUBLIC_API_URL in .env (e.g. http://192.168.x.x:4000 for a device).'}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl * 1.5,
  },
  mark: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.label,
    letterSpacing: -0.5,
  },
  tagline: {
    marginTop: spacing.sm,
    fontSize: 20,
    fontWeight: '400',
    color: colors.secondaryLabel,
    lineHeight: 26,
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
