import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import type { GuardLink } from "@/lib/firestore-service";

interface Props {
  visible: boolean;
  loading: boolean;
  data: GuardLink | null;
  onProceed: () => void;
  onCancel: () => void;
}

export default function LivingShieldModal({ visible, loading, data, onProceed, onCancel }: Props) {
  if (!visible) return null;

  const recentlyChanged =
    data?.destinationChangedAt &&
    Date.now() - new Date(data.destinationChangedAt).getTime() < 86400000;

  return (
    <View style={styles.overlay}>
      <Reanimated.View entering={FadeInDown.duration(380)} style={styles.sheet}>
        {loading ? (
          <>
            <View style={[styles.badge, { backgroundColor: "rgba(251,191,36,0.12)" }]}>
              <ActivityIndicator size={32} color="#FBBF24" />
            </View>
            <Text style={[styles.title, { color: "#FBBF24" }]}>Living Shield QR</Text>
            <Text style={styles.subtitle}>Verifying business identity…</Text>
          </>
        ) : data && data.isActive ? (
          <>
            <View style={[styles.badge, { backgroundColor: "rgba(251,191,36,0.12)" }]}>
              <Ionicons name="shield" size={36} color="#FBBF24" />
            </View>
            <View style={styles.badgeRow}>
              <View style={styles.shieldPill}>
                <Ionicons name="shield-checkmark" size={12} color="#FBBF24" />
                <Text style={styles.shieldPillText}>Living Shield QR</Text>
              </View>
            </View>
            <Text style={[styles.title, { fontSize: 22 }]}>
              {data.businessName || data.ownerName}
            </Text>
            {data.businessName ? (
              <Text style={styles.byLine}>by {data.ownerName}</Text>
            ) : null}

            {recentlyChanged ? (
              <View style={styles.warningBanner}>
                <Ionicons name="warning-outline" size={16} color="#f97316" />
                <Text style={styles.warningBannerText}>
                  Destination changed in the last 24 hours — proceed with caution
                </Text>
              </View>
            ) : null}

            <Text style={styles.destLabel}>Destination</Text>
            <View style={styles.destBox}>
              <Text style={styles.destText} numberOfLines={3}>
                {data.currentDestination}
              </Text>
            </View>

            <Pressable onPress={onProceed} style={styles.openBtn}>
              <Ionicons name="open-outline" size={16} color="#000" />
              <Text style={styles.openBtnText}>Open Destination</Text>
            </Pressable>
            <Pressable onPress={onCancel} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
              <Ionicons name="close" size={16} color={Colors.dark.textMuted} />
            </Pressable>
          </>
        ) : (
          <>
            <View style={[styles.badge, { backgroundColor: "rgba(239,68,68,0.12)" }]}>
              <Ionicons name="shield-outline" size={32} color={Colors.dark.danger} />
            </View>
            <Text style={[styles.title, { color: Colors.dark.danger }]}>
              {data ? "QR Deactivated" : "Not Found"}
            </Text>
            <Text style={styles.subtitle}>
              {data
                ? "The owner has deactivated this QR code."
                : "This Living Shield QR could not be found. It may have been removed."}
            </Text>
            <Pressable onPress={onCancel} style={styles.openBtn}>
              <Ionicons name="arrow-back" size={18} color="#000" />
              <Text style={styles.openBtnText}>Go Back</Text>
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
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
    width: "100%",
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  shieldPill: {
    backgroundColor: "#FBBF2420",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  shieldPillText: { fontSize: 11, color: "#FBBF24", fontFamily: "Inter_600SemiBold" },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
    textAlign: "center",
    marginBottom: 4,
  },
  byLine: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#d9770618",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f9731640",
    alignSelf: "stretch",
  },
  warningBannerText: {
    fontSize: 12,
    color: "#f97316",
    fontFamily: "Inter_500Medium",
    flex: 1,
    lineHeight: 17,
  },
  destLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textMuted,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  destBox: {
    backgroundColor: Colors.dark.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
    padding: 10,
    marginBottom: 16,
    alignSelf: "stretch",
  },
  destText: {
    fontSize: 12,
    color: Colors.dark.accent,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FBBF24",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 10,
    width: "100%",
    justifyContent: "center",
  },
  openBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#000",
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    justifyContent: "center",
    width: "100%",
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textMuted,
  },
});
