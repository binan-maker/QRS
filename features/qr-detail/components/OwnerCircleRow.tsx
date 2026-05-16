import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import { ownerCircleRowStyles } from "@/features/qr-detail/styles";

interface OwnerInfo {
  businessName?: string | null;
  ownerName: string;
  qrType?: string;
  isBranded: boolean;
  ownerId: string;
}

interface Props {
  ownerInfo: OwnerInfo;
  onPress: () => void;
}

export default function OwnerCircleRow({ ownerInfo, onPress }: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        ownerCircleRowStyles.row,
        { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <LinearGradient
        colors={ownerInfo.qrType === "business" ? [colors.warning, colors.warningShade] : [colors.safe, colors.safeShade]}
        style={ownerCircleRowStyles.circle}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={ownerInfo.qrType === "business" ? "storefront" : "person"} size={18} color="#fff" />
      </LinearGradient>
      <View style={{ flex: 1, minWidth: 0 }}>
        {ownerInfo.businessName ? (
          <Text style={[ownerCircleRowStyles.name, { color: colors.text }]} numberOfLines={1}>
            {ownerInfo.businessName}
          </Text>
        ) : null}
        <Text style={[ownerCircleRowStyles.by, { color: colors.textSecondary }]} numberOfLines={1}>
          by {ownerInfo.ownerName}
        </Text>
      </View>
      <View style={[ownerCircleRowStyles.verifiedBadge, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "50" }]}>
        <Ionicons name="shield-checkmark" size={11} color={colors.primary} />
        <Text style={[ownerCircleRowStyles.verifiedText, { color: colors.primary }]}>Verified</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}
