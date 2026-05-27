import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { useScaleFns } from "@/shared/utils/use-scale";

export default function ExternalQrBanner() {
  const { colors } = useTheme();
  const { rf, sp } = useScaleFns();

  return (
    <View style={{
      flexDirection: "row",
      alignItems: "center",
      gap: sp(10),
      backgroundColor: colors.surface,
      borderRadius: sp(14),
      borderWidth: 1,
      borderColor: colors.warning + "35",
      paddingHorizontal: sp(14),
      paddingVertical: sp(12),
      marginBottom: sp(10),
    }}>
      <View style={{
        width: sp(36),
        height: sp(36),
        borderRadius: sp(10),
        backgroundColor: colors.warning + "18",
        borderWidth: 1,
        borderColor: colors.warning + "30",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        <Ionicons name="qr-code-outline" size={rf(18)} color={colors.warning} />
      </View>

      <View style={{ flex: 1, gap: sp(2) }}>
        <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: colors.text }} maxFontSizeMultiplier={1}>
          Standard QR Code
        </Text>
        <Text style={{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: colors.textSecondary }} maxFontSizeMultiplier={1}>
          Owner identity is unverified
        </Text>
      </View>
    </View>
  );
}
