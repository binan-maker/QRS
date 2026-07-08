import { Tabs, router } from "expo-router";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, Animated, PanResponder, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import React, { useEffect, useCallback, useMemo, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAppTranslation } from "@/shared/i18n/useAppTranslation";
import { TabBarProvider, useTabBarScroll } from "@/shared/contexts/TabBarContext";

// ── iOS glassmorphism dock background ───────────────────────────────────────
// True frosted-glass "island" look (matches iOS 17/18 floating dock style):
//   1. Shadow halo  — soft drop shadow beneath the pill (rendered in a wrapper
//      View because React Native shadows require a non-transparent background;
//      we use a near-invisible fill just to anchor the shadow).
//   2. BlurView     — heavy frosted glass, clipped to the pill's rounded shape.
//   3. Tint overlay — a very light veil so icons stay legible against the blur.
//   4. Top shimmer  — 1 px highlight at the very top edge (catches the light).
//   5. Border ring  — crisp 1 px perimeter to define the glass edge.
//   6. Drag handle attaches here via `panHandlers` so the whole dock (icons
//      included, since this layer sits behind them but shares the same pan
//      responder contract) can be grabbed and slid horizontally.
const IosTabBarBackground = React.memo(function IosTabBarBackground({
  isDark,
  panHandlers,
}: {
  isDark: boolean;
  panHandlers?: object;
}) {
  return (
    <View style={StyleSheet.absoluteFill} {...panHandlers}>
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
        {/* 3. Tint overlay — thin veil, just enough for icon contrast */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark
                ? "rgba(10,14,23,0.34)"
                : "rgba(248,250,255,0.28)",
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
              ? "rgba(255,255,255,0.22)"
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
                ? "rgba(255,255,255,0.14)"
                : "rgba(255,255,255,0.75)",
            },
          ]}
        />
      </BlurView>
    </View>
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
const renderHomeIcon = ({ color, focused }: { color: string; focused: boolean }) => <HomeIcon color={color} focused={focused} />;
const renderGenIcon  = ({ color, focused }: { color: string; focused: boolean }) => <GeneratorIcon color={color} focused={focused} />;
const renderHistIcon = ({ color, focused }: { color: string; focused: boolean }) => <HistoryIcon color={color} focused={focused} />;
const renderProfIcon = ({ color, focused }: { color: string; focused: boolean }) => <ProfileIcon color={color} focused={focused} />;

// iOS dock sizing — a compact, icon-only 4-button island (no scanner/FAB).
const IOS_TAB_COUNT   = 4;
const IOS_SLOT_WIDTH  = 68;
const IOS_DOCK_WIDTH  = IOS_TAB_COUNT * IOS_SLOT_WIDTH;
const IOS_DRAG_MARGIN = 12; // keep the dock at least this far from either screen edge

function ClassicTabLayout() {
  const isWeb  = Platform.OS === "web";
  const isIOS  = Platform.OS === "ios";
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useAppTranslation();
  const { tabBarTranslateY, setTabBarHeight } = useTabBarScroll();
  const { width: screenWidth } = useWindowDimensions();

  useEffect(() => {
    AsyncStorage.getItem("qrg:startup:screen").then((pref) => {
      if (pref === "scanner") router.replace("/(tabs)/scanner");
    }).catch(() => {});
  }, []);

  // ── iOS floating, draggable glass dock ──────────────────────────────────────
  // The bar is a compact glass island (just wide enough for the 4 icon-only
  // buttons) that floats above the home indicator. It starts centered
  // horizontally and can be dragged left/right — its vertical position stays
  // fixed (pinned above the home indicator); only translateX is draggable.
  //
  // Android keeps the original full-width, full-height, non-draggable approach.
  const IOS_BAR_HEIGHT     = 64;
  const IOS_BOTTOM_GAP     = 10; // gap between dock and home indicator
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

  // ── Horizontal drag handling (iOS only) ─────────────────────────────────────
  // dragX is a plain Animated.Value driven by the native driver. It represents
  // the offset from the dock's centered resting position. It is clamped on
  // release so the dock never leaves the screen bounds.
  const dragX       = useRef(new Animated.Value(0)).current;
  const dragXOffset = useRef(0); // last committed (flattened) offset, for clamping math
  const centeredLeft = (screenWidth - IOS_DOCK_WIDTH) / 2;
  const minOffset = IOS_DRAG_MARGIN - centeredLeft;
  const maxOffset = screenWidth - IOS_DRAG_MARGIN - IOS_DOCK_WIDTH - centeredLeft;

  useEffect(() => {
    const id = dragX.addListener(({ value }) => {
      dragXOffset.current = value;
    });
    return () => dragX.removeListener(id);
  }, [dragX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetResponderCapture: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        // Only steal the gesture once the user is clearly dragging
        // horizontally — this keeps taps on the icons working normally.
        onMoveShouldSetPanResponderCapture: (_evt, gesture) =>
          Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
        onPanResponderGrant: () => {
          dragX.setOffset(dragXOffset.current);
          dragX.setValue(0);
        },
        onPanResponderMove: Animated.event([null, { dx: dragX }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: () => {
          dragX.flattenOffset();
          const clamped = Math.min(maxOffset, Math.max(minOffset, dragXOffset.current));
          if (clamped !== dragXOffset.current) {
            Animated.spring(dragX, {
              toValue: clamped,
              useNativeDriver: true,
              bounciness: 6,
            }).start();
          }
        },
      }),
    [dragX, minOffset, maxOffset],
  );

  const tabBarBackground = useCallback(
    () =>
      isIOS ? (
        <IosTabBarBackground isDark={colors.isDark} panHandlers={panResponder.panHandlers} />
      ) : (
        <AndroidTabBarBackground
          backgroundColor={colors.isDark ? colors.background : colors.surface}
          borderColor={tabBarBorderColor}
        />
      ),
    [isIOS, colors.isDark, colors.background, colors.surface, tabBarBorderColor, panResponder],
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
        // iOS: compact, centered, draggable glass island above the home
        // indicator. Android/web: full-width flush to the bottom.
        ...(isIOS ? {
          bottom:        insets.bottom + IOS_BOTTOM_GAP,
          left:          (screenWidth - IOS_DOCK_WIDTH) / 2,
          width:         IOS_DOCK_WIDTH,
          paddingBottom: 0,
        } : {
          bottom:        0,
          paddingBottom: insets.bottom,
        }),
        paddingTop:  0,
        overflow:    "visible" as const,
        transform:   isIOS
          ? [{ translateY: tabBarTranslateY }, { translateX: dragX }]
          : [{ translateY: tabBarTranslateY }],
      } as any,
      tabBarBackground,
      tabBarShowLabel: !isIOS,
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
    [colors.primary, colors.tabIconDefault, tabBarHeight, insets.bottom, tabBarBackground, isIOS, screenWidth, dragX, tabBarTranslateY],
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
  // expo-router/unstable-native-tabs wraps a native UITabBarController, which
  // doesn't support a draggable, icon-only, custom-width dock. ClassicTabLayout
  // renders a fully custom glass island (BlurView + PanResponder) that gives
  // full control over size, position, and drag behavior on every iOS version.
  //
  // Re-enable NativeTabLayout only once expo-router/unstable-native-tabs
  // supports custom draggable tab bars or a stable workaround is available:
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
    width: 44, height: 32,
    alignItems: "center", justifyContent: "center", borderRadius: 12,
  },
  activeIconWrap: {
    width: 44, height: 32,
    alignItems: "center", justifyContent: "center", borderRadius: 12,
  },
});
