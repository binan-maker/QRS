import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNetworkStatus } from "@/shared/utils/use-network";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * Slim banner that slides down from under the status bar when the device
 * goes offline. Disappears when connectivity is restored. Tap to retry the
 * connectivity check immediately.
 *
 * Mounted once at the root layout above all screens so it surfaces network
 * loss anywhere in the app — including during background fetches that would
 * otherwise hang silently.
 */
export function OfflineBanner() {
  const { isOnline, isChecking, recheck } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const slide = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: isOnline ? -80 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isOnline, slide]);

  if (isOnline) {
    // Keep mounted (so the slide-out animation can play), but render nothing
    // visible once it has fully retracted. The transform handles the visual.
  }

  return (
    <Animated.View
      pointerEvents={isOnline ? "none" : "auto"}
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + 6,
          backgroundColor: "#ef4444",
          transform: [{ translateY: slide }],
        },
      ]}
      accessibilityLiveRegion={isOnline ? "none" : "polite"}
      accessibilityRole="alert"
    >
      <Pressable
        onPress={recheck}
        style={styles.row}
        accessibilityLabel="You are offline. Tap to retry."
        accessibilityRole="button"
      >
        <Ionicons name="cloud-offline" size={16} color="#fff" />
        <Text style={styles.text}>
          {isChecking ? "Checking connection…" : "You're offline"}
        </Text>
        <Text style={styles.hint}>Tap to retry</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 14,
    paddingBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  hint: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    textDecorationLine: "underline",
  },
});
