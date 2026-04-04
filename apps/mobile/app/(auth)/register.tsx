import { useState } from 'react';
import { Keyboard, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { colors } from '@/constants/theme';
import { authFormStyles } from '@/styles/authFormStyles';
import { formatApiErrorMessage } from '@/utils/apiMessage';
import { isValidEmailFormat } from '@/utils/validation';

export default function RegisterScreen() {
  const { signUp } = useAuth();
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
      <Text style={authFormStyles.lead}>Create an account to save lists and compare stores.</Text>

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
          textContentType="emailAddress"
          value={email}
        />
      </View>

      <View style={authFormStyles.field}>
        <Text style={authFormStyles.label}>Password</Text>
        <TextInput
          onChangeText={setPassword}
          placeholder="At least 10 characters"
          placeholderTextColor={colors.tertiaryLabel}
          secureTextEntry
          style={authFormStyles.input}
          textContentType="newPassword"
          value={password}
        />
      </View>

      <View style={authFormStyles.cta}>
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
