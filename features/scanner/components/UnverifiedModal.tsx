import { View, Text, StyleSheet } from "react-native";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

type Colors = {
  surface: string;
  textSecondary: string;
  textMuted: string;
};

export function UnverifiedModal({
  visible,
  countdown,
  onProceed,
  onBack,
  colors,
}: {
  visible: boolean;
  countdown: number;
  onProceed: () => void;
  onBack: () => void;
  colors: Colors;
}) {
  if (!visible) return null;
  return (
    <View style={styles.overlay}>
      <Reanimated.View
        entering={FadeInDown.duration(260)}
        style={[styles.sheet, { backgroundColor: colors.surface }]}
      >
        <View style={styles.sheetAccentStripe} />
        <View style={styles.unverifiedIconGroup}>
          <View style={styles.unverifiedOuterRing}>
            <View style={styles.unverifiedInnerRing}>
              <Ionicons name="help" size={34} color="#F59E0B" />
            </View>
          </View>
        </View>
        <View style={styles.sheetTextGroup}>
          <Text style={[styles.sheetTitle, { color: "#fff" }]}>Unverified Source</Text>
          <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
            This QR code has no registered owner or cryptographic signature. It may be legitimate but we cannot confirm its identity.
          </Text>
        </View>
        <View style={styles.countdownGroup}>
          <View style={styles.countdownRing}>
            <Text style={styles.countdownNum}>{countdown}</Text>
          </View>
          <Text style={[styles.countdownHint, { color: colors.textMuted }]}>
            Auto-proceeding in {countdown}s
          </Text>
        </View>
        <View style={styles.sheetActions}>
          <View
            onTouchEnd={onProceed}
            style={[styles.proceedBtn, { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)" }]}
          >
            <Text style={[styles.proceedBtnText, { color: "rgba(255,255,255,0.6)" }]}>View Details Now</Text>
            <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.4)" />
          </View>
          <View onTouchEnd={onBack} style={styles.cancelBtn}>
            <Ionicons name="arrow-back" size={18} color="#000" />
            <Text style={styles.cancelBtnText}>Stay Safe</Text>
          </View>
        </View>
      </Reanimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sheet: {
    width: "100%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    alignItems: "center",
    gap: 18,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
    overflow: "hidden",
    paddingBottom: 36,
  },
  sheetAccentStripe: {
    width: "100%",
    height: 3,
    backgroundColor: "#F59E0B",
  },
  unverifiedIconGroup: { alignItems: "center", marginTop: 8 },
  unverifiedOuterRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.2)",
    backgroundColor: "rgba(245,158,11,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  unverifiedInnerRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.35)",
    backgroundColor: "rgba(245,158,11,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTextGroup: { alignItems: "center", gap: 8, paddingHorizontal: 28 },
  sheetTitle: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  sheetSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
  },
  countdownGroup: { alignItems: "center", gap: 8 },
  countdownRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: "#F59E0B",
    backgroundColor: "rgba(245,158,11,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  countdownNum: { fontSize: 30, fontFamily: "Inter_700Bold", color: "#F59E0B" },
  countdownHint: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sheetActions: { width: "100%", paddingHorizontal: 20, gap: 10 },
  proceedBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  proceedBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cancelBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: "#F59E0B",
  },
  cancelBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#000" },
});
