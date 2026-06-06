import React, { memo } from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { formatShortDate } from "@/shared/utils/formatters";

interface Props {
  qrValue: string;
  isBranded: boolean;
  privateMode: boolean;
  generatedUuid: string | null;
  generatedAt: Date | null;
  saving: boolean;
  savedToProfile: boolean;
  savedDocId?: string | null;
}

function QrSavedBanner({
  qrValue, isBranded, privateMode,
  generatedUuid, generatedAt, saving,
  savedToProfile, savedDocId,
}: Props) {
  const { colors } = useTheme();

  return (
    <>
      {savedToProfile && (
        <Pressable
          onPress={() => {
            if (savedDocId) router.push(`/my-qr/${savedDocId}` as any);
            else router.push("/(tabs)/profile");
          }}
          style={[styles.savedBanner, { backgroundColor: colors.safeDim, borderColor: colors.safe + "40" }]}
        >
          <Ionicons name="checkmark-circle" size={16} color={colors.safe} />
          <Text style={[styles.savedBannerText, { color: colors.safe }]}>
            {savedDocId ? "Saved! Tap to manage this QR →" : "Saved to your profile! Tap to view →"}
          </Text>
        </Pressable>
      )}

      {isBranded && !generatedUuid && (
        <View style={[styles.livePreviewBanner, { backgroundColor: colors.primaryDim, borderTopColor: colors.primary + "25" }]}>
          <Ionicons name="flash-outline" size={13} color={colors.primary} />
          <Text style={[styles.livePreviewText, { color: colors.primary }]}>
            Live preview — tap Generate to register this QR
          </Text>
        </View>
      )}

      {isBranded && generatedUuid ? (
        <View style={[styles.brandedFooter, { borderTopColor: colors.surfaceBorder }]}>
          <View style={styles.brandedHeader}>
            <Image source={require("../../../../assets/images/icon.png")} style={styles.brandLogo} />
            <Text style={[styles.brandName, { color: colors.text }]}>BinRo</Text>
            <View style={[styles.secureBadge, { backgroundColor: colors.safeDim }]}>
              <Ionicons name="shield-checkmark" size={11} color={colors.safe} />
              <Text style={[styles.secureText, { color: colors.safe }]}>Verified</Text>
            </View>
            {saving && <Text style={[styles.savingText, { color: colors.textMuted }]}>Saving…</Text>}
          </View>
          <View style={styles.brandedMeta}>
            <View style={styles.brandedMetaItem}>
              <Text style={[styles.brandedMetaLabel, { color: colors.textMuted }]}>QR ID</Text>
              <Text style={[styles.brandedMetaValue, { color: colors.text }]} numberOfLines={1}>{generatedUuid}</Text>
            </View>
            {generatedAt && (
              <View style={styles.brandedMetaItem}>
                <Text style={[styles.brandedMetaLabel, { color: colors.textMuted }]}>Date</Text>
                <Text style={[styles.brandedMetaValue, { color: colors.text }]}>{formatShortDate(generatedAt)}</Text>
              </View>
            )}
          </View>
          <View style={[styles.destinationRow, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.destinationLabel, { color: colors.textMuted }]}>QR Sticker Encodes</Text>
            <Text style={[styles.destinationValue, { color: colors.text }]} numberOfLines={2}>{qrValue}</Text>
          </View>
          <View style={[styles.ownershipNote, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" }]}>
            <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
            <Text style={[styles.ownershipNoteText, { color: colors.primary }]}>
              <Text style={{ fontFamily: "Inter_700Bold" }}>Database-locked QR — </Text>
              the QR sticker points to our secure server. Only BinRo's database reveals the real content. Other scanners see our web page. You own this link forever.
            </Text>
          </View>
        </View>
      ) : privateMode ? (
        <View style={[styles.privateFooter, { borderTopColor: colors.surfaceBorder }]}>
          <Ionicons name="eye-off-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.privateFooterText, { color: colors.textMuted }]}>No-trace QR — not recorded anywhere</Text>
        </View>
      ) : null}
    </>
  );
}

export default memo(QrSavedBanner);

const styles = StyleSheet.create({
  savedBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 10, padding: 10, marginBottom: 10, marginHorizontal: 16, borderWidth: 1,
  },
  savedBannerText:    { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  livePreviewBanner:  { flexDirection: "row", alignItems: "center", gap: 7, borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 10 },
  livePreviewText:    { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  brandedFooter:      { borderTopWidth: 1, padding: 16 },
  brandedHeader:      { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  brandLogo:          { width: 24, height: 24, borderRadius: 6 },
  brandName:          { fontSize: 15, fontFamily: "Inter_700Bold" },
  secureBadge:        { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  secureText:         { fontSize: 12, fontFamily: "Inter_700Bold" },
  savingText:         { fontSize: 12, fontFamily: "Inter_400Regular", marginLeft: 4 },
  brandedMeta:        { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 10 },
  brandedMetaItem:    { minWidth: 80 },
  brandedMetaLabel:   { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 2 },
  brandedMetaValue:   { fontSize: 13, fontFamily: "Inter_700Bold" },
  destinationRow:     { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 8, gap: 2 },
  destinationLabel:   { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  destinationValue:   { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  ownershipNote:      { flexDirection: "row", alignItems: "flex-start", gap: 6, padding: 10, borderRadius: 10, borderWidth: 1 },
  ownershipNoteText:  { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  privateFooter:      { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, padding: 14 },
  privateFooterText:  { fontSize: 12, fontFamily: "Inter_400Regular" },
});
