import { Tabs, router } from "expo-router";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTranslation } from "@/shared/i18n/useAppTranslation";
import * as Haptics from "@/shared/utils/haptics";
import { TabBarProvider, useTabBarScroll } from "@/shared/contexts/TabBarContext";

// ── iOS glassmorphism pill background ──────────────────────────────────────────
// Layered approach:
//   1. Shadow halo  — soft drop shadow beneath the pill (rendered in a wrapper
//      View because React Native shadows require a non-transparent background;
//      we use a near-invisible fill just to anchor the shadow).
//   2. BlurView     — frosted glass. overflow:"hidden" clips the blur to the pill.
//   3. Tint overlay — adds depth and prevents the blur from looking washed-out.
//   4. Top shimmer  — 1 px highlight at the very top edge (catches the light).
//   5. Border ring  — crisp 1 px perimeter to define the glass edge.
const IosTabBarBackground = React.memo(function IosTabBarBackground({
  isDark,
}: {
  isDark: boolean;
}) {
  return (
    <>
      {/* 1. Shadow halo */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: 28,
            backgroundColor: isDark
              ? "rgba(12,16,26,0.01)"   // near-transparent but non-zero for shadow
              : "rgba(255,255,255,0.01)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: isDark ? 0.5 : 0.18,
            shadowRadius: 28,
          },
        ]}
      />

      {/* 2. BlurView + 3 + 4 + 5 */}
      <BlurView
        intensity={isDark ? 78 : 72}
        tint={isDark ? "dark" : "light"}
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: 28, overflow: "hidden" },
        ]}
      >
        {/* 3. Tint overlay — deepens contrast so icons pop against the blur */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark
                ? "rgba(10,14,23,0.52)"
                : "rgba(248,250,255,0.48)",
            },
          ]}
        />

        {/* 4. Top shimmer — "light catching the top edge of the glass" */}
        <View
          style={{
            position:        "absolute",
            top:             0,
            left:            20,
            right:           20,
            height:          1,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.18)"
              : "rgba(255,255,255,0.95)",
            borderRadius:    1,
          }}
        />

        {/* 5. Border ring */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius:  28,
              borderWidth:   1,
              borderColor:   isDark
                ? "rgba(255,255,255,0.11)"
                : "rgba(255,255,255,0.72)",
            },
          ]}
        />
      </BlurView>
    </>
  );
});

const AndroidTabBarBackground = React.memo(function AndroidTabBarBackground({
  backgroundColor,
  borderColor,
}: {
  backgroundColor: string;
  borderColor: string;
}) {
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          bottom: -120,
          backgroundColor,
          borderTopLeftRadius: 22, borderTopRightRadius: 22,
          borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
          borderTopWidth: 1, borderLeftWidth: 0,
          borderRightWidth: 0, borderBottomWidth: 0,
          borderColor,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.18, shadowRadius: 20, elevation: 20,
        },
      ]}
    />
  );
});

// ── Scan FAB (memoized — contains LinearGradient which is GPU-expensive) ───────
// Design: floating glass ring → gradient button → QR icon
//   • Glass ring: semi-transparent bordered halo that bridges the FAB to the
//     pill bar and adds the "magnified glass" look.
//   • Gradient inner: primary → primaryShade with a strong coloured shadow.
//   • The ring shadow is black (for depth); the inner shadow is primary-tinted
//     (for the glow effect seen in premium iOS apps).
const ScanTabButton = React.memo(function ScanTabButton({
  onPress,
}: {
  onPress?: () => void;
}) {
  const { colors } = useTheme();

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.();
  }, [onPress]);

  return (
    <Pressable
      onPress={handlePress}
      style={styles.scanTabBtn}
      accessibilityLabel="Scan QR code"
      accessibilityRole="button"
    >
      {/* Glass halo ring */}
      <View
        style={[
          styles.scanTabBtnRing,
          {
            backgroundColor: colors.isDark
              ? "rgba(255,255,255,0.07)"
              : "rgba(255,255,255,0.55)",
            borderColor: colors.isDark
              ? "rgba(255,255,255,0.16)"
              : "rgba(255,255,255,0.85)",
            shadowColor: "#000",
          },
        ]}
      >
        {/* Gradient core */}
        <LinearGradient
          colors={[colors.primary, colors.primaryShade]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.scanTabBtnInner,
            {
              shadowColor:   colors.primary,
              shadowOffset:  { width: 0, height: 4 },
              shadowOpacity: 0.55,
              shadowRadius:  12,
              elevation:     12,
            },
          ]}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={27} color="#fff" />
        </LinearGradient>
      </View>
    </Pressable>
  );
});

// ── Tab icon components (memoized to prevent recreation on every tab-bar paint) ─
const HomeIcon = React.memo(function HomeIcon({
  color,
  focused,
}: {
  color: string;
  focused: boolean;
}) {
  return (
    <View
      style={focused ? [styles.activeIconWrap, { backgroundColor: color + "18" }] : styles.iconWrap}
    >
      <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
    </View>
  );
});

const GeneratorIcon = React.memo(function GeneratorIcon({
  color,
  focused,
}: {
  color: string;
  focused: boolean;
}) {
  return (
    <View
      style={focused ? [styles.activeIconWrap, { backgroundColor: color + "18" }] : styles.iconWrap}
    >
      <MaterialCommunityIcons
        name={focused ? "qrcode-edit" : "qrcode"}
        size={24}
        color={color}
      />
    </View>
  );
});

const HistoryIcon = React.memo(function HistoryIcon({
  color,
  focused,
}: {
  color: string;
  focused: boolean;
}) {
  return (
    <View
      style={focused ? [styles.activeIconWrap, { backgroundColor: color + "18" }] : styles.iconWrap}
    >
      <Ionicons name={focused ? "time" : "time-outline"} size={24} color={color} />
    </View>
  );
});

const ProfileIcon = React.memo(function ProfileIcon({
  color,
  focused,
}: {
  color: string;
  focused: boolean;
}) {
  return (
    <View
      style={focused ? [styles.activeIconWrap, { backgroundColor: color + "18" }] : styles.iconWrap}
    >
      <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
    </View>
  );
});

// ── Stable icon render functions (referentially stable across renders) ──────────
const renderHomeIcon   = ({ color, focused }: { color: string; focused: boolean }) => <HomeIcon color={color} focused={focused} />;
const renderGenIcon    = ({ color, focused }: { color: string; focused: boolean }) => <GeneratorIcon color={color} focused={focused} />;
const renderHistIcon   = ({ color, focused }: { color: string; focused: boolean }) => <HistoryIcon color={color} focused={focused} />;
const renderProfIcon   = ({ color, focused }: { color: string; focused: boolean }) => <ProfileIcon color={color} focused={focused} />;
const renderScanButton = () => <ScanTabButton onPress={() => router.push("/(tabs)/scanner")} />;
const renderNoLabel    = () => null;

function ClassicTabLayout() {
  const isWeb  = Platform.OS === "web";
  const isIOS  = Platform.OS === "ios";
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useAppTranslation();
  const { tabBarTranslateY, setTabBarHeight } = useTabBarScroll();

  useEffect(() => {
    AsyncStorage.getItem("qrg:startup:screen").then((pref) => {
      if (pref === "scanner") router.replace("/(tabs)/scanner");
    }).catch(() => {});
  }, []);

  // ── iOS floating pill layout ─────────────────────────────────────────────────
  // The bar is a glass pill that floats above the home indicator with horizontal
  // margins. It does NOT include insets.bottom in its own height — instead it is
  // positioned `insets.bottom + 10` above the screen bottom edge.
  //
  // Android keeps the original full-width, full-height approach.
  const IOS_BAR_HEIGHT     = 70;
  const IOS_BOTTOM_GAP     = 10; // gap between pill and home indicator
  const ANDROID_BAR_HEIGHT = 70 + insets.bottom;

  const tabBarHeight = isWeb
    ? 84
    : isIOS
    ? IOS_BAR_HEIGHT
    : ANDROID_BAR_HEIGHT;

  // Total visual footprint from screen bottom → top of FAB.
  // Used by the scroll-hide animation to know how far to translate.
  const FAB_OVERHANG = 34; // matches new scanTabBtn marginTop: -34
  const scrollHideHeight = isWeb
    ? 84
    : isIOS
    ? IOS_BAR_HEIGHT + insets.bottom + IOS_BOTTOM_GAP + FAB_OVERHANG
    : ANDROID_BAR_HEIGHT + FAB_OVERHANG;

  useEffect(() => {
    setTabBarHeight(scrollHideHeight);
  }, [scrollHideHeight, setTabBarHeight]);

  const hiddenTabBar = useMemo(() => ({ display: "none" as const }), []);

  const tabBarBorderColor = colors.surfaceBorder; // Android only — iOS draws its own border

  const tabBarBackground = useCallback(
    () =>
      isIOS ? (
        <IosTabBarBackground isDark={colors.isDark} />
      ) : (
        <AndroidTabBarBackground
          backgroundColor={colors.isDark ? colors.background : colors.surface}
          borderColor={tabBarBorderColor}
        />
      ),
    [isIOS, colors.isDark, colors.background, colors.surface, tabBarBorderColor],
  );

  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarActiveTintColor:   colors.primary,
      tabBarInactiveTintColor: colors.tabIconDefault,
      tabBarStyle: {
        position:        "absolute" as const,
        backgroundColor: "transparent",
        borderTopWidth:  0,
        elevation:       0,
        height:          tabBarHeight,
        // iOS: float the pill above the home indicator with horizontal margins.
        // Android/web: full-width flush to the bottom.
        ...(isIOS ? {
          bottom:        insets.bottom + IOS_BOTTOM_GAP,
          left:          12,
          right:         12,
          paddingBottom: 0,
        } : {
          bottom:        0,
          paddingBottom: insets.bottom,
        }),
        paddingTop:  0,
        overflow:    "visible" as const,
        transform:   [{ translateY: tabBarTranslateY }],
      } as any,
      tabBarBackground,
      tabBarShowLabel: true,
      tabBarLabelStyle: {
        fontFamily:      "Inter_500Medium",
        fontSize:        10.5,
        marginTop:       2,
        marginBottom:    0,
        letterSpacing:   0.1,
        includeFontPadding: false,
      },
      tabBarItemStyle: {
        paddingTop:     6,
        paddingBottom:  4,
        alignItems:     "center" as const,
        justifyContent: "center" as const,
      },
    }),
    [colors.primary, colors.tabIconDefault, tabBarHeight, insets.bottom, tabBarBackground, isIOS],
  );

  return (
    <View style={{ flex: 1 }}>
      <Tabs initialRouteName="index" screenOptions={screenOptions}>
        <Tabs.Screen
          name="index"
          options={{ title: t("tabs.home"), tabBarIcon: renderHomeIcon }}
        />

        <Tabs.Screen
          name="qr-generator"
          options={{ title: t("tabs.generator"), tabBarIcon: renderGenIcon }}
        />

        <Tabs.Screen
          name="scanner"
          options={{
            title:           "",
            tabBarLabel:     renderNoLabel,
            tabBarStyle:     hiddenTabBar,
            tabBarButton:    renderScanButton,
          }}
        />

        <Tabs.Screen
          name="history"
          options={{ title: t("tabs.history"), tabBarIcon: renderHistIcon }}
        />

        <Tabs.Screen
          name="my-qr-codes"
          options={{ href: null, tabBarStyle: hiddenTabBar }}
        />

        <Tabs.Screen
          name="profile"
          options={{ title: t("tabs.profile"), tabBarIcon: renderProfIcon }}
        />

        <Tabs.Screen
          name="settings"
          options={{ href: null, tabBarStyle: hiddenTabBar }}
        />
      </Tabs>

      {/* Bottom system nav bar fill — covers the gesture/button nav zone when
          the tab bar is animated off-screen during scroll, so the area never
          shows raw content behind the system navigation buttons */}
      {!isWeb && Platform.OS === "android" && insets.bottom > 0 && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: insets.bottom,
            backgroundColor: colors.background,
            zIndex: 5,
          }}
        />
      )}
    </View>
  );
}

