import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator } from "react-native";
import { shadow } from "@/lib/utils/platform";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "@/contexts/ThemeContext";
import type { LogoPosition } from "@/features/generator/hooks/useQrGenerator";

interface Props {
  qrValue: string;
  qrSize: number;
  isBranded: boolean;
  privateMode: boolean;
  qrMode: "individual" | "private";
  logoPosition: LogoPosition;
  customLogoUri: string | null;
  showDefaultLogo: boolean;
  generatedUuid: string | null;
  generatedAt: Date | null;
  saving: boolean;
  savedToProfile: boolean;
  savedDocId?: string | null;
  user: any;
  svgRef: React.MutableRefObject<any>;
  logoPositionLabel: string;
  qrFgColor?: string;
  qrBgColor?: string;
  urlRiskScore?: number;
  urlRiskReasons?: string[];
  onSizeIncrease: () => void;
  onSizeDecrease: () => void;
  onCopy: () => void;
  onShare: () => void;
  onDownload: () => void;
  onClear: () => void;
  sharingQr?: boolean;
  downloadingPdf?: boolean;
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function getSecurityMeta(qrValue: string): {
  level: "safe" | "warning" | "danger" | "info";
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
} | null {
  const isUpi = qrValue.startsWith("upi://");
  const isBharatQr = isUpi && qrValue.includes("mode=02");
  const isHttps = qrValue.startsWith("https://");
  const isHttp = qrValue.startsWith("http://") && !isHttps;
  const isWifi = qrValue.startsWith("WIFI:");
  const isVCard = qrValue.startsWith("BEGIN:VCARD");
  const isCalendar = qrValue.startsWith("BEGIN:VCALENDAR");

  if (isBharatQr) return { level: "safe", label: "NPCI BharatQR — Bank-grade security", icon: "shield-checkmark" };
  if (isUpi)      return { level: "safe", label: "UPI verified — NPCI compliant",         icon: "shield-checkmark" };
  if (isWifi)     return { level: "info", label: "WiFi credentials encoded",               icon: "wifi" };
  if (isVCard)    return { level: "info", label: "Contact card (vCard 3.0)",               icon: "person" };
  if (isCalendar) return { level: "info", label: "Calendar event (iCal)",                  icon: "calendar" };
  if (isHttp)     return { level: "warning", label: "Insecure link (HTTP, not HTTPS)",     icon: "warning" };
  if (isHttps)    return { level: "safe", label: "Secure link (HTTPS encrypted)",          icon: "lock-closed" };
  return null;
}

function QrOutputCard({
  qrValue, qrSize, isBranded, privateMode, qrMode, logoPosition,
  customLogoUri, showDefaultLogo, generatedUuid, generatedAt, saving, savedToProfile,
  savedDocId,
  user, svgRef, logoPositionLabel,
  qrFgColor = "#0A0E17", qrBgColor = "#F8FAFC",
  urlRiskScore = 0, urlRiskReasons = [],
  onSizeIncrease, onSizeDecrease, onCopy, onShare, onDownload, onClear,
  sharingQr = false, downloadingPdf = false,
}: Props) {
  const { colors } = useTheme();

  const logoSource = customLogoUri
    ? { uri: customLogoUri }
    : showDefaultLogo
    ? require("../../../assets/images/icon.png")
    : undefined;

  const securityMeta = useMemo(() => getSecurityMeta(qrValue), [qrValue]);

  const riskLevel = urlRiskScore >= 70 ? "danger" : urlRiskScore >= 35 ? "warning" : null;

  return (
    <Animated.View entering={FadeIn.duration(400)} style={[styles.qrCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      <View style={styles.qrWrapper}>
        <View style={styles.qrBg}>
          <QRCode
            value={qrValue}
            size={qrSize}
            color={qrFgColor}
            backgroundColor={qrBgColor}
            getRef={(ref: any) => { svgRef.current = ref; }}
            logo={logoPosition === "center" ? logoSource : undefined}
            logoSize={customLogoUri ? 54 : showDefaultLogo ? 48 : undefined}
            logoBackgroundColor={qrBgColor}
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
                logoPosition === "top-left"     && { top: 10, left: 10 },
                logoPosition === "top-right"    && { top: 10, right: 10 },
                logoPosition === "bottom-left"  && { bottom: 10, left: 10 },
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

      {/* Security meta strip */}
      {securityMeta && (
        <View style={[
          styles.securityStrip,
          securityMeta.level === "safe"    && { backgroundColor: colors.safeDim,    borderColor: colors.safe + "30"    },
          securityMeta.level === "warning" && { backgroundColor: colors.warningDim, borderColor: colors.warning + "40" },
          securityMeta.level === "danger"  && { backgroundColor: colors.dangerDim,  borderColor: colors.danger + "40"  },
          securityMeta.level === "info"    && { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" },
        ]}>
          <Ionicons
            name={securityMeta.icon}
            size={13}
            color={
              securityMeta.level === "safe"    ? colors.safe :
              securityMeta.level === "warning" ? colors.warning :
              securityMeta.level === "danger"  ? colors.danger :
              colors.primary
            }
          />
          <Text style={[
            styles.securityStripText,
            { color: securityMeta.level === "safe" ? colors.safe : securityMeta.level === "warning" ? colors.warning : securityMeta.level === "danger" ? colors.danger : colors.primary },
          ]}>
            {securityMeta.label}
          </Text>
        </View>
      )}

      {/* Threat risk warning (from heuristic) */}
      {riskLevel && urlRiskReasons.length > 0 && (
        <View style={[
          styles.threatStrip,
          { backgroundColor: riskLevel === "danger" ? colors.dangerDim : colors.warningDim,
            borderColor: riskLevel === "danger" ? colors.danger + "40" : colors.warning + "40" },
        ]}>
          <Ionicons name="alert-circle" size={14} color={riskLevel === "danger" ? colors.danger : colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.threatLabel, { color: riskLevel === "danger" ? colors.danger : colors.warning }]}>
              {riskLevel === "danger" ? "High Risk Detected" : "Caution"}
            </Text>
            <Text style={[styles.threatSub, { color: riskLevel === "danger" ? colors.danger : colors.warning }]}>
              {urlRiskReasons.join(" · ")}
            </Text>
          </View>
        </View>
      )}

      {logoPosition !== "center" && logoSource && (
        <View style={[styles.positionNote, { backgroundColor: colors.primaryDim }]}>
          <Ionicons name="information-circle-outline" size={13} color={colors.primary} />
          <Text style={[styles.positionNoteText, { color: colors.primary }]}>Logo placed at {logoPositionLabel.toLowerCase()} corner</Text>
        </View>
      )}

      {savedToProfile && (
        <Pressable onPress={() => router.push("/(tabs)/profile")} style={[styles.savedBanner, { backgroundColor: colors.safeDim, borderColor: colors.safe + "40" }]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.safe} />
          <Text style={[styles.savedBannerText, { color: colors.safe }]}>Saved to your profile! Tap to view →</Text>
        </Pressable>
      )}

      {isBranded && !generatedUuid && (
        <View style={[styles.livePreviewBanner, { backgroundColor: colors.primaryDim, borderTopColor: colors.primary + "25" }]}>
          <Ionicons name="flash-outline" size={13} color={colors.primary} />
          <Text style={[styles.livePreviewText, { color: colors.primary }]}>Live preview — tap Generate to register this QR</Text>
        </View>
      )}

      {isBranded && generatedUuid ? (
        <View style={[styles.brandedFooter, { borderTopColor: colors.surfaceBorder }]}>
          <View style={styles.brandedHeader}>
            <Image source={require("../../../assets/images/icon.png")} style={styles.brandLogo} />
            <Text style={[styles.brandName, { color: colors.text }]}>QR Guard</Text>
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
          <>
              <View style={[styles.destinationRow, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder, marginBottom: 8 }]}>
                <Text style={[styles.destinationLabel, { color: colors.textMuted }]}>QR Sticker Encodes</Text>
                <Text style={[styles.destinationValue, { color: colors.text }]} numberOfLines={2}>{qrValue}</Text>
              </View>
              <View style={[styles.ownershipNote, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" }]}>
                <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
                <Text style={[styles.ownershipNoteText, { color: colors.primary }]}>
                  <Text style={{ fontFamily: "Inter_700Bold" }}>Database-locked QR — </Text>
                  the QR sticker points to our secure server. Only QR Guard's database reveals the real content. Other scanners see our web page. You own this link forever.
                </Text>
              </View>
            </>
        </View>
      ) : privateMode ? (
        <View style={[styles.privateFooter, { borderTopColor: colors.surfaceBorder }]}>
          <Ionicons name="eye-off-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.privateFooterText, { color: colors.textMuted }]}>No-trace QR — not recorded anywhere</Text>
        </View>
      ) : null}

      <Text style={[styles.qrContentPreview, { color: colors.textMuted }]} numberOfLines={2}>{qrValue}</Text>

      <View style={[styles.sizeRow, { borderTopColor: colors.surfaceBorder }]}>
        <Text style={[styles.sizeLabel, { color: colors.textSecondary }]}>Size</Text>
        <View style={styles.sizeButtons}>
          <Pressable onPress={onSizeDecrease} style={[styles.sizeBtn, { backgroundColor: colors.primaryDim }]}>
            <Ionicons name="remove" size={18} color={colors.primary} />
          </Pressable>
          <Text style={[styles.sizePx, { color: colors.text }]}>{qrSize}px</Text>
          <Pressable onPress={onSizeIncrease} style={[styles.sizeBtn, { backgroundColor: colors.primaryDim }]}>
            <Ionicons name="add" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.qrActions, { borderTopColor: colors.surfaceBorder }]}>
        <Pressable
          onPress={onCopy}
          style={({ pressed }) => [styles.qrActionBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="copy-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.qrActionText, { color: colors.textSecondary }]}>Copy</Text>
        </Pressable>
        <Pressable
          onPress={onShare}
          disabled={sharingQr}
          style={({ pressed }) => [styles.qrActionBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder, opacity: pressed || sharingQr ? 0.7 : 1 }]}
        >
          {sharingQr
            ? <ActivityIndicator size={16} color={colors.textSecondary} />
            : <Ionicons name="share-outline" size={18} color={colors.textSecondary} />}
          <Text style={[styles.qrActionText, { color: colors.textSecondary }]}>{sharingQr ? "…" : "Share"}</Text>
        </Pressable>
        <Pressable
          onPress={onDownload}
          disabled={downloadingPdf}
          style={({ pressed }) => [styles.qrActionBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder, opacity: pressed || downloadingPdf ? 0.7 : 1 }]}
        >
          {downloadingPdf
            ? <ActivityIndicator size={16} color={colors.textSecondary} />
            : <Ionicons name="download-outline" size={18} color={colors.textSecondary} />}
          <Text style={[styles.qrActionText, { color: colors.textSecondary }]}>{downloadingPdf ? "…" : "PDF"}</Text>
        </Pressable>
        <Pressable
          onPress={onClear}
          style={({ pressed }) => [styles.qrActionBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          <Text style={[styles.qrActionText, { color: colors.textMuted }]}>Clear</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default memo(QrOutputCard);

const styles = StyleSheet.create({
  qrCard: { borderRadius: 20, borderWidth: 1, overflow: "hidden", marginBottom: 8 },
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
  securityStrip: {
    flexDirection: "row", alignItems: "center", gap: 7,
    marginHorizontal: 12, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
  },
  securityStripText: { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1 },
  threatStrip: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    marginHorizontal: 12, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1,
  },
  threatLabel: { fontSize: 12, fontFamily: "Inter_700Bold", marginBottom: 2 },
  threatSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  positionNote: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginHorizontal: 16, marginTop: -8, marginBottom: 8, padding: 8, borderRadius: 8,
  },
  positionNoteText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  savedBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 10, padding: 10, marginBottom: 10, marginHorizontal: 16,
    borderWidth: 1,
  },
  savedBannerText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  livePreviewBanner: {
    flexDirection: "row", alignItems: "center", gap: 7,
    borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 10,
  },
  livePreviewText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  brandedFooter: { borderTopWidth: 1, padding: 16 },
  brandedHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  brandLogo: { width: 24, height: 24, borderRadius: 6 },
  brandName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  secureBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  secureText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  savingText: { fontSize: 12, fontFamily: "Inter_400Regular", marginLeft: 4 },
  brandedMeta: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 10 },
  brandedMetaItem: { minWidth: 80 },
  brandedMetaLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 2 },
  brandedMetaValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  destinationRow: {
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9,
    marginBottom: 8, gap: 2,
  },
  destinationLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  destinationValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  ownershipNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    padding: 10, borderRadius: 10, borderWidth: 1,
  },
  ownershipNoteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  viewDetailsBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderRadius: 12, paddingVertical: 11, paddingHorizontal: 16,
    borderWidth: 1, marginTop: 4,
  },
  viewDetailsBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "center" },
  privateFooter: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderTopWidth: 1, padding: 14,
  },
  privateFooterText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  qrContentPreview: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    paddingHorizontal: 16, paddingBottom: 8, textAlign: "center",
  },
  sizeRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1,
  },
  sizeLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sizeButtons: { flexDirection: "row", alignItems: "center", gap: 12 },
  sizeBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sizePx: { fontSize: 14, fontFamily: "Inter_700Bold", minWidth: 52, textAlign: "center" },
  qrActions: { flexDirection: "row", gap: 8, padding: 16, borderTopWidth: 1 },
  qrActionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    paddingVertical: 12, borderRadius: 14, borderWidth: 1,
  },
  qrActionText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
