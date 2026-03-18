import React from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const REPORT_TYPES = [
  { key: "safe", label: "Safe", icon: "shield-checkmark", color: Colors.dark.safe, bg: Colors.dark.safeDim },
  { key: "scam", label: "Scam", icon: "warning", color: Colors.dark.danger, bg: Colors.dark.dangerDim },
  { key: "fake", label: "Fake", icon: "close-circle", color: Colors.dark.warning, bg: Colors.dark.warningDim },
  { key: "spam", label: "Spam", icon: "mail-unread", color: Colors.dark.accent, bg: Colors.dark.accentDim },
];

interface Props {
  userReport: string | null;
  reportLoading: string | null;
  onReport: (type: string) => void;
}

const ReportSection = React.memo(function ReportSection({ userReport, reportLoading, onReport }: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>Report This QR Code</Text>
      <Text style={styles.sectionSub}>Help the community by marking this code</Text>
      <View style={styles.reportGrid}>
        {REPORT_TYPES.map((r) => {
          const isSelected = userReport === r.key;
          const isLoading = reportLoading === r.key;
          return (
            <Pressable
              key={r.key}
              onPress={() => onReport(r.key)}
              disabled={!!reportLoading}
              style={({ pressed }) => [
                styles.reportBtn,
                { backgroundColor: r.bg, borderColor: r.color + "50" },
                isSelected && { borderColor: r.color, borderWidth: 2 },
                { opacity: pressed || (reportLoading && !isLoading) ? 0.7 : 1 },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={r.color} />
              ) : (
                <Ionicons name={r.icon as any} size={22} color={r.color} />
              )}
              <Text style={[styles.reportBtnText, { color: r.color }]}>{r.label}</Text>
              {isSelected ? (
                <View style={styles.selectedCheck}>
                  <Ionicons name="checkmark-circle" size={14} color={r.color} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {userReport ? (
        <View style={styles.reportedBanner}>
          <Ionicons name="checkmark-circle" size={15} color={Colors.dark.safe} />
          <Text style={styles.reportedText}>
            You reported this as <Text style={{ fontFamily: "Inter_700Bold" }}>{userReport}</Text> — thank you!
          </Text>
        </View>
      ) : null}
    </View>
  );
});

export default ReportSection;

const styles = StyleSheet.create({
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.dark.text, marginBottom: 4 },
  sectionSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, marginBottom: 14 },
  reportGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  reportBtn: {
    width: "47%", paddingVertical: 14, borderRadius: 14, alignItems: "center",
    gap: 6, borderWidth: 1, position: "relative",
  },
  reportBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  selectedCheck: { position: "absolute", top: 6, right: 8 },
  reportedBanner: {
    flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12,
    backgroundColor: Colors.dark.safeDim, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: Colors.dark.safe + "40",
  },
  reportedText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, flex: 1 },
});
