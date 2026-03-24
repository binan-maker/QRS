import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, router } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, Pressable, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import * as Haptics from "@/lib/haptics";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToNotificationCount } from "@/lib/firestore-service";
import { LinearGradient } from "expo-linear-gradient";

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
        colors={colors.isDark ? ["#00E5FF", "#006FFF"] : ["#006FFF", "#0047CC"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.scanTabBtnInner, {
          borderColor: colors.background,
        }]}
      >
        <MaterialCommunityIcons name="qrcode-scan" size={26} color="#fff" />
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
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="qr-generator">
        <Icon sf={{ default: "qrcode", selected: "qrcode" }} />
        <Label>Generate</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="scanner">
        <Icon sf={{ default: "qrcode.viewfinder", selected: "qrcode.viewfinder" }} />
        <Label>Scan</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <Icon sf={{ default: "clock", selected: "clock.fill" }} />
        <Label>History</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";
  const insets = useSafeAreaInsets();
  const notifCount = useNotificationCount();
  const { colors } = useTheme();

  const tabBarHeight = isWeb ? 80 : 62 + insets.bottom;

  return (
    <Tabs
      initialRouteName="scanner"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.isDark ? "#3D5A70" : "#9BB3CC",
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          height: tabBarHeight,
          paddingBottom: insets.bottom,
          paddingTop: 0,
          overflow: "visible",
          marginHorizontal: 12,
          marginBottom: 8,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={90}
              tint={colors.isDark ? "dark" : "light"}
              style={[StyleSheet.absoluteFill, {
                borderRadius: 28,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: colors.isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
              }]}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, {
              backgroundColor: colors.isDark ? "rgba(12,21,38,0.97)" : "rgba(255,255,255,0.97)",
              borderRadius: 28,
              borderWidth: 1,
              borderColor: colors.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.18,
              shadowRadius: 20,
              elevation: 20,
            }]} />
          ),
        tabBarLabelStyle: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 10,
          marginBottom: 4,
          letterSpacing: 0.2,
        },
        tabBarItemStyle: {
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarBadge: notifCount > 0 ? notifCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.primary,
            color: colors.isDark ? "#000" : "#fff",
            fontSize: 10,
            fontFamily: "Inter_700Bold",
            minWidth: 16,
            height: 16,
            borderRadius: 8,
          },
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIconWrap, { backgroundColor: color + "18" }] : styles.iconWrap}>
              <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="qr-generator"
        options={{
          title: "Generate",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIconWrap, { backgroundColor: color + "18" }] : styles.iconWrap}>
              <MaterialCommunityIcons name={focused ? "qrcode-edit" : "qrcode"} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: "",
          tabBarStyle: { display: "none" },
          tabBarButton: (props) => (
            <ScanTabButton onPress={props.onPress as () => void} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIconWrap, { backgroundColor: color + "18" }] : styles.iconWrap}>
              <Ionicons name={focused ? "time" : "time-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIconWrap, { backgroundColor: color + "18" }] : styles.iconWrap}>
              <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
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
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -22,
  },
  scanTabBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    shadowColor: "#00E5FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  iconWrap: {
    width: 36,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  activeIconWrap: {
    width: 40,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
});
