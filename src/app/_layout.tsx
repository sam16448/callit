import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { EntitlementsProvider } from '@/state/entitlements';
import { ProfileProvider, useProfile } from '@/state/profile';
import { RunsProvider, useRuns } from '@/state/runs';
import { C, F, S } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, text: C.text, border: C.line, primary: C.accent },
};

/** Shown instead of a crash screen if any screen throws. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.errorRoot}>
      <Text style={styles.errorTitle}>Something broke</Text>
      <Text style={styles.errorBody}>Call It hit an unexpected problem. Your profile and Aura are safe on this phone.</Text>
      <Text style={styles.errorDetail} numberOfLines={3}>
        {error.message}
      </Text>
      <Pressable onPress={retry} style={styles.errorButton} accessibilityRole="button">
        <Text style={styles.errorButtonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

/** Keeps the splash screen up until fonts and saved data are loaded. */
function AppStack({ fontsReady }: { fontsReady: boolean }) {
  const profile = useProfile();
  const runs = useRuns();
  const ready = fontsReady && profile.loaded && runs.loaded;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'slide_from_right' }}>
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="run/[board]" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
      <Stack.Screen name="how-to-play" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
      <Stack.Screen name="practice" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
      <Stack.Screen name="league/[id]" />
      <Stack.Screen name="join/[code]" options={{ animation: 'fade' }} />
      <Stack.Screen name="paywall" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaProvider>
        <ThemeProvider value={theme}>
          <ProfileProvider>
            <EntitlementsProvider>
              <RunsProvider>
                <StatusBar style="light" />
                <AppStack fontsReady={fontsLoaded || Boolean(fontError)} />
              </RunsProvider>
            </EntitlementsProvider>
          </ProfileProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  errorRoot: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', padding: S.xl, gap: S.md },
  errorTitle: { color: C.text, fontSize: 26, fontFamily: F.display },
  errorBody: { color: C.muted, fontSize: 15, lineHeight: 22 },
  errorDetail: { color: C.faint, fontSize: 12 },
  errorButton: { marginTop: S.md, backgroundColor: C.accent, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  errorButtonText: { color: C.accentInk, fontSize: 16, fontWeight: '700' },
});
