import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";

interface Props {
  compact?: boolean;
}

export default function ComingSoonBanner({ compact = false }: Props) {
  const { colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerLoop.start();

    return () => {
      pulseLoop.stop();
      shimmerLoop.stop();
    };
  }, []);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  if (compact) {
    return (
      <View style={styles.pillWrap}>
        <View style={[styles.pill, { backgroundColor: "#F59E0B14", borderColor: "#F59E0B35" }]}>
          <MaterialCommunityIcons name="rocket-launch-outline" size={12} color="#F59E0B" />
          <Text style={styles.pillText}>Coming in Phase 2</Text>
          <View style={[styles.pillBadge, { backgroundColor: "#F59E0B22", borderColor: "#F59E0B50" }]}>
            <Text style={styles.pillBadgeText}>SOON</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={["#0F172A", "#1E1B4B", "#1A1035"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <Animated.View style={[styles.iconCircle, { transform: [{ scale: pulseAnim }] }]}>
          <LinearGradient
            colors={["#7C3AED", "#4F46E5"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconCircleGradient}
          >
            <MaterialCommunityIcons name="rocket-launch-outline" size={32} color="#fff" />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={{ opacity: shimmerOpacity }}>
          <View style={[styles.phasePill, { backgroundColor: "#7C3AED30", borderColor: "#7C3AED60" }]}>
            <Ionicons name="construct-outline" size={10} color="#A78BFA" />
            <Text style={styles.phasePillText}>PHASE 2</Text>
          </View>
        </Animated.View>

        <Text style={styles.heading}>QR Generation</Text>
        <Text style={styles.headingSub}>Coming Soon</Text>

        <Text style={styles.body}>
          We are focused on making the{" "}
          <Text style={styles.bodyHighlight}>QR Scanner</Text>
          {" "}the best in India first. Full QR generation — with templates, UPI codes, WiFi, contacts, AI builder, and more — is launching in Phase 2.
        </Text>

        <View style={styles.divider} />

        <View style={styles.featuresGrid}>
          {[
            { icon: "qrcode-edit", label: "Smart Templates", color: "#60A5FA" },
            { icon: "cash-multiple", label: "UPI Generator", color: "#34D399" },
            { icon: "wifi",         label: "WiFi & Contact", color: "#A78BFA" },
            { icon: "robot-outline", label: "AI Builder",   color: "#F59E0B" },
          ].map((f) => (
            <View key={f.label} style={[styles.featureChip, { backgroundColor: f.color + "12", borderColor: f.color + "30" }]}>
              <MaterialCommunityIcons name={f.icon as any} size={13} color={f.color} />
              <Text style={[styles.featureChipText, { color: f.color }]}>{f.label}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.scanNowRow, { backgroundColor: "#22C55E14", borderColor: "#22C55E35" }]}>
          <View style={[styles.scanNowDot, { backgroundColor: "#22C55E" }]} />
          <Ionicons name="scan-outline" size={13} color="#22C55E" />
          <Text style={styles.scanNowText}>
            Scanner is{" "}
            <Text style={[styles.scanNowBold, { color: "#22C55E" }]}>live now</Text>
            {" "}— tap the scan button below
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  card: {
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    gap: 12,
    position: "relative",
    overflow: "hidden",
  },
  glowTop: {
    position: "absolute",
    top: -50,
    left: "30%",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(124, 58, 237, 0.15)",
  },
  glowBottom: {
    position: "absolute",
    bottom: -40,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(79, 70, 229, 0.12)",
  },
  iconCircle: {
    marginBottom: 4,
  },
  iconCircleGradient: {
    width: 70,
    height: 70,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  phasePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  phasePillText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#A78BFA",
    letterSpacing: 1.2,
  },
  heading: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  headingSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    marginTop: -8,
  },
  body: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  bodyHighlight: {
    color: "#A78BFA",
    fontFamily: "Inter_600SemiBold",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignSelf: "stretch",
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    justifyContent: "center",
  },
  featureChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  featureChipText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  scanNowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "stretch",
  },
  scanNowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scanNowText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
    flex: 1,
  },
  scanNowBold: {
    fontFamily: "Inter_700Bold",
  },
  pillWrap: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 2,
    alignItems: "flex-start",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#F59E0B",
  },
  pillBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  pillBadgeText: {
    fontSize: 7,
    fontFamily: "Inter_700Bold",
    color: "#F59E0B",
    letterSpacing: 0.6,
  },
});
