import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '@/constants/theme';

export default function ListsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerTintColor: colors.systemBlue,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600' },
        headerLargeTitleStyle: { fontWeight: '700' },
        headerStyle: { backgroundColor: colors.background },
        headerBlurEffect: Platform.OS === 'ios' ? 'systemChromeMaterial' : undefined,
        contentStyle: { backgroundColor: colors.groupedBackground },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Lists', headerLargeTitle: true }} />
      <Stack.Screen name="[listId]" options={{ title: 'List' }} />
    </Stack>
  );
}
