import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/error-boundary';
import { useAircraftStore } from '@/stores/aircraft-store';
import { useHydrated } from '@/stores/hydration';
import { subscribeToNetwork } from '@/stores/network-store';
import { ThemeProvider, useTheme } from '@/theme';

// Held until every store has been read back off disk, so the app never opens
// in the wrong theme or with an empty Track tab that fills in a frame later.
void SplashScreen.preventAutoHideAsync();

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
  const hydrated = useHydrated();

  // One connectivity subscription for the whole app; the API client and the
  // polling loop read the resulting store rather than each subscribing.
  useEffect(() => subscribeToNetwork(), []);

  // Backgrounding is the last chance to write: the OS may kill the process
  // without warning, and the throttle could be holding the newest snapshot.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void useAircraftStore.getState().flush();
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (hydrated) void SplashScreen.hideAsync();
  }, [hydrated]);

  if (!hydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          {/* Inside the theme provider so the crash screen can still theme. */}
          <ErrorBoundary>
            <RootNavigator />
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
