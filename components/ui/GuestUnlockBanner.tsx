import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  style?: object;
  compact?: boolean;
}

export default function GuestUnlockBanner({ style, compact }: Props) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
        },
        style,
      ]}
    >
      <LinearGradient
        colors={
          isDark
            ? ["rgba(99,102,241,0.14)", "rgba(139,92,246,0.06)"]
            : ["rgba(99,102,241,0.09)", "rgba(139,92,246,0.03)"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.inner}>
        <View style={[styles.iconWrap, { backgroundColor: "rgba(99,102,241,0.15)" }]}>
          <Ionicons name="person-circle-outline" size={26} color="#6366F1" />
        </View>

        <View style={styles.textCol}>
          <Text style={[styles.heading, { color: colors.text }]} maxFontSizeMultiplier={1}>
            Sign in to unlock features
          </Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]} maxFontSizeMultiplier={1}>
            Comment, follow and rate QR codes.
          </Text>
        </View>
      </View>

      <View style={styles.btnRow}>
        <Pressable
          onPress={() => router.push("/(auth)/login")}
          style={({ pressed }) => [
            styles.btnPrimary,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <LinearGradient
            colors={["#6366F1", "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnPrimaryGradient}
          >
            <Ionicons name="log-in-outline" size={14} color="#fff" />
            <Text style={styles.btnPrimaryText} maxFontSizeMultiplier={1}>Sign In</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(auth)/register")}
          style={({ pressed }) => [
            styles.btnSecondary,
            {
              backgroundColor: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)",
              borderColor: "rgba(99,102,241,0.25)",
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <Text style={[styles.btnSecondaryText, { color: "#6366F1" }]} maxFontSizeMultiplier={1}>
            Create Account
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 14,
    padding: 14,
    gap: 12,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    gap: 3,
  },
  heading: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  sub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
  },
  btnPrimary: {
    borderRadius: 10,
    overflow: "hidden",
  },
  btnPrimaryGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  btnPrimaryText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  btnSecondary: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondaryText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
