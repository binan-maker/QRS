import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import BottomSheet from "@/shared/components/ui/BottomSheet";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { getUserPhotoURL } from "@/services/user-service";

interface GuardLink {
  currentDestination?: string;
}

interface OwnerInfo {
  businessName?: string | null;
  ownerName: string;
  qrType: string;
  isBranded: boolean;
  brandedUuid?: string | null;
  ownerLogoBase64?: string | null;
  ownerId?: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  ownerInfo: OwnerInfo | null;
  guardLink: GuardLink | null;
}

export default function OwnerInfoSheet({ visible, onClose, ownerInfo, guardLink }: Props) {
  const { colors } = useTheme();
  const [photoURL, setPhotoURL] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !ownerInfo?.ownerId) { setPhotoURL(null); return; }
    getUserPhotoURL(ownerInfo.ownerId).then(setPhotoURL).catch(() => setPhotoURL(null));
  }, [visible, ownerInfo?.ownerId]);

  const gradientColors: [string, string] =
    ownerInfo?.qrType === "standard"
      ? [colors.primary, colors.primaryShade]
      : [colors.safe, colors.safeShade];

  const accentColor =
    ownerInfo?.qrType === "standard" ? colors.primary
    : colors.safe;

  const typeLabel =
    ownerInfo?.qrType === "standard" ? "Standard"
    : "Individual";

  const iconName: any =
    ownerInfo?.qrType === "standard" ? "qr-code"
    : "person";

  return (
    <BottomSheet visible={visible} onClose={onClose} sheetStyle={{ paddingHorizontal: 0 }}>
      {ownerInfo && (
        <View style={s.content}>
          <View style={s.avatarRow}>
            {photoURL ? (
              <Image
                source={{ uri: photoURL }}
                style={[s.avatar, { borderWidth: 2, borderColor: accentColor + "40" }]}
                contentFit="cover"
              />
            ) : (
              <LinearGradient
                colors={gradientColors}
                style={s.avatar}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name={iconName} size={26} color="#fff" />
              </LinearGradient>
            )}

            <View style={{ flex: 1, minWidth: 0 }}>
              {ownerInfo.businessName ? (
                <Text style={[s.bizName, { color: colors.text }]} numberOfLines={1}>
                  {ownerInfo.businessName}
                </Text>
              ) : null}
              <Text style={[s.byName, { color: colors.textSecondary }]} numberOfLines={1}>
                by {ownerInfo.ownerName}
              </Text>
              <View style={s.badgeRow}>
                <View style={[s.typeBadge, { backgroundColor: accentColor + "18", borderColor: accentColor + "45" }]}>
                  <Text style={[s.typeBadgeText, { color: accentColor }]}>{typeLabel}</Text>
                </View>
                {ownerInfo.isBranded && (
                  <View style={[s.verifiedBadge, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "50" }]}>
                    <Ionicons name="shield-checkmark" size={10} color={colors.primary} />
                    <Text style={[s.verifiedText, { color: colors.primary }]}>Verified</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {ownerInfo.brandedUuid ? (
            <View style={[s.infoRow, { borderColor: colors.surfaceBorder }]}>
              <Ionicons name="qr-code-outline" size={13} color={colors.textMuted} />
              <Text style={[s.infoLabel, { color: colors.textMuted }]}>QR ID</Text>
              <Text style={[s.infoValue, { color: colors.textSecondary }]} numberOfLines={1} selectable>
                {ownerInfo.brandedUuid}
              </Text>
            </View>
          ) : null}

          {guardLink?.currentDestination ? (
            <View style={[s.infoRow, { borderColor: colors.surfaceBorder }]}>
              <Ionicons name="link-outline" size={13} color={colors.textMuted} />
              <Text style={[s.infoLabel, { color: colors.textMuted }]}>Destination</Text>
              <Text style={[s.infoValue, { color: colors.textSecondary }]} numberOfLines={2} selectable>
                {guardLink.currentDestination}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
  bizName: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    lineHeight: 18,
    marginBottom: 1,
  },
  byName: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 5,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 100,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 100,
    borderWidth: 1,
  },
  verifiedText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    width: 72,
    flexShrink: 0,
    paddingTop: 1,
  },
  infoValue: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 16,
  },
});
