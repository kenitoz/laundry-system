import { DMSans_400Regular, DMSans_700Bold, useFonts } from '@expo-google-fonts/dm-sans';
import { PlayfairDisplay_700Bold, PlayfairDisplay_700Bold_Italic } from '@expo-google-fonts/playfair-display';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { onUnauthorized } from '../src/api';
import { SessionProvider, useSession } from '../src/session';
import { colors } from '../src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell() {
  const [fontsLoaded, fontError] = useFonts({ DMSans_400Regular, DMSans_700Bold, PlayfairDisplay_700Bold, PlayfairDisplay_700Bold_Italic });
  const { ready, signOut } = useSession();
  const loaded = (fontsLoaded || !!fontError) && ready;

  // Any 401 (expired session, credentials changed elsewhere) ends the session.
  useEffect(() => {
    onUnauthorized(() => {
      signOut();
      router.replace('/');
    });
  }, [signOut]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SessionProvider>
          <Shell />
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
