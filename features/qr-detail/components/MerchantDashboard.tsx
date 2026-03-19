import React from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import type { ScanVelocityBucket, VerificationStatus } from "@/lib/firestore-service";

interface Props {
  scanVelocity: ScanVelocityBucket[];
  velocityLoading: boolean;
  verificationStatus: VerificationStatus;
  onRefreshVelocity: () => void;
  onRequestVerify: () => void;
}

const MerchantDashboard = React.memo(function MerchantDashboard({
  scanVelocity, velocityLoading, verificationStatus,
  onRefreshVelocity, onRequestVerify,
}: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const totalScans24h = scanVelocity.reduce((s, b) => s + b.count, 0);
  const maxCount = Math.max(...scanVelocity.map((b) => b.count), 1);
  const MAX_BAR_H = 60;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={styles.iconBox}>
            <Ionicons name="bar-chart" size={18} color={colors.primary} />
          </View>
          <Text style={styles.title}>Merchant Dashboard</Text>
        </View>
        <Pressable onPress={onRefreshVelocity} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={16} color={colors.textMuted} />
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>Scan Velocity — Last 24 Hours</Text>
      {velocityLoading ? (
        <ActivityIndicator color={colors.primary} size="small" style={{ marginVertical: 16 }} />
      ) : (
        <View style={styles.velocityChart}>
          {scanVelocity.map((bucket, i) => (
            <View key={i} style={styles.barWrapper}>
              <View style={[
                styles.bar,
                {
                  height: Math.max(2, (bucket.count / maxCount) * MAX_BAR_H),
                  backgroundColor: bucket.count > 0 ? colors.primary : colors.surfaceLight,
                },
              ]} />
              {(i % 6 === 0 || i === 23) ? (
                <Text style={styles.barLabel}>{bucket.label}</Text>
              ) : (
                <View style={{ height: 12 }} />
              )}
            </View>
          ))}
        </View>
      )}
      {scanVelocity.length > 0 && (
        <Text style={styles.totalScans}>
          {totalScans24h} scan{totalScans24h !== 1 ? "s" : ""} in the last 24h
        </Text>
      )}

      <View style={styles.divider} />
      <Text style={styles.sectionLabel}>Merchant Verification</Text>

      {verificationStatus.status === "none" && (
        <Pressable onPress={onRequestVerify} style={styles.verifyBtn}>
          <Ionicons name="shield-outline" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.verifyBtnText}>Request Verified Badge</Text>
            <Text style={styles.verifyBtnSub}>Submit business ID for manual review</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>
      )}
      {verificationStatus.status === "pending" && (
        <View style={styles.statusRow}>
          <Ionicons name="time-outline" size={18} color={colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusText, { color: colors.warning }]}>Verification Pending</Text>
            {verificationStatus.businessName ? (
              <Text style={styles.statusSub}>{verificationStatus.businessName}</Text>
            ) : null}
          </View>
        </View>
      )}
      {verificationStatus.status === "approved" && (
        <View style={styles.statusRow}>
          <Ionicons name="shield-checkmark" size={18} color={colors.safe} />
          <Text style={[styles.statusText, { color: colors.safe }]}>Merchant Verified</Text>
        </View>
      )}
      {verificationStatus.status === "rejected" && (
        <View style={{ gap: 8 }}>
          <View style={styles.statusRow}>
            <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
            <Text style={[styles.statusText, { color: colors.danger }]}>Verification Rejected</Text>
          </View>
          <Pressable onPress={onRequestVerify} style={styles.verifyBtn}>
            <Ionicons name="reload-outline" size={16} color={colors.primary} />
            <Text style={styles.verifyBtnText}>Resubmit</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      )}
    </View>
  );
});

export default MerchantDashboard;

function makeStyles(c: ReturnType<typeof import("@/contexts/ThemeContext").useTheme>["colors"]) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surface, borderRadius: 16, padding: 18,
      marginBottom: 14, borderWidth: 1, borderColor: c.surfaceBorder,
    },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
    iconBox: {
      width: 34, height: 34, borderRadius: 10,
      backgroundColor: c.primaryDim, alignItems: "center", justifyContent: "center",
    },
    title: { fontSize: 15, fontFamily: "Inter_700Bold", color: c.text },
    refreshBtn: {
      width: 32, height: 32, borderRadius: 10, backgroundColor: c.surfaceLight,
      alignItems: "center", justifyContent: "center",
    },
    sectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: c.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
    velocityChart: { flexDirection: "row", alignItems: "flex-end", gap: 2, height: 80, marginBottom: 8 },
    barWrapper: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 2 },
    bar: { width: "100%", borderRadius: 2, minHeight: 2 },
    barLabel: { fontSize: 9, fontFamily: "Inter_400Regular", color: c.textMuted },
    totalScans: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.textSecondary, textAlign: "center", marginBottom: 4 },
    divider: { height: 1, backgroundColor: c.surfaceBorder, marginVertical: 14 },
    verifyBtn: {
      flexDirection: "row", alignItems: "center", gap: 12,
      backgroundColor: c.primaryDim, borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: c.primary + "30",
    },
    verifyBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.text },
    verifyBtnSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary, marginTop: 2 },
    statusRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 4 },
    statusText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    statusSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary, marginTop: 2 },
  });
}
