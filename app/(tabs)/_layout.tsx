import { Tabs, router } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import React, { useEffect, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAppTranslation } from "@/shared/i18n/useAppTranslation";
import { TabBarProvider, useTabBarScroll } from "@/shared/contexts/TabBarContext";

// ── Android tab bar background ─────────────────────────────────────────────────
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

// ── Tab icon components ────────────────────────────────────────────────────────
const HomeIcon = React.memo(function HomeIcon({
  color,
  focused,
}: {
  color: string;
  focused: boolean;
}) {
  return (
    <View style={focused ? [styles.activeIconWrap, { backgroundColor: color + "20" }] : styles.iconWrap}>
      <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
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
    <View style={focused ? [styles.activeIconWrap, { backgroundColor: color + "20" }] : styles.iconWrap}>
      <MaterialCommunityIcons
        name={focused ? "qrcode-edit" : "qrcode"}
        size={22}
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
    <View style={focused ? [styles.activeIconWrap, { backgroundColor: color + "20" }] : styles.iconWrap}>
      <Ionicons name={focused ? "time" : "time-outline"} size={22} color={color} />
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
    <View style={focused ? [styles.activeIconWrap, { backgroundColor: color + "20" }] : styles.iconWrap}>
      <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
    </View>
  );
});

// ── Stable icon render functions ───────────────────────────────────────────────
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

  const ANDROID_BAR_HEIGHT = 70 + insets.bottom;
  const tabBarHeight = isWeb ? 84 : isIOS ? undefined : ANDROID_BAR_HEIGHT;
  const scrollHideHeight = isWeb ? 84 : isIOS ? 49 + insets.bottom : ANDROID_BAR_HEIGHT;

  useEffect(() => {
    setTabBarHeight(scrollHideHeight);
  }, [scrollHideHeight, setTabBarHeight]);

  const hiddenTabBar = useMemo(() => ({ display: "none" as const }), []);

  const tabBarBorderColor = colors.surfaceBorder;

  const tabBarBackground = useCallback(
    () =>
      isIOS ? undefined : (
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
      // iOS: use default system tab bar — no custom style overrides.
      // Android: keep the full-width custom background.
      ...(isIOS ? {} : {
        tabBarStyle: {
          position:        "absolute" as const,
          backgroundColor: "transparent",
          borderTopWidth:  0,
          elevation:       0,
          height:          tabBarHeight,
          bottom:          0,
          paddingBottom:   insets.bottom,
          paddingTop:      0,
          overflow:        "visible" as const,
          transform:       [{ translateY: tabBarTranslateY }],
        } as any,
        tabBarBackground: tabBarBackground as any,
      }),
      tabBarShowLabel: true,
      tabBarLabelStyle: {
        fontFamily:         "Inter_500Medium",
        fontSize:           11,
        marginTop:          3,
        marginBottom:       0,
        letterSpacing:      0.1,
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

      {/* Android system nav bar fill */}
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
  return (
    <TabBarProvider>
      <ClassicTabLayout />
    </TabBarProvider>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 40, height: 28,
    alignItems: "center", justifyContent: "center", borderRadius: 10,
  },
  activeIconWrap: {
    width: 40, height: 28,
    alignItems: "center", justifyContent: "center", borderRadius: 10,
  },
});
