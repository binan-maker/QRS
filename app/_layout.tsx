import '../polyfills';
import "@/shared/i18n";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import * as NavigationBar from "expo-navigation-bar";
import React, { useEffect, useRef } from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setHapticsEnabled } from "@/shared/utils/haptics";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/shared/components/feedback/ErrorBoundary";
import { queryClient } from "@/shared/utils/query-client";
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
import ConsentModal, { hasUserConsented } from "@/shared/components/consent/ConsentModal";
import { ToastProvider } from "@/shared/components/ui/Toast";
import {
registerForPushNotifications,
trackAppOpen,
setupNotificationTapHandler,
} from "@/lib/push-notifications";

SplashScreen.preventAutoHideAsync();

function SplashGate({ fontsReady, consentReady }: { fontsReady: boolean; consentReady: boolean }) {
const { isLoading: authLoading } = useAuth();
const hiddenRef = useRef(false);

useEffect(() => {
const safety = setTimeout(() => {
if (!hiddenRef.current) {
hiddenRef.current = true;
SplashScreen.hideAsync().catch(() => {});
}
}, 2500);
return () => clearTimeout(safety);
}, []);

useEffect(() => {
if (fontsReady && !authLoading && consentReady && !hiddenRef.current) {
hiddenRef.current = true;
SplashScreen.hideAsync().catch(() => {});
}
}, [fontsReady, authLoading, consentReady]);

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
<Stack.Screen name="qr-detail/[id]" options={{ headerShown: false }} />
<Stack.Screen name="my-qr/[id]" options={{ headerShown: false }} />
<Stack.Screen name="my-qr-codes" options={{ headerShown: false }} />
      <Stack.Screen name="qr-standard" options={{ headerShown: false }} />
      <Stack.Screen name="qr-private"   options={{ headerShown: false }} />
      <Stack.Screen name="favorites" options={{ headerShown: false }} />
<Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
<Stack.Screen name="terms" options={{ headerShown: false }} />
      <Stack.Screen name="trust-scores" options={{ headerShown: false }} />
      <Stack.Screen name="how-it-works" options={{ headerShown: false }} />
<Stack.Screen name="account-management" options={{ headerShown: false }} />
<Stack.Screen name="privacy-settings" options={{ headerShown: false }} />
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
const { isLoading, user } = useAuth();
const { colors } = useTheme();
const [timedOut, setTimedOut] = React.useState(false);

React.useEffect(() => {
const t = setTimeout(() => setTimedOut(true), 2000);
return () => clearTimeout(t);
}, []);

// ── Push notifications ──────────────────────────────────────────────────────
// Register push token once per login and track every app open.
const pushRegisteredRef = React.useRef<string | null>(null);
React.useEffect(() => {
if (!user?.uid) return;
if (pushRegisteredRef.current === user.uid) return;
pushRegisteredRef.current = user.uid;
registerForPushNotifications(user.uid);
trackAppOpen(user.uid);
}, [user?.uid]);

// Set up tap-handler once on mount; clean up on unmount.
React.useEffect(() => {
const cleanup = setupNotificationTapHandler();
return cleanup;
}, []);

if (isLoading && !timedOut) {
return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}

return <ThemedApp />;
}

function ConsentGatedApp({ onReady }: { onReady: () => void }) {
const [consentChecked, setConsentChecked] = React.useState(false);
const [consentGiven, setConsentGiven] = React.useState(false);

React.useEffect(() => {
hasUserConsented().then((given) => {
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
const [consentReady, setConsentReady] = React.useState(false);

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