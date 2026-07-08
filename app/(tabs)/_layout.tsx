import { Tabs, router } from "expo-router";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import React, { useEffect, useCallback, useMemo, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAppTranslation } from "@/shared/i18n/useAppTranslation";
import { TabBarProvider, useTabBarScroll } from "@/shared/contexts/TabBarContext";

// ── iOS glassmorphism pill background ──────────────────────────────────────────
// Full-width frosted glass bar (matches reference: dark glass pill, icon +
// label pairs, evenly spaced, floating just above the home indicator).
//   1. Shadow halo  — soft drop shadow beneath the pill (rendered in a wrapper
//      View because React Native shadows require a non-transparent background;
//      we use a near-invisible fill just to anchor the shadow).
//   2. BlurView     — heavy frosted glass, clipped to the pill's rounded shape.
//   3. Tint overlay — a dark veil so the bar reads as true glass (not washed out).
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
            borderRadius: 30,
            backgroundColor: isDark
              ? "rgba(12,16,26,0.01)" // near-transparent but non-zero for shadow
              : "rgba(255,255,255,0.01)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: isDark ? 0.55 : 0.2,
            shadowRadius: 30,
          },
        ]}
      />

      {/* 2. BlurView + 3 + 4 + 5 — pushed to max intensity for a fully-glass look */}
      <BlurView
        intensity={isDark ? 92 : 88}
        tint={isDark ? "dark" : "light"}
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: 30, overflow: "hidden" },
        ]}
      >
        {/* 3. Tint overlay — deepens contrast so icons/labels pop against the blur */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark
                ? "rgba(8,10,16,0.62)"
                : "rgba(248,250,255,0.42)",
            },
          ]}
        />

        {/* 4. Top shimmer — "light catching the top edge of the glass" */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 22,
            right: 22,
            height: 1,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.2)"
              : "rgba(255,255,255,0.95)",
            borderRadius: 1,
          }}
        />

        {/* 5. Border ring */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: 30,
              borderWidth: 1,
              borderColor: isDark
                ? "rgba(255,255,255,0.12)"
                : "rgba(255,255,255,0.75)",
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

// ── Glowing icon wrap (iOS only) ─────────────────────────────────────────────
// Mirrors the reference bar's tap animation: when a tab becomes active, a
// soft colored glow "pops" in behind the icon (scale + fade burst) and the
// icon itself springs up to full size. Android is untouched — it keeps the
// original flat highlight pill with no animation.
const isIOSPlatform = Platform.OS === "ios";

const GlowIconWrap = React.memo(function GlowIconWrap({
  focused,
  color,
  children,
}: {
  focused: boolean;
  color: string;
  children: React.ReactNode;
}) {
  const scale       = useRef(new Animated.Value(focused ? 1 : 0.9)).current;
  const glowOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const hasMounted  = useRef(false);

  useEffect(() => {
    if (!isIOSPlatform) return;
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    if (focused) {
      scale.setValue(0.45);
      glowOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 16,
          bounciness: 10,
        }),
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(glowOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [focused, scale, glowOpacity]);

  if (!isIOSPlatform) {
    return (
      <View
        style={focused ? [styles.activeIconWrap, { backgroundColor: color + "20" }] : styles.iconWrap}
      >
        {children}
      </View>
    );
  }

  return (
    <View style={styles.iconWrap}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            backgroundColor: color + "33",
            shadowColor: color,
            opacity: glowOpacity,
            transform: [{ scale }],
          },
        ]}
      />
      <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
    </View>
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
    <GlowIconWrap focused={focused} color={color}>
      <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
    </GlowIconWrap>
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
    <GlowIconWrap focused={focused} color={color}>
      <MaterialCommunityIcons
        name={focused ? "qrcode-edit" : "qrcode"}
        size={22}
        color={color}
      />
    </GlowIconWrap>
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
    <GlowIconWrap focused={focused} color={color}>
      <Ionicons name={focused ? "time" : "time-outline"} size={22} color={color} />
    </GlowIconWrap>
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
    <GlowIconWrap focused={focused} color={color}>
      <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
    </GlowIconWrap>
  );
});

// ── Stable icon render functions (referentially stable across renders) ──────────
const renderHomeIcon = ({ color, focused }: { color: string; focused: boolean }) => <HomeIcon color={color} focused={focused} />;
const renderGenIcon  = ({ color, focused }: { color: string; focused: boolean }) => <GeneratorIcon color={color} focused={focused} />;
const renderHistIcon = ({ color, focused }: { color: string; focused: boolean }) => <HistoryIcon color={color} focused={focused} />;
const renderProfIcon = ({ color, focused }: { color: string; focused: boolean }) => <ProfileIcon color={color} focused={focused} />;

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

  // ── iOS floating glass pill layout ──────────────────────────────────────────
  // The bar is a full-width glass pill (matches the reference: dark glass,
  // icon + label pairs evenly spaced) that floats above the home indicator
  // with horizontal margins. It does NOT include insets.bottom in its own
  // height — instead it is positioned `insets.bottom + IOS_BOTTOM_GAP` above
  // the screen bottom edge.
  //
  // Android keeps the original full-width, full-height approach.
  const IOS_BAR_HEIGHT     = 78;
  const IOS_BOTTOM_GAP     = 10; // gap between pill and home indicator
  const ANDROID_BAR_HEIGHT = 70 + insets.bottom;

  const tabBarHeight = isWeb
    ? 84
    : isIOS
    ? IOS_BAR_HEIGHT
    : ANDROID_BAR_HEIGHT;

  const scrollHideHeight = isWeb
    ? 84
    : isIOS
    ? IOS_BAR_HEIGHT + insets.bottom + IOS_BOTTOM_GAP
    : ANDROID_BAR_HEIGHT;

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
          left:          16,
          right:         16,
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
        fontSize:        11,
        marginTop:       3,
        marginBottom:    0,
        letterSpacing:   0.1,
        includeFontPadding: false,
      },
      tabBarItemStyle: {
        paddingTop:     8,
        paddingBottom:  6,
        alignItems:     "center" as const,
        justifyContent: "center" as const,
      },
    }),
    [colors.primary, colors.tabIconDefault, tabBarHeight, insets.bottom, tabBarBackground, isIOS, tabBarTranslateY],
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
          options={{ href: null, tabBarStyle: hiddenTabBar }}
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
  // ClassicTabLayout renders a fully custom glass bar (BlurView) that gives
  // full control over size, spacing, and label/icon layout to match the
  // requested design across all iOS versions including iOS 26.
  //
  // Re-enable NativeTabLayout only once expo-router/unstable-native-tabs
  // supports this custom bar layout or a stable workaround is available:
  //   if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return (
    <TabBarProvider>
      <ClassicTabLayout />
    </TabBarProvider>
  );
}

const styles = StyleSheet.create({
  // ── Tab icons ─────────────────────────────────────────────────────────────────
  iconWrap: {
    width: 40, height: 28,
    alignItems: "center", justifyContent: "center", borderRadius: 10,
  },
  activeIconWrap: {
    width: 40, height: 28,
    alignItems: "center", justifyContent: "center", borderRadius: 10,
  },
  glow: {
    position: "absolute",
    width: 40, height: 40,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    shadowOpacity: 1,
  },
});
