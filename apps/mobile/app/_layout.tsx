import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppProviders } from '@/context/AppProviders';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/constants/theme';

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <NavigationRoot />
    </AppProviders>
  );
}

function NavigationRoot() {
  const { isReady, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) {
      return;
    }
    const group = segments[0];
    if (!group) {
      return;
    }
    const inApp = group === '(app)';
    const inAuth = group === '(auth)';

    if (!user && inApp) {
      router.replace('/');
      return;
    }
    if (user && inAuth) {
      router.replace('/home');
    }
  }, [isReady, segments, user, router]);

  if (!isReady) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.systemBlue,
        headerTitleStyle: { fontWeight: '600' },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
    </Stack>
  );
}
