import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { shadow } from "@/lib/utils/platform";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import QRCode from "react-native-qrcode-svg";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import type { LogoPosition } from "@/hooks/useQrGenerator";

interface Props {
  qrValue: string;
  qrSize: number;
  isBranded: boolean;
  privateMode: boolean;
  qrMode: "individual" | "business" | "private";
  logoPosition: LogoPosition;
  customLogoUri: string | null;
  generatedUuid: string | null;
  generatedAt: Date | null;
  saving: boolean;
  savedToProfile: boolean;
  user: any;
  svgRef: React.MutableRefObject<any>;
  logoPositionLabel: string;
  onSizeIncrease: () => void;
  onSizeDecrease: () => void;
  onCopy: () => void;
  onShare: () => void;
  onClear: () => void;
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function QrOutputCard({
  qrValue, qrSize, isBranded, privateMode, qrMode, logoPosition,
  customLogoUri, generatedUuid, generatedAt, saving, savedToProfile,
  user, svgRef, logoPositionLabel,
  onSizeIncrease, onSizeDecrease, onCopy, onShare, onClear,
}: Props) {
  const logoSource = customLogoUri
    ? { uri: customLogoUri }
    : isBranded
    ? require("../../../assets/images/icon.png")
    : undefined;

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.qrCard}>
      <View style={styles.qrWrapper}>
        <View style={styles.qrBg}>
          <QRCode
            value={qrValue}
            size={qrSize}
            color="#0A0E17"
            backgroundColor="#F8FAFC"
            getRef={(ref: any) => { svgRef.current = ref; }}
            logo={logoPosition === "center" ? logoSource : undefined}
            logoSize={customLogoUri ? 54 : isBranded ? 48 : undefined}
            logoBackgroundColor="#F8FAFC"
            logoBorderRadius={customLogoUri ? 27 : 10}
            logoMargin={4}
            quietZone={10}
            ecl="H"
          />
          {logoSource && logoPosition !== "center" && (
            <View
              style={[
                styles.cornerLogoWrapper,
                { pointerEvents: "none" },
                logoPosition === "top-left" && { top: 10, left: 10 },
                logoPosition === "top-right" && { top: 10, right: 10 },
                logoPosition === "bottom-left" && { bottom: 10, left: 10 },
                logoPosition === "bottom-right" && { bottom: 10, right: 10 },
              ]}
            >
              <Image
                source={customLogoUri ? { uri: customLogoUri } : require("../../../assets/images/icon.png")}
                style={styles.cornerLogoImage}
              />
            </View>
          )}
        </View>
      </View>

      {logoPosition !== "center" && logoSource && (
        <View style={styles.positionNote}>
          <Ionicons name="information-circle-outline" size={13} color={Colors.dark.primary} />
          <Text style={styles.positionNoteText}>Logo placed at {logoPositionLabel.toLowerCase()} corner</Text>
        </View>
      )}

