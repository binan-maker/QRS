import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import BottomSheet from "@/components/ui/BottomSheet";
import { useTheme } from "@/contexts/ThemeContext";
import { ownerSheetStyles, commentMenuStyles } from "@/features/qr-detail/styles";

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
}

interface Props {
  visible: boolean;
  onClose: () => void;
  ownerInfo: OwnerInfo | null;
  guardLink: GuardLink | null;
}

export default function OwnerInfoSheet({ visible, onClose, ownerInfo, guardLink }: Props) {
  const { colors } = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose} sheetStyle={{ paddingHorizontal: 0 }}>
      {ownerInfo && (
        <>
          <View style={ownerSheetStyles.avatarRow}>
            <LinearGradient
              colors={ownerInfo.qrType === "business" ? [colors.warning, colors.warningShade] : [colors.safe, colors.safeShade]}
              style={ownerSheetStyles.avatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons
                name={ownerInfo.qrType === "business" ? "storefront" : "person"}
                size={30}
                color="#fff"
              />
            </LinearGradient>
            <View style={{ flex: 1, minWidth: 0 }}>
              {ownerInfo.businessName ? (
                <Text style={[ownerSheetStyles.bizName, { color: colors.text }]} numberOfLines={1}>
                  {ownerInfo.businessName}
                </Text>
              ) : null}
              <Text style={[ownerSheetStyles.byName, { color: colors.textSecondary }]} numberOfLines={1}>
                by {ownerInfo.ownerName}
              </Text>
              <View style={ownerSheetStyles.badgeRow}>
                <View
                  style={[
                    ownerSheetStyles.typeBadge,
                    {
                      backgroundColor: (ownerInfo.qrType === "business" ? colors.warning : colors.safe) + "20",
                      borderColor: (ownerInfo.qrType === "business" ? colors.warning : colors.safe) + "50",
                    },
                  ]}
                >
                  <Text style={[ownerSheetStyles.typeBadgeText, { color: ownerInfo.qrType === "business" ? colors.warning : colors.safe }]}>
                    {ownerInfo.qrType === "business" ? "Business" : "Individual"}
                  </Text>
                </View>
                {ownerInfo.isBranded && (
                  <View style={[ownerSheetStyles.verifiedBadge, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "50" }]}>
                    <Ionicons name="shield-checkmark" size={11} color={colors.primary} />
                    <Text style={[ownerSheetStyles.verifiedText, { color: colors.primary }]}>Verified</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {ownerInfo.brandedUuid ? (
            <View style={[ownerSheetStyles.infoRow, { borderColor: colors.surfaceBorder }]}>
              <Ionicons name="qr-code-outline" size={14} color={colors.textMuted} />
              <Text style={[ownerSheetStyles.infoLabel, { color: colors.textMuted }]}>QR ID</Text>
              <Text style={[ownerSheetStyles.infoValue, { color: colors.textSecondary }]} numberOfLines={1} selectable>
                {ownerInfo.brandedUuid}
              </Text>
            </View>
          ) : null}

          {guardLink?.currentDestination ? (
            <View style={[ownerSheetStyles.infoRow, { borderColor: colors.surfaceBorder }]}>
              <Ionicons name="link-outline" size={14} color={colors.textMuted} />
              <Text style={[ownerSheetStyles.infoLabel, { color: colors.textMuted }]}>Destination</Text>
              <Text style={[ownerSheetStyles.infoValue, { color: colors.textSecondary }]} numberOfLines={2} selectable>
                {guardLink.currentDestination}
              </Text>
            </View>
          ) : null}
        </>
      )}
      <Pressable onPress={onClose} style={commentMenuStyles.cancelBtn}>
        <Text style={[commentMenuStyles.cancelText, { color: colors.textSecondary }]}>Close</Text>
      </Pressable>
    </BottomSheet>
  );
}
