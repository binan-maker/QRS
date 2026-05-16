import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { externalQrBannerStyles } from "@/features/qr-detail/styles";

export default function ExternalQrBanner() {
  const { colors } = useTheme();

  return (
    <View style={[externalQrBannerStyles.card, { backgroundColor: colors.surface, borderColor: colors.warning + "30" }]}>
      <View style={[externalQrBannerStyles.accentStrip, { backgroundColor: colors.warning }]} />
      <View style={externalQrBannerStyles.innerContent}>
        <View style={[externalQrBannerStyles.iconWrap, { backgroundColor: colors.warning + "18", borderColor: colors.warning + "35" }]}>
          <Ionicons name="qr-code-outline" size={20} color={colors.warning} />
        </View>
        <View style={externalQrBannerStyles.textBlock}>
          <Text style={[externalQrBannerStyles.title, { color: colors.text }]} maxFontSizeMultiplier={1}>
            Standard QR
          </Text>
          <Text style={[externalQrBannerStyles.subtitle, { color: colors.textSecondary }]} maxFontSizeMultiplier={1}>
            We cannot verify the owner's identity
          </Text>
        </View>
      </View>
    </View>
  );
}
