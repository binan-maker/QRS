import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";

export function StandardQrBanner({
  loading,
  ready,
  ownerName,
  isActive,
  qrId,
}: {
  loading: boolean;
  ready: boolean;
  ownerName: string | null;
  isActive: boolean;
  qrId?: string;
}) {
  const { colors, isDark } = useTheme();
  const accent = "#22c55e";

  return (
    <Animated.View entering={FadeInDown.duration(180)}>
      <View
        style={[
          styles.card,
          { backgroundColor: isDark ? "#0a1a0e" : "#f0fdf4", borderColor: accent + "30" },
        ]}
      >
        <LinearGradient
          colors={[accent + "18", accent + "06"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: accent + "20", borderColor: accent + "40" }]}>
            <Ionicons name="shield-checkmark-outline" size={22} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: accent }]}>Protected QR</Text>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>
              Verified QR Guard link — content resolved below
            </Text>
          </View>
        </View>

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={accent} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Resolving QR content…
            </Text>
          </View>
        )}

        {!loading && ready && (
          <View style={[styles.infoBlock, { borderColor: colors.surfaceBorder }]}>
            {ownerName ? (
              <View style={styles.infoRow}>
                <Ionicons name="person-circle-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Created by</Text>
                <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
                  {ownerName}
                </Text>
              </View>
            ) : null}
            {qrId ? (
              <View style={styles.infoRow}>
                <Ionicons name="qr-code-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>QR ID</Text>
                <Text style={[styles.infoValue, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                  {qrId}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {!loading && !isActive && (
          <View style={[styles.deactivatedRow, { backgroundColor: "#ef444418", borderColor: "#ef444440" }]}>
            <Ionicons name="ban-outline" size={14} color="#ef4444" />
            <Text style={[styles.warningText, { color: "#ef4444" }]}>
              This QR code has been deactivated by its owner
            </Text>
          </View>
        )}

        {!loading && !ready && (
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Could not load QR content
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    overflow: "hidden",
    marginBottom: 4,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: { fontSize: 15, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  infoBlock: {
    gap: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", flexShrink: 0, minWidth: 66 },
  infoValue: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  deactivatedRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  warningText: { fontSize: 12.5, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
});
