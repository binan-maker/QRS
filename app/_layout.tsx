import "@/polyfills";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setHapticsEnabled } from "@/lib/haptics";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AuthProvider } from "@/contexts/AuthContext";
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

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    AsyncStorage.getItem("haptic_enabled").then((v) => {
      if (v !== null) setHapticsEnabled(v !== "false");
    });
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemedApp />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
