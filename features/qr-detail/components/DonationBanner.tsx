import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useScaleFns } from "@/shared/utils/use-scale";

export default function DonationBanner() {
  const { colors } = useTheme();
  const { rf, sp } = useScaleFns();

  return (
    <Pressable
      onPress={() => router.push("/donation")}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: sp(12),
        borderRadius: sp(16),
        borderWidth: 1,
        borderColor: "#22c55e30",
        backgroundColor: colors.isDark ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.07)",
        padding: sp(14),
        marginTop: sp(8),
        opacity: pressed ? 0.88 : 1,
      })}
    >
      <LinearGradient
        colors={["#16a34a", "#22c55e"]}
        style={{
          width: sp(38),
          height: sp(38),
          borderRadius: sp(12),
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name="heart" size={rf(17)} color="#fff" />
      </LinearGradient>

      <View style={{ flex: 1, gap: sp(2) }}>
        <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: colors.text }}>
          Support BinRo
        </Text>
        <Text style={{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: colors.textSecondary, lineHeight: rf(17) }}>
          Donate ₹10 · ₹50 · ₹100 to keep this app free &amp; secure
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={rf(17)} color={colors.textMuted} />
    </Pressable>
  );
}
