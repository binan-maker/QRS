import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import type { LogoPosition } from "@/features/generator/types/form-types";

function getSecurityMeta(qrValue: string): {
  level: "safe" | "warning" | "danger" | "info";
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
} | null {
  const isUpi      = qrValue.startsWith("upi://");
  const isBharatQr = isUpi && qrValue.includes("mode=02");
  const isHttps    = qrValue.startsWith("https://");
  const isHttp     = qrValue.startsWith("http://") && !isHttps;
  const isWifi     = qrValue.startsWith("WIFI:");
  const isVCard    = qrValue.startsWith("BEGIN:VCARD");
  const isCalendar = qrValue.startsWith("BEGIN:VCALENDAR");

  if (isBharatQr) return { level: "safe",    label: "NPCI BharatQR — Bank-grade security", icon: "shield-checkmark" };
  if (isUpi)      return { level: "safe",    label: "UPI verified — NPCI compliant",        icon: "shield-checkmark" };
  if (isWifi)     return { level: "info",    label: "WiFi credentials encoded",             icon: "wifi"             };
  if (isVCard)    return { level: "info",    label: "Contact card (vCard 3.0)",             icon: "person"           };
  if (isCalendar) return { level: "info",    label: "Calendar event (iCal)",                icon: "calendar"         };
  if (isHttp)     return { level: "warning", label: "Insecure link (HTTP, not HTTPS)",      icon: "warning"          };
  if (isHttps)    return { level: "safe",    label: "Secure link (HTTPS encrypted)",        icon: "lock-closed"      };
  return null;
}

interface Props {
  qrValue: string;
  urlRiskScore: number;
  urlRiskReasons: string[];
  logoPosition: LogoPosition;
  logoPositionLabel: string;
  hasLogo: boolean;
}

function QrSecurityBadges({
  qrValue, urlRiskScore, urlRiskReasons,
  logoPosition, logoPositionLabel, hasLogo,
}: Props) {
  const { colors } = useTheme();
  const securityMeta = useMemo(() => getSecurityMeta(qrValue), [qrValue]);
  const riskLevel = urlRiskScore >= 70 ? "danger" : urlRiskScore >= 35 ? "warning" : null;

  return (
    <>
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
              securityMeta.level === "safe"    ? colors.safe    :
              securityMeta.level === "warning" ? colors.warning :
              securityMeta.level === "danger"  ? colors.danger  : colors.primary
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

      {riskLevel && urlRiskReasons.length > 0 && (
        <View style={[
          styles.threatStrip,
          { backgroundColor: riskLevel === "danger" ? colors.dangerDim  : colors.warningDim,
            borderColor:      riskLevel === "danger" ? colors.danger + "40" : colors.warning + "40" },
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

      {hasLogo && logoPosition !== "center" && (
        <View style={[styles.positionNote, { backgroundColor: colors.primaryDim }]}>
          <Ionicons name="information-circle-outline" size={13} color={colors.primary} />
          <Text style={[styles.positionNoteText, { color: colors.primary }]}>
            Logo placed at {logoPositionLabel.toLowerCase()} corner
          </Text>
        </View>
      )}
    </>
  );
}

export default memo(QrSecurityBadges);

const styles = StyleSheet.create({
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
  threatLabel:     { fontSize: 12, fontFamily: "Inter_700Bold", marginBottom: 2 },
  threatSub:       { fontSize: 11, fontFamily: "Inter_400Regular" },
  positionNote:    { flexDirection: "row", alignItems: "center", gap: 6, marginHorizontal: 16, marginTop: -8, marginBottom: 8, padding: 8, borderRadius: 8 },
  positionNoteText:{ fontSize: 12, fontFamily: "Inter_400Regular" },
});