      {savedToProfile && (
        <Pressable onPress={() => router.push("/(tabs)/profile")} style={styles.savedBanner}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.dark.safe} />
          <Text style={styles.savedBannerText}>Saved to your profile! Tap to view →</Text>
        </Pressable>
      )}

      {isBranded && generatedUuid ? (
        <View style={styles.brandedFooter}>
          <View style={styles.brandedHeader}>
            <Image source={require("../../../assets/images/icon.png")} style={styles.brandLogo} />
            <Text style={styles.brandName}>QR Guard</Text>
            <View style={styles.secureBadge}>
              <Ionicons name="shield-checkmark" size={11} color={Colors.dark.safe} />
              <Text style={styles.secureText}>Verified</Text>
            </View>
            {saving && <Text style={styles.savingText}>Saving…</Text>}
          </View>
          <View style={styles.brandedMeta}>
            <View style={styles.brandedMetaItem}>
              <Text style={styles.brandedMetaLabel}>QR ID</Text>
              <Text style={styles.brandedMetaValue} numberOfLines={1}>{generatedUuid}</Text>
            </View>
            <View style={styles.brandedMetaItem}>
              <Text style={styles.brandedMetaLabel}>Created by</Text>
              <Text style={styles.brandedMetaValue} numberOfLines={1}>{user?.displayName}</Text>
            </View>
            {generatedAt && (
              <View style={styles.brandedMetaItem}>
                <Text style={styles.brandedMetaLabel}>Date</Text>
                <Text style={styles.brandedMetaValue}>{formatShortDate(generatedAt)}</Text>
              </View>
            )}
          </View>
          {qrMode === "business" ? (
            <View style={[styles.ownershipNote, { borderColor: "#FBBF2430", backgroundColor: "#FBBF2408" }]}>
              <Ionicons name="shield" size={12} color="#FBBF24" />
              <Text style={[styles.ownershipNoteText, { color: "#FBBF24" }]}>
                Living Shield active — update the destination anytime from My QR Codes without reprinting.
              </Text>
            </View>
          ) : (
            <View style={styles.ownershipNote}>
              <Ionicons name="lock-closed" size={12} color={Colors.dark.primary} />
              <Text style={styles.ownershipNoteText}>
                This QR is registered to your account. Only you can manage its comments and view followers.
              </Text>
            </View>
          )}
        </View>
      ) : privateMode ? (
        <View style={styles.privateFooter}>
          <Ionicons name="eye-off-outline" size={14} color={Colors.dark.textMuted} />
          <Text style={styles.privateFooterText}>No-trace QR — not recorded anywhere</Text>
        </View>
      ) : null}

      {qrMode !== "business" && (
        <Text style={styles.qrContentPreview} numberOfLines={2}>{qrValue}</Text>
      )}

      <View style={styles.sizeRow}>
        <Text style={styles.sizeLabel}>Size</Text>
        <View style={styles.sizeButtons}>
          <Pressable onPress={onSizeDecrease} style={styles.sizeBtn}>
            <Ionicons name="remove" size={18} color={Colors.dark.primary} />
          </Pressable>
          <Text style={styles.sizePx}>{qrSize}px</Text>
          <Pressable onPress={onSizeIncrease} style={styles.sizeBtn}>
            <Ionicons name="add" size={18} color={Colors.dark.primary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.qrActions}>
        <Pressable onPress={onCopy} style={styles.qrActionBtn}>
          <Ionicons name="copy-outline" size={19} color={Colors.dark.primary} />
          <Text style={styles.qrActionText}>Copy</Text>
        </Pressable>
        <Pressable onPress={onShare} style={styles.qrActionBtn}>
          <Ionicons name="share-outline" size={19} color={Colors.dark.primary} />
          <Text style={styles.qrActionText}>Share</Text>
        </Pressable>
        <Pressable onPress={onClear} style={[styles.qrActionBtn, { borderColor: Colors.dark.danger + "50" }]}>
          <Ionicons name="trash-outline" size={19} color={Colors.dark.danger} />
          <Text style={[styles.qrActionText, { color: Colors.dark.danger }]}>Clear</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  qrCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder, overflow: "hidden", marginBottom: 8,
  },
  qrWrapper: { alignItems: "center", paddingVertical: 24, paddingHorizontal: 16 },
  qrBg: {
    backgroundColor: "#F8FAFC", borderRadius: 16, padding: 12, position: "relative",
    ...shadow(10, "#000", 0.15, 0, 4, 6),
  },
  cornerLogoWrapper: {
    position: "absolute", width: 40, height: 40, borderRadius: 10,
    backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(0,0,0,0.08)",
  },
  cornerLogoImage: { width: 34, height: 34, borderRadius: 8 },
  positionNote: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginHorizontal: 16, marginTop: -8, marginBottom: 8,
    backgroundColor: Colors.dark.primaryDim, padding: 8, borderRadius: 8,
  },
  positionNoteText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.primary },
  savedBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dark.safeDim, borderRadius: 10, padding: 10, marginBottom: 10,
    marginHorizontal: 16,
    borderWidth: 1, borderColor: Colors.dark.safe + "40",
  },
  savedBannerText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.safe, flex: 1 },
  brandedFooter: { borderTopWidth: 1, borderTopColor: Colors.dark.surfaceBorder, padding: 16 },
  brandedHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  brandLogo: { width: 24, height: 24, borderRadius: 6 },
  brandName: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  secureBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.dark.safeDim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  secureText: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.dark.safe },
  savingText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginLeft: 4 },
  brandedMeta: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 10 },
  brandedMetaItem: { minWidth: 80 },
  brandedMetaLabel: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted, marginBottom: 2 },
  brandedMetaValue: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  ownershipNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    backgroundColor: Colors.dark.primaryDim, padding: 10, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.dark.primary + "30",
  },
  ownershipNoteText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.dark.primary, lineHeight: 16 },
  privateFooter: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderTopWidth: 1, borderTopColor: Colors.dark.surfaceBorder, padding: 14,
  },
  privateFooterText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },
  qrContentPreview: {
    fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted,
    paddingHorizontal: 16, paddingBottom: 8, textAlign: "center",
  },
  sizeRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: Colors.dark.surfaceBorder,
  },
  sizeLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary },
  sizeButtons: { flexDirection: "row", alignItems: "center", gap: 12 },
  sizeBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.dark.primaryDim, alignItems: "center", justifyContent: "center",
  },
  sizePx: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.dark.text, minWidth: 52, textAlign: "center" },
  qrActions: {
    flexDirection: "row", gap: 10, padding: 16,
    borderTopWidth: 1, borderTopColor: Colors.dark.surfaceBorder,
  },
  qrActionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12, borderRadius: 14,
    backgroundColor: Colors.dark.primaryDim, borderWidth: 1, borderColor: Colors.dark.primary + "40",
  },
  qrActionText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },
});
