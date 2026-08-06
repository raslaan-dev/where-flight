import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { subscribeToNetwork } from '@/stores/network-store';
import { ThemeProvider, useTheme } from '@/theme';

function RootNavigator() {
  const { colors } = useTheme();

  return (
    <>
      <StatusBar style={colors.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  // One connectivity subscription for the whole app; the API client and the
  // polling loop read the resulting store rather than each subscribing.
  useEffect(() => subscribeToNetwork(), []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
