import '../polyfills';
// Importing startup-prefs triggers its module-level prefetchStartupPrefs() call
// at bundle-evaluation time — well before any React component mounts — so all
// providers can initialise synchronously from the cache on first render.
import {
  prefetchStartupPrefs,
  getStartupPref,
  isStartupPrefsLoaded,
  STARTUP_PREF_KEYS,
} from "@/lib/startup-prefs";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import * as NavigationBar from "expo-navigation-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setHapticsEnabled } from "@/shared/utils/haptics";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/shared/components/feedback/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AuthProvider, useAuth } from "@/shared/contexts/AuthContext";
import { ThemeProvider, useTheme } from "@/shared/contexts/ThemeContext";
import { AvatarProvider } from "@/shared/contexts/AvatarContext";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { WEB_MAX_WIDTH } from "@/shared/utils/platform";
import ConsentModal, { CONSENT_VERSION } from "@/shared/components/consent/ConsentModal";
import { ToastProvider } from "@/shared/components/ui/Toast";
import {
  registerForPushNotifications,
  trackAppOpen,
  setupNotificationTapHandler,
} from "@/lib/push-notifications";

SplashScreen.preventAutoHideAsync();

// How long (ms) to wait before force-hiding the splash if the normal path has
// not completed. Kept here so it is easy to find and tune.
//
// Rationale for 1 200 ms:
//   • Firebase AsyncStorage session restore:  50–400 ms (verified users)
//   • useFonts (assets bundled):              50–200 ms
//   • startup-prefs / consent:                <20 ms (module-load head-start)
//   • Worst-case normal path:                ~600 ms
//   • 1 200 ms = 2× worst-case, enough margin for slow devices without
//     making every user wait 2 500 ms on a slow network launch.
//
// Note: unverified-email users incur an extra reload() network call (200–500 ms)
// which can push them past 1 000 ms — the safety timeout handles this gracefully.
const SPLASH_SAFETY_TIMEOUT_MS = 1200;

function SplashGate({ fontsReady, consentReady }: { fontsReady: boolean; consentReady: boolean }) {
  const { isLoading: authLoading } = useAuth();
  const hiddenRef = useRef(false);
  // Measures time from SplashGate mount to splash-hidden; logged in dev builds
  // so real-device numbers can inform future timeout reductions.
  const startRef = useRef(Date.now());

  const hide = useCallback((trigger: string) => {
    if (hiddenRef.current) return;
    hiddenRef.current = true;
    if (__DEV__) {
      console.log(
        `[SplashGate] hidden via "${trigger}" — ${Date.now() - startRef.current} ms after mount`
      );
    }
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Safety timeout: force-hide if auth or fonts take unexpectedly long.
  useEffect(() => {
    const t = setTimeout(() => hide("safety-timeout"), SPLASH_SAFETY_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [hide]);

  // Normal path: hide as soon as all three conditions are met.
  useEffect(() => {
    if (__DEV__ && !authLoading) {
      console.log(`[SplashGate] authLoading=false at ${Date.now() - startRef.current} ms`);
    }
    if (fontsReady && !authLoading && consentReady) {
      hide("all-ready");
    }
  }, [fontsReady, authLoading, consentReady, hide]);

  return null;
}

function RootLayoutNav() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{
      headerShown: false,
      animation: "slide_from_right",
      contentStyle: { backgroundColor: colors.background },
    }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: "none" }} />
      <Stack.Screen name="(auth)" options={{
        animation: "fade",
        headerShown: false,
      }} />
      {/* (qr) group — QR viewing, detail and creation screens */}
      <Stack.Screen name="(qr)/qr-detail/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="(qr)/my-qr-detail/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="(qr)/my-qr-analytics/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="(qr)/qr-individual" options={{ headerShown: false }} />
      <Stack.Screen name="(qr)/qr-private" options={{ headerShown: false }} />
      {/* (account) group — user account, preferences and discovery */}
      <Stack.Screen name="(account)/favorites" options={{ headerShown: false }} />
      <Stack.Screen name="(account)/account-management" options={{ headerShown: false }} />
      <Stack.Screen name="(account)/privacy-settings" options={{ headerShown: false }} />
      <Stack.Screen name="(account)/donation" options={{ headerShown: false }} />
      <Stack.Screen name="(account)/search" options={{ headerShown: false }} />
      {/* (legal) group — legal, policy and informational screens */}
      <Stack.Screen name="(legal)/privacy-policy" options={{ headerShown: false }} />
      <Stack.Screen name="(legal)/terms" options={{ headerShown: false }} />
      <Stack.Screen name="(legal)/trust-scores" options={{ headerShown: false }} />
      <Stack.Screen name="(legal)/how-it-works" options={{ headerShown: false }} />
      <Stack.Screen name="profile/[username]" options={{ headerShown: false }} />
    </Stack>
  );
}

