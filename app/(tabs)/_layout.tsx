import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, router } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToNotificationCount } from "@/lib/firestore-service";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTranslation } from "@/lib/i18n/useAppTranslation";
import * as Haptics from "@/lib/haptics";

function ScanTabButton({ onPress }: { onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (onPress) onPress();
      }}
      style={styles.scanTabBtn}
      accessibilityLabel="Scan"
      accessibilityRole="button"
    >
      <LinearGradient
        colors={[colors.primary, colors.primaryShade]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.scanTabBtnInner, {
          borderColor: colors.background,
          shadowColor: colors.primary,
        }]}
      >
        <MaterialCommunityIcons name="qrcode-scan" size={28} color="#fff" />
      </LinearGradient>
    </Pressable>
  );
}

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
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>{t("tabs.profile")}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const isWeb  = Platform.OS === "web";
  const isIOS  = Platform.OS === "ios";
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useAppTranslation();

  const tabBarHeight = isWeb ? 84 : 70 + insets.bottom;
  const hiddenTabBar = { display: "none" as const };

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          height: tabBarHeight,
          paddingBottom: insets.bottom,
          paddingTop: 0,
          overflow: "visible",
          marginHorizontal: 0,
          marginBottom: 0,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={95}
              tint={colors.isDark ? "dark" : "light"}
              style={[StyleSheet.absoluteFill, {
                borderTopLeftRadius: 22, borderTopRightRadius: 22,
                borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
                overflow: "hidden",
                borderTopWidth: 1, borderLeftWidth: 1,
                borderRightWidth: 1, borderBottomWidth: 0,
                borderColor: colors.isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
              }]}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, {
              backgroundColor: colors.isDark ? "rgba(8,15,28,0.97)" : "rgba(255,255,255,0.98)",
              borderTopLeftRadius: 22, borderTopRightRadius: 22,
              borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
              borderTopWidth: 1, borderLeftWidth: 1,
              borderRightWidth: 1, borderBottomWidth: 0,
              borderColor: colors.surfaceBorder,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -6 },
              shadowOpacity: 0.18, shadowRadius: 20, elevation: 20,
            }]} />
          ),
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium", fontSize: 10.5,
          marginTop: 2, marginBottom: 0,
          letterSpacing: 0.1, includeFontPadding: false,
        },
        tabBarItemStyle: {
          paddingTop: 6, paddingBottom: 0,
          alignItems: "center", justifyContent: "center",
        },
      }}
    >
      {/* ── Home ── */}
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <View style={focused ? [styles.activeIconWrap, { backgroundColor: color + "18" }] : styles.iconWrap}>
              <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
            </View>
          ),
        }}
      />

      {/* ── Generator ── */}
      <Tabs.Screen
        name="qr-generator"
        options={{
          title: t("tabs.generator"),
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <View style={focused ? [styles.activeIconWrap, { backgroundColor: color + "18" }] : styles.iconWrap}>
              <MaterialCommunityIcons name={focused ? "qrcode-edit" : "qrcode"} size={24} color={color} />
            </View>
          ),
        }}
      />

      {/* ── Scanner (floating center button, bar hidden when active) ── */}
      <Tabs.Screen
        name="scanner"
        options={{
          title: "",
          tabBarLabel: () => null,
          tabBarStyle: hiddenTabBar,
          tabBarButton: () => (
            <ScanTabButton onPress={() => router.push("/(tabs)/scanner")} />
          ),
        }}
      />

      {/* ── History ── */}
      <Tabs.Screen
        name="history"
        options={{
          title: t("tabs.history"),
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <View style={focused ? [styles.activeIconWrap, { backgroundColor: color + "18" }] : styles.iconWrap}>
              <Ionicons name={focused ? "time" : "time-outline"} size={24} color={color} />
            </View>
          ),
        }}
      />

      {/* ── Profile ── */}
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <View style={focused ? [styles.activeIconWrap, { backgroundColor: color + "18" }] : styles.iconWrap}>
              <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
            </View>
          ),
        }}
      />

      {/* ── Settings (hidden, no nav bar) ── */}
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          tabBarStyle: hiddenTabBar,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
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
