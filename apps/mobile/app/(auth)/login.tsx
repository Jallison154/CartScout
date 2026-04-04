import { useState } from 'react';
import { Keyboard, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { colors } from '@/constants/theme';
import { authFormStyles } from '@/styles/authFormStyles';
import { formatApiErrorMessage } from '@/utils/apiMessage';
import { isValidEmailFormat } from '@/utils/validation';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    Keyboard.dismiss();
    if (!email.trim()) {
      setError('Enter your email.');
      return;
    }
    if (!isValidEmailFormat(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(formatApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll>
      <Text style={authFormStyles.lead}>Sign in with your CartScout account.</Text>

      {error ? <Text style={authFormStyles.error}>{error}</Text> : null}

      <View style={authFormStyles.field}>
        <Text style={authFormStyles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.tertiaryLabel}
          style={authFormStyles.input}
          textContentType="username"
          value={email}
        />
      </View>

      <View style={authFormStyles.field}>
        <Text style={authFormStyles.label}>Password</Text>
        <TextInput
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.tertiaryLabel}
          secureTextEntry
          style={authFormStyles.input}
          textContentType="password"
          value={password}
        />
      </View>

      <View style={authFormStyles.cta}>
        <PrimaryButton
          disabled={!email.trim() || !password}
          loading={submitting}
          onPress={() => void onSubmit()}
        >
          Continue
        </PrimaryButton>
      </View>
    </Screen>
  );
}
