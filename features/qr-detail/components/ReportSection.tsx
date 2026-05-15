import React from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { REPORT_TYPES } from "@/features/qr-detail/data/reportTypes";

interface Props {
  userReport: string | null;
  reportLoading: string | null;
  onReport: (type: string) => void;
}

const ReportSection = React.memo(function ReportSection({ userReport, reportLoading, onReport }: Props) {
  const { colors } = useTheme();


  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.text }]}>Report This QR Code</Text>
      <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>Help the community by marking this code</Text>
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
                { backgroundColor: r.bg(colors), borderColor: r.color(colors) + "50" },
                isSelected && { borderColor: r.color(colors), borderWidth: 2 },
                { opacity: pressed || (reportLoading && !isLoading) ? 0.7 : 1 },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={r.color(colors)} />
              ) : (
                <Ionicons name={r.icon as any} size={22} color={r.color(colors)} />
              )}
              <Text style={[styles.reportBtnText, { color: r.color(colors) }]}>{r.label}</Text>
              {isSelected ? (
                <View style={styles.selectedCheck}>
                  <Ionicons name="checkmark-circle" size={14} color={r.color(colors)} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {userReport ? (
        <View style={[styles.reportedBanner, { backgroundColor: colors.safeDim, borderColor: colors.safe + "40" }]}>
          <Ionicons name="checkmark-circle" size={15} color={colors.safe} />
          <Text style={[styles.reportedText, { color: colors.textSecondary }]}>
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
  sectionLabel: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },
  sectionSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 14 },
  reportGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  reportBtn: {
    width: "47%", paddingVertical: 14, borderRadius: 14, alignItems: "center",
    gap: 6, borderWidth: 1, position: "relative",
  },
  reportBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  selectedCheck: { position: "absolute", top: 6, right: 8 },
  reportedBanner: {
    flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12,
    borderRadius: 10, padding: 10, borderWidth: 1,
  },
  reportedText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
});