function ThemedApp() {
  const { colors } = useTheme();
  const isWeb = Platform.OS === "web";
  const insets = useSafeAreaInsets();

  // Keep the Android system navigation bar background in sync with the app theme.
  // Without this, the gesture/button bar at the bottom appears transparent or
  // white-on-white in light mode on edge-to-edge Android builds.
  useEffect(() => {
    if (Platform.OS === "android") {
      // expo-system-ui: colours the region behind the keyboard / safe-area.
      SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
      // On API 35+ (edge-to-edge enforced) only setButtonStyleAsync is respected;
      // setPositionAsync / setBackgroundColorAsync / setBorderColorAsync are no-ops
      // and generate console warnings — do not call them.
      NavigationBar.setButtonStyleAsync(colors.isDark ? "light" : "dark").catch(() => {});
    }
  }, [colors.background, colors.isDark]);

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
          <StatusBar style={colors.statusBar} backgroundColor="transparent" translucent />
          <RootLayoutNav />
        </KeyboardProvider>
      </View>

    </GestureHandlerRootView>
  );
}

function AuthGatedApp() {
  const { user } = useAuth();

  // ── Push notifications ──────────────────────────────────────────────────────
  // Register push token once per login and track every app open.
  const pushRegisteredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    if (pushRegisteredRef.current === user.id) return;
    pushRegisteredRef.current = user.id;
    registerForPushNotifications(user.id);
    trackAppOpen(user.id);
  }, [user?.id]);

  // Set up tap-handler once on mount; clean up on unmount.
  useEffect(() => {
    const cleanup = setupNotificationTapHandler();
    return cleanup;
  }, []);

  // The SplashGate (2 500 ms safety timeout) keeps the splash visible while
  // auth loads, so the user never sees this state. Removing the old 2 000 ms
  // timedOut guard eliminates the blank-screen race between that timer and the
  // SplashGate timeout. ThemedApp renders immediately; unauthenticated state
  // is handled by the navigation stack (redirect to auth screens).
  return <ThemedApp />;
}

function ConsentGatedApp({ onReady }: { onReady: () => void }) {
  // ── Synchronous initialisation from startup-prefs cache ──────────────────
  // startup-prefs.ts starts AsyncStorage.multiGet at module-load time. By the
  // time ConsentGatedApp first renders (after the font gate), the cache is
  // almost always already resolved — so consentChecked is true on the first
  // render and the dark-background flash is eliminated entirely.
  const [consentChecked, setConsentChecked] = useState(
    () => isStartupPrefsLoaded()
  );
  const [consentGiven, setConsentGiven] = useState(() =>
    isStartupPrefsLoaded()
      ? getStartupPref(STARTUP_PREF_KEYS.CONSENT_VERSION) === CONSENT_VERSION
      : false
  );

  useEffect(() => {
    if (isStartupPrefsLoaded()) {
      // Already resolved synchronously above; just notify RootLayout.
      onReady();
      return;
    }
    // Fallback: await the in-flight prefetch (should resolve within a few ms).
    prefetchStartupPrefs().then(() => {
      const given =
        getStartupPref(STARTUP_PREF_KEYS.CONSENT_VERSION) === CONSENT_VERSION;
      setConsentGiven(given);
      setConsentChecked(true);
      onReady();
    });
  }, []);

  const handleAccept = () => {
    setConsentGiven(true);
  };

  if (!consentChecked) {
    return <View style={{ flex: 1, backgroundColor: "#0A0E17" }} />;
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

  // ── consentReady: initialise synchronously if startup-prefs are already done.
  // Since startup-prefs.ts fires its multiGet at module-load time, the cache is
  // typically warm by the time this component first renders — consentReady starts
  // true and the SplashGate can hide the splash as soon as auth resolves.
  const [consentReady, setConsentReady] = useState(
    () => isStartupPrefsLoaded()
  );

  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    // Apply haptics preference from the startup-prefs cache (single bridge call
    // shared with all other startup prefs — no separate AsyncStorage.getItem).
    prefetchStartupPrefs().then(() => {
      const v = getStartupPref(STARTUP_PREF_KEYS.HAPTICS_ENABLED);
      if (v !== null) setHapticsEnabled(v !== "false");
    });
  }, []);

  if (!fontsReady) return null;

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AvatarProvider>
              <ToastProvider>
                <SplashGate fontsReady={fontsReady} consentReady={consentReady} />
                <ConsentGatedApp onReady={() => setConsentReady(true)} />
              </ToastProvider>
            </AvatarProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
