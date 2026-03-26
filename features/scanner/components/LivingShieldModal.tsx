import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import type { GuardLink } from "@/lib/firestore-service";

interface Props {
  visible: boolean;
  loading: boolean;
  data: GuardLink | null;
  onProceed: () => void;
  onCancel: () => void;
}

export default function LivingShieldModal({ visible, loading, data, onProceed, onCancel }: Props) {
  const { colors } = useTheme();
  if (!visible) return null;

  const recentlyChanged =
    data?.destinationChangedAt &&
    Date.now() - new Date(data.destinationChangedAt).getTime() < 86400000;

  return (
    <View style={styles.overlay}>
      <Reanimated.View entering={FadeInDown.duration(380)} style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        {loading ? (
          <>
            <View style={[styles.badge, { backgroundColor: colors.warningDim }]}>
              <ActivityIndicator size={32} color={colors.warning} />
            </View>
            <Text style={[styles.title, { color: colors.warning }]}>Living Shield QR</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Verifying business identity…</Text>
          </>
        ) : data && data.isActive ? (
          <>
            <View style={[styles.badge, { backgroundColor: colors.warningDim }]}>
              <Ionicons name="shield" size={36} color={colors.warning} />
            </View>
            <View style={styles.badgeRow}>
              <View style={[styles.shieldPill, { backgroundColor: colors.warningDim }]}>
                <Ionicons name="shield-checkmark" size={12} color={colors.warning} />
                <Text style={[styles.shieldPillText, { color: colors.warning }]}>Living Shield QR</Text>
              </View>
            </View>
            <Text style={[styles.title, { color: colors.text, fontSize: 22 }]}>
              {data.businessName || data.ownerName}
            </Text>
            {data.businessName ? (
              <Text style={[styles.byLine, { color: colors.textSecondary }]}>by {data.ownerName}</Text>
            ) : null}

            {recentlyChanged ? (
              <View style={[styles.warningBanner, { backgroundColor: colors.warningDim, borderColor: colors.warning + "40" }]}>
                <Ionicons name="warning-outline" size={16} color={colors.warning} />
                <Text style={[styles.warningBannerText, { color: colors.warning }]}>
                  Destination changed in the last 24 hours — proceed with caution
                </Text>
              </View>
            ) : null}

            <Text style={[styles.destLabel, { color: colors.textMuted }]}>Destination</Text>
            <View style={[styles.destBox, { backgroundColor: colors.background, borderColor: colors.surfaceBorder }]}>
              <Text style={[styles.destText, { color: colors.primary }]} numberOfLines={3}>
                {data.currentDestination}
              </Text>
            </View>

            <Pressable onPress={onProceed} style={[styles.openBtn, { backgroundColor: colors.warning }]}>
              <Ionicons name="open-outline" size={16} color="#0A0814" />
              <Text style={styles.openBtnText}>Open Destination</Text>
            </Pressable>
            <Pressable onPress={onCancel} style={styles.cancelBtn}>
              <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cancel</Text>
              <Ionicons name="close" size={16} color={colors.textMuted} />
            </Pressable>
          </>
        ) : (
          <>
            <View style={[styles.badge, { backgroundColor: colors.dangerDim }]}>
              <Ionicons name="shield-outline" size={32} color={colors.danger} />
            </View>
            <Text style={[styles.title, { color: colors.danger }]}>
              {data ? "QR Deactivated" : "Not Found"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {data
                ? "The owner has deactivated this QR code."
                : "This Living Shield QR could not be found. It may have been removed."}
            </Text>
            <Pressable onPress={onCancel} style={[styles.openBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="arrow-back" size={18} color="#fff" />
              <Text style={[styles.openBtnText, { color: "#fff" }]}>Go Back</Text>
            </Pressable>
          </>
        )}
      </Reanimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  sheet: { borderRadius: 24, padding: 28, alignItems: "center", borderWidth: 1, width: "100%" },
  badge: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  shieldPill: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    flexDirection: "row", alignItems: "center", gap: 4,
  },
  shieldPillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 4 },
  byLine: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 12 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, marginBottom: 20 },
  warningBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 10, padding: 10, marginBottom: 12,
    borderWidth: 1, alignSelf: "stretch",
  },
  warningBannerText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1, lineHeight: 17 },
  destLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", alignSelf: "flex-start", marginBottom: 6 },
  destBox: { borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 16, alignSelf: "stretch" },
  destText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  openBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24,
    marginBottom: 10, width: "100%", justifyContent: "center",
  },
  openBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0A0814" },
  cancelBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 12, justifyContent: "center", width: "100%",
  },
  cancelBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
