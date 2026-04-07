import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";

const FEATURES = [
  { icon: "chatbubble-outline" as const, label: "Comment" },
  { icon: "notifications-outline" as const, label: "Follow" },
  { icon: "heart-outline" as const, label: "Favorite" },
  { icon: "star-outline" as const, label: "Rate" },
] as const;

interface Props {
  style?: object;
  compact?: boolean;
}

export default function GuestUnlockBanner({ style, compact }: Props) {
  const { colors, isDark } = useTheme();

  return (
    <Pressable
      onPress={() => router.push("/(auth)/login")}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.primary + "30",
          opacity: pressed ? 0.93 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      <LinearGradient
        colors={
          isDark
            ? [colors.primary + "18", colors.primary + "06"]
            : [colors.primary + "10", colors.primary + "03"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.accentBar, { backgroundColor: colors.primary }]} />

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={[styles.lockBadge, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "30" }]}>
            <Ionicons name="lock-closed" size={13} color={colors.primary} />
          </View>
          <Text style={[styles.eyebrow, { color: colors.primary }]} maxFontSizeMultiplier={1}>
            SIGN IN REQUIRED
          </Text>
        </View>

        <Text style={[styles.heading, { color: colors.text }]} maxFontSizeMultiplier={1}>
          Join the conversation
        </Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]} maxFontSizeMultiplier={1}>
          Create a free account to comment, follow QR codes, rate them, and more.
        </Text>

        <View style={styles.featureRow}>
          {FEATURES.map((f) => (
            <View
              key={f.label}
              style={[styles.featureChip, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "22" }]}
            >
              <Ionicons name={f.icon} size={12} color={colors.primary} />
              <Text style={[styles.featureLabel, { color: colors.primary }]} maxFontSizeMultiplier={1}>
                {f.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.ctaRow}>
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            style={({ pressed }) => [styles.ctaBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 }]}
          >
            <Ionicons name="log-in-outline" size={15} color={colors.primaryText} />
            <Text style={[styles.ctaBtnText, { color: colors.primaryText }]} maxFontSizeMultiplier={1}>
              Sign In
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/(auth)/register")}
            style={({ pressed }) => [
              styles.ctaSecondary,
              { backgroundColor: colors.primary + "12", borderColor: colors.primary + "28", opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={[styles.ctaSecondaryText, { color: colors.primary }]} maxFontSizeMultiplier={1}>
              Create Account
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 14,
    flexDirection: "row",
  },
  accentBar: {
    width: 4,
    alignSelf: "stretch",
    borderRadius: 2,
    flexShrink: 0,
  },
  body: {
    flex: 1,
    padding: 16,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  lockBadge: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  heading: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  sub: {
    fontSize: 12.5,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  featureRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  featureChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  featureLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  ctaRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  ctaBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  ctaSecondary: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  ctaSecondaryText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
