import "@/polyfills";
import "@/lib/i18n";
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
import ConsentModal, { hasUserConsented } from "@/components/ConsentModal";

SplashScreen.preventAutoHideAsync();

function SplashGate({ fontsReady }: { fontsReady: boolean }) {
  const { isLoading: authLoading } = useAuth();
  const hiddenRef = useRef(false);

  useEffect(() => {
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
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: "none" }} />
      <Stack.Screen name="(auth)" options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }} />
      <Stack.Screen name="qr-detail/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="my-qr/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="my-qr-codes" options={{ headerShown: false }} />
      <Stack.Screen name="favorites" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
      <Stack.Screen name="terms" options={{ headerShown: false }} />
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
        backgroundColor: colors.background,
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

function AuthGatedApp() {
  const { isLoading } = useAuth();
  const { colors } = useTheme();
  const [timedOut, setTimedOut] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, []);

  if (isLoading && !timedOut) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return <ThemedApp />;
}

function ConsentGatedApp() {
  const [consentChecked, setConsentChecked] = React.useState(false);
  const [consentGiven, setConsentGiven] = React.useState(false);

  React.useEffect(() => {
    hasUserConsented().then((given) => {
      setConsentGiven(given);
      setConsentChecked(true);
    });
  }, []);

  const handleAccept = () => {
    setConsentGiven(true);
  };

  if (!consentChecked) {
    return null;
  }

  return (
    <>
      <AuthGatedApp />
      <ConsentModal
        visible={!consentGiven}
        onAccept={handleAccept}
      />
    </>
  );
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
    AsyncStorage.getItem("haptic_enabled").then((v) => {
      if (v !== null) setHapticsEnabled(v !== "false");
    });
  }, []);

  if (!fontsReady) return null;

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SplashGate fontsReady={fontsReady} />
            <ConsentGatedApp />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
