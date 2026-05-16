import { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated, Dimensions } from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
const TOAST_DURATION = 3200;

const TOAST_COLORS = {
  error: {
    bg: "#1a0a0a",
    border: "rgba(239,68,68,0.4)",
    icon: "#ef4444",
    text: "#fca5a5",
    track: "rgba(239,68,68,0.2)",
    fill: "#ef4444",
    iconChar: "✕",
  },
  warning: {
    bg: "#1a1200",
    border: "rgba(245,158,11,0.4)",
    icon: "#f59e0b",
    text: "#fde68a",
    track: "rgba(245,158,11,0.2)",
    fill: "#f59e0b",
    iconChar: "⚠",
  },
  info: {
    bg: "#0a1020",
    border: "rgba(0,212,255,0.35)",
    icon: "#00d4ff",
    text: "#a5f3ff",
    track: "rgba(0,212,255,0.2)",
    fill: "#00d4ff",
    iconChar: "ℹ",
  },
};

export const toastContainerStyle = { position: "absolute" as const, left: 16, right: 16 };

export function ScannerToast({
  message,
  type = "error",
  onDone,
}: {
  message: string;
  type?: "error" | "warning" | "info";
  onDone: () => void;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const c = TOAST_COLORS[type];

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1, duration: TOAST_DURATION - 400, useNativeDriver: false }),
      Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => onDone());
  }, []);

  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: [0, SCREEN_WIDTH - 32] });

  return (
    <Animated.View style={[styles.wrapper, { opacity, backgroundColor: c.bg, borderColor: c.border }]}>
      <View style={styles.toast}>
        <View style={[styles.iconWrap, { backgroundColor: c.icon + "22" }]}>
          <Text style={[styles.icon, { color: c.icon }]}>{c.iconChar}</Text>
        </View>
        <Text style={[styles.msg, { color: c.text }]} numberOfLines={2}>
          {message}
        </Text>
      </View>
      <View style={[styles.trackBg, { backgroundColor: c.track }]}>
        <Animated.View style={[styles.trackFill, { width: barWidth, backgroundColor: c.fill }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  icon: { fontSize: 15, fontWeight: "700" },
  msg: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  trackBg: { height: 3 },
  trackFill: { height: 3, borderRadius: 2 },
});
