import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { donationBannerStyles } from "@/features/qr-detail/styles";

export default function DonationBanner() {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => router.push("/donation")}
      style={({ pressed }) => [
        donationBannerStyles.card,
        {
          backgroundColor: colors.isDark ? "rgba(124,58,237,0.12)" : "rgba(124,58,237,0.07)",
          borderColor: "#7C3AED30",
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <LinearGradient
        colors={["#7C3AED", "#6366F1"]}
        style={donationBannerStyles.iconWrap}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name="heart" size={18} color="#fff" />
      </LinearGradient>
      <View style={donationBannerStyles.textWrap}>
        <Text style={[donationBannerStyles.title, { color: colors.text }]}>Support QR Guard</Text>
        <Text style={[donationBannerStyles.sub, { color: colors.textSecondary }]}>
          Donate ₹10 · ₹50 · ₹100 via Play Store to keep this app free & secure
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}
