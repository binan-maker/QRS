import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { getUserPhotoURL } from "@/services/user";

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
  const [photoURL, setPhotoURL] = useState<string | null>(null);

  useEffect(() => {
    if (!ownerInfo.ownerId) return;
    getUserPhotoURL(ownerInfo.ownerId).then(setPhotoURL).catch(() => setPhotoURL(null));
  }, [ownerInfo.ownerId]);

  const gradientColors: [string, string] =
    ownerInfo.qrType === "standard"
      ? [colors.primary, colors.primaryShade]
      : [colors.safe, colors.safeShade];

  const iconName: keyof typeof Ionicons.glyphMap =
    ownerInfo.qrType === "standard" ? "qr-code" : "person";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.row,
        { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      {photoURL ? (
        <Image
          source={{ uri: photoURL }}
          style={[s.circle, { borderWidth: 2, borderColor: colors.surfaceBorder }]}
          contentFit="cover"
        />
      ) : (
        <LinearGradient
          colors={gradientColors}
          style={s.circle}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={iconName} size={18} color="#fff" />
        </LinearGradient>
      )}

      <View style={{ flex: 1, minWidth: 0 }}>
        {ownerInfo.businessName ? (
          <Text style={[s.name, { color: colors.text }]} numberOfLines={1}>
            {ownerInfo.businessName}
          </Text>
        ) : null}
        <Text style={[s.by, { color: colors.textSecondary }]} numberOfLines={1}>
          by {ownerInfo.ownerName}
        </Text>
      </View>

      <View style={[s.verifiedBadge, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "50" }]}>
        <Ionicons name="shield-checkmark" size={11} color={colors.primary} />
        <Text style={[s.verifiedText, { color: colors.primary }]}>Verified</Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
  name: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    lineHeight: 18,
  },
  by: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    flexShrink: 0,
  },
  verifiedText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
});
