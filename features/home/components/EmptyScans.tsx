import React, { useMemo, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useScaleFns } from "@/shared/utils/use-scale";

export function EmptyScans() {
  const { colors, isDark } = useTheme();
  const { s } = useScaleFns();
  const styles = useMemo(() => makeStyles(s, isDark), [s, isDark]);

  // Subtle pulse on the icon ring
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>

      {/* Icon with animated ring */}
      <View style={styles.iconArea}>
        <Animated.View style={[styles.ring, { borderColor: colors.primary + "30", transform: [{ scale: pulse }] }]} />
        <View style={[styles.iconBox, { backgroundColor: colors.primary + "14" }]}>
          <Ionicons name="qr-code-outline" size={34} color={colors.primary} />
        </View>
      </View>

      {/* Copy */}
      <Text style={[styles.title, { color: colors.text }]}>No scans yet</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>
        Point your camera at any QR code{"\n"}to instantly check if it's safe.
      </Text>

      {/* CTA */}
      <Pressable
        onPress={() => router.push("/(tabs)/scanner" as any)}
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 },
        ]}
      >
        <Ionicons name="scan" size={16} color="#fff" />
        <Text style={styles.btnText}>Scan QR Code</Text>
      </Pressable>

    </View>
  );
}

function makeStyles(s: number, isDark: boolean) {
  const rf = (n: number) => Math.round(n * s);
  return StyleSheet.create({
    wrap: {
      alignItems: "center",
      paddingVertical: rf(36),
      paddingHorizontal: rf(24),
      gap: rf(10),
      borderRadius: 20,
      borderWidth: 1,
    },
    iconArea: {
      width: rf(82),
      height: rf(82),
      alignItems: "center",
      justifyContent: "center",
      marginBottom: rf(4),
    },
    ring: {
      position: "absolute",
      width: rf(82),
      height: rf(82),
      borderRadius: rf(41),
      borderWidth: 1.5,
    },
    iconBox: {
      width: rf(64),
      height: rf(64),
      borderRadius: rf(18),
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: rf(17),
      fontFamily: "Inter_700Bold",
      textAlign: "center",
    },
    sub: {
      fontSize: rf(13),
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      lineHeight: rf(20),
      marginBottom: rf(4),
    },
    btn: {
      flexDirection: "row",
      alignItems: "center",
      gap: rf(7),
      paddingVertical: rf(12),
      paddingHorizontal: rf(28),
      borderRadius: rf(14),
      marginTop: rf(4),
    },
    btnText: {
      fontSize: rf(14),
      fontFamily: "Inter_700Bold",
      color: "#fff",
    },
  });
}