export default function TabLayout() {
  // NOTE: NativeTabLayout (Liquid Glass / iOS 26) is intentionally bypassed.
  //
  // expo-router/unstable-native-tabs wraps a native UITabBarController which
  // only knows about the tabs listed as <NativeTabs.Trigger>. The scanner is
  // a centre-FAB tab — it has no visible trigger and must be reached via
  // router.push("/(tabs)/scanner"). That push silently fails on the native
  // controller because the route is not registered as a trigger, so the
  // scanner screen never opens when tapped from the home cards or anywhere else.
  //
  // ClassicTabLayout renders the scanner as a custom floating FAB (renderScanButton)
  // and hides the tab bar on the scanner screen (tabBarStyle: hiddenTabBar).
  // It works correctly on all iOS versions including iOS 26.
  //
  // Re-enable NativeTabLayout only once expo-router/unstable-native-tabs
  // supports hidden/FAB tabs or a stable workaround is available:
  //   if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return (
    <TabBarProvider>
      <ClassicTabLayout />
    </TabBarProvider>
  );
}

const styles = StyleSheet.create({
  // ── Scan FAB ─────────────────────────────────────────────────────────────────
  scanTabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    // Lift the FAB above the pill bar. 34 px matches FAB_OVERHANG in the
    // layout so the scroll-hide animation fully clears the button.
    marginTop: -34,
  },
  // Glass halo ring — a slightly larger semi-transparent disc that sits behind
  // the gradient core. Gives depth and visually anchors the FAB to the pill.
  scanTabBtnRing: {
    width:          82,
    height:         82,
    borderRadius:   41,
    alignItems:     "center",
    justifyContent: "center",
    borderWidth:    1.5,
    // Drop shadow for the outer ring (depth beneath the pill)
    shadowOffset:   { width: 0, height: 10 },
    shadowOpacity:  0.28,
    shadowRadius:   22,
    elevation:      18,
  },
  // Gradient core — the coloured button inside the glass ring
  scanTabBtnInner: {
    width:          62,
    height:         62,
    borderRadius:   31,
    alignItems:     "center",
    justifyContent: "center",
  },
  // ── Tab icons ─────────────────────────────────────────────────────────────────
  iconWrap: {
    width: 40, height: 28,
    alignItems: "center", justifyContent: "center", borderRadius: 10,
  },
  activeIconWrap: {
    width: 52, height: 28,
    alignItems: "center", justifyContent: "center", borderRadius: 14,
  },
});
