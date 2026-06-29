import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, router } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import { subscribeToNotificationCount } from "@/lib/firestore-service";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTranslation } from "@/shared/i18n/useAppTranslation";
import * as Haptics from "@/shared/utils/haptics";
import { TabBarProvider, useTabBarScroll } from "@/shared/contexts/TabBarContext";

// ── Stable tab bar background components (memoized at module level) ────────────
const IosTabBarBackground = React.memo(function IosTabBarBackground({
  isDark,
  borderColor,
}: {
  isDark: boolean;
  borderColor: string;
}) {
  return (
    <BlurView
      intensity={95}
      tint={isDark ? "dark" : "light"}
      style={[
        StyleSheet.absoluteFill,
        {
          borderTopLeftRadius: 22, borderTopRightRadius: 22,
          borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
          overflow: "hidden",
          borderTopWidth: 1, borderLeftWidth: 1,
          borderRightWidth: 1, borderBottomWidth: 0,
          borderColor,
        },
      ]}
    />
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
      accessibilityLabel="Scan"
      accessibilityRole="button"
    >
      <LinearGradient
        colors={[colors.primary, colors.primaryShade]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.scanTabBtnInner,
          { borderColor: colors.background, shadowColor: colors.primary },
        ]}
      >
        <MaterialCommunityIcons name="qrcode-scan" size={28} color="#fff" />
      </LinearGradient>
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

const MyQrIcon = React.memo(function MyQrIcon({
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
      <Ionicons name={focused ? "bookmark" : "bookmark-outline"} size={24} color={color} />
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

function useNotificationCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }
    const unsub = subscribeToNotificationCount(user.id, setCount);
    return unsub;
  }, [user?.id]);

  return count;
}

function NativeTabLayout() {
  const { t } = useAppTranslation();
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>{t("tabs.home")}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="qr-generator">
        <Icon sf={{ default: "qrcode", selected: "qrcode" }} />
        <Label>{t("tabs.generator")}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <Icon sf={{ default: "clock", selected: "clock.fill" }} />
        <Label>{t("tabs.history")}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="my-qr-codes">
        <Icon sf={{ default: "bookmark", selected: "bookmark.fill" }} />
        <Label>{t("tabs.myQrCodes")}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>{t("tabs.profile")}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

// ── Stable icon render functions (referentially stable across renders) ──────────
const renderHomeIcon   = ({ color, focused }: { color: string; focused: boolean }) => <HomeIcon color={color} focused={focused} />;
const renderGenIcon    = ({ color, focused }: { color: string; focused: boolean }) => <GeneratorIcon color={color} focused={focused} />;
const renderHistIcon   = ({ color, focused }: { color: string; focused: boolean }) => <HistoryIcon color={color} focused={focused} />;
const renderMyQrIcon   = ({ color, focused }: { color: string; focused: boolean }) => <MyQrIcon color={color} focused={focused} />;
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

  const tabBarHeight = isWeb ? 84 : 70 + insets.bottom;
  // The scanner FAB sits 28px above the tab bar (marginTop: -28).
  // The hide offset must cover the full bar height + that overhang so
  // nothing is left visible when the bar is scrolled away.
  const FAB_OVERHANG = 28;

  useEffect(() => {
    setTabBarHeight(tabBarHeight + FAB_OVERHANG);
  }, [tabBarHeight, setTabBarHeight]);
  const hiddenTabBar = useMemo(() => ({ display: "none" as const }), []);

  // Memoize to prevent rebuilding screenOptions on every render
  const tabBarBorderColor = isIOS
    ? (colors.isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)")
    : colors.surfaceBorder;

  const tabBarBackground = useCallback(
    () =>
      isIOS ? (
        <IosTabBarBackground isDark={colors.isDark} borderColor={tabBarBorderColor} />
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
        paddingBottom:   insets.bottom,
        paddingTop:      0,
        overflow:        "visible" as const,
        marginHorizontal: 0,
        marginBottom:    0,
        transform:       [{ translateY: tabBarTranslateY }],
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
    [colors.primary, colors.tabIconDefault, tabBarHeight, insets.bottom, tabBarBackground],
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
          options={{ title: t("tabs.myQrCodes"), tabBarIcon: renderMyQrIcon }}
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
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return (
    <TabBarProvider>
      <ClassicTabLayout />
    </TabBarProvider>
  );
}

const styles = StyleSheet.create({
  scanTabBtn: {
    flex: 1, alignItems: "center", justifyContent: "center", marginTop: -28,
  },
  scanTabBtnInner: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: "center", justifyContent: "center",
    borderWidth: 3,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 14, elevation: 14,
  },
  iconWrap: {
    width: 40, height: 28,
    alignItems: "center", justifyContent: "center", borderRadius: 10,
  },
  activeIconWrap: {
    width: 50, height: 28,
    alignItems: "center", justifyContent: "center", borderRadius: 14,
  },
});
