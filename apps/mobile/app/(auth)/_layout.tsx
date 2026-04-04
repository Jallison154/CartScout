import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';

export default function AuthStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.systemBlue,
        headerTitleStyle: { fontWeight: '600' },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: 'Log In' }} />
      <Stack.Screen name="register" options={{ title: 'Create Account' }} />
    </Stack>
  );
}
