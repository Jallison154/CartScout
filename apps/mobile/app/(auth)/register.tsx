import { useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { colors, radius, spacing } from '@/constants/theme';
import { formatApiErrorMessage } from '@/utils/apiMessage';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    Keyboard.dismiss();
    if (password.length < 10) {
      setError('Password must be at least 10 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await signUp(email, password);
    } catch (err) {
      setError(formatApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll>
      <Text style={styles.lead}>Create an account to save lists and compare stores.</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.tertiaryLabel}
          style={styles.input}
          textContentType="emailAddress"
          value={email}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          onChangeText={setPassword}
          placeholder="At least 10 characters"
          placeholderTextColor={colors.tertiaryLabel}
          secureTextEntry
          style={styles.input}
          textContentType="newPassword"
          value={password}
        />
      </View>

      <View style={styles.cta}>
        <PrimaryButton
          disabled={!email.trim() || !password || password.length < 10}
          loading={submitting}
          onPress={() => void onSubmit()}
        >
          Create account
        </PrimaryButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
