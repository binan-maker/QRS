import "@/polyfills";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { Platform, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setHapticsEnabled } from "@/lib/haptics";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { WEB_MAX_WIDTH } from "@/lib/utils/platform";

SplashScreen.preventAutoHideAsync();

/**
 * Hides the splash screen only when BOTH fonts are ready AND Firebase auth
 * has resolved its initial state. This prevents the brief flash of the
 * unauthenticated UI that occurs when the splash dismisses before
 * onAuthStateChanged fires.
 *
 * A 5-second safety timeout ensures the splash never hangs indefinitely if
 * auth fails silently (e.g., no network on cold start).
 */
function SplashGate({ fontsReady }: { fontsReady: boolean }) {
  const { isLoading: authLoading } = useAuth();
  const hiddenRef = useRef(false);

  useEffect(() => {
    // Safety net: hide splash after 5s no matter what
    const safety = setTimeout(() => {
      if (!hiddenRef.current) {
        hiddenRef.current = true;
        SplashScreen.hideAsync().catch(() => {});
      }
    }, 5000);
    return () => clearTimeout(safety);
  }, []);

  useEffect(() => {
    if (fontsReady && !authLoading && !hiddenRef.current) {
      hiddenRef.current = true;
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsReady, authLoading]);

  return null;
}

function RootLayoutNav() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="qr-detail/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="my-qr/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="my-qr-codes" options={{ headerShown: false }} />
      <Stack.Screen name="favorites" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
      <Stack.Screen name="trust-scores" options={{ headerShown: false }} />
      <Stack.Screen name="how-it-works" options={{ headerShown: false }} />
      <Stack.Screen name="account-management" options={{ headerShown: false }} />
      <Stack.Screen name="search" options={{ headerShown: false }} />
      <Stack.Screen name="friends" options={{ headerShown: false }} />
      <Stack.Screen name="privacy-settings" options={{ headerShown: false }} />
      <Stack.Screen name="profile/[username]" options={{ headerShown: false }} />
    </Stack>
  );
}

function ThemedApp() {
  const { colors } = useTheme();
  const isWeb = Platform.OS === "web";
  return (
    <GestureHandlerRootView
      style={{
        flex: 1,
        backgroundColor: isWeb ? colors.background : colors.background,
        ...(isWeb ? { alignItems: "center" } : {}),
      }}
    >
      <View
        style={{
          flex: 1,
          width: "100%",
          ...(isWeb ? { maxWidth: WEB_MAX_WIDTH, backgroundColor: colors.background } : {}),
        }}
      >
        <KeyboardProvider>
          <StatusBar style={colors.statusBar} backgroundColor={colors.background} />
          <RootLayoutNav />
        </KeyboardProvider>
      </View>
    </GestureHandlerRootView>
  );
}

/**
 * Blocks the entire app from rendering its screens until Firebase has resolved
 * the initial auth state. Without this, every time the app launches or returns
 * from the background, tab screens momentarily render in "guest" mode (showing
 * login prompts) before onAuthStateChanged fires — even though the user is signed in.
 *
 * Firebase resolves from its local token cache in <100ms, so the blank view is
 * imperceptible in practice. A 4s safety cap prevents a permanent blank screen
 * if auth somehow never resolves (e.g. no network and no cached state).
 */
function AuthGatedApp() {
  const { isLoading } = useAuth();
  const { colors } = useTheme();
  const [timedOut, setTimedOut] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, []);

  if (isLoading && !timedOut) {
    // Render only the background — no routing, no tab screens, no guest UI.
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return <ThemedApp />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    // Load haptics setting from AsyncStorage on app start
    AsyncStorage.getItem("haptic_enabled").then((v) => {
      if (v !== null) setHapticsEnabled(v !== "false");
    });
  }, []);

  // Don't render anything until fonts are at least attempted — prevents a
  // flash of unstyled text before Inter is available.
  if (!fontsReady) return null;

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            {/* SplashGate lives inside AuthProvider so it can read isLoading */}
            <SplashGate fontsReady={fontsReady} />
            <AuthGatedApp />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
