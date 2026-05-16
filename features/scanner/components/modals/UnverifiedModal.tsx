import { View, Text, StyleSheet } from "react-native";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";

const AMBER = "#F59E0B";

interface Props {
  visible:   boolean;
  countdown: number;
  onProceed: () => void;
  onBack:    () => void;
}

export function UnverifiedModal({ visible, countdown, onProceed, onBack }: Props) {
  const { colors } = useTheme();
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Reanimated.View
        entering={FadeInDown.duration(380).springify()}
        style={[styles.sheet, { backgroundColor: colors.surface }]}
      >
        <View style={styles.accentStripe} />

        <View style={styles.iconGroup}>
          <View style={styles.outerRing}>
            <View style={styles.innerRing}>
              <Ionicons name="help" size={34} color={AMBER} />
            </View>
          </View>
        </View>

        <View style={styles.textGroup}>
          <Text style={[styles.title, { color: "#fff" }]}>Unverified Source</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
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

        <View style={styles.actions}>
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
    justifyContent:  "flex-end",
    alignItems:      "center",
  },
  sheet: {
    width: "100%", borderTopLeftRadius: 32, borderTopRightRadius: 32,
    alignItems: "center", gap: 18,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.3)",
    overflow: "hidden", paddingBottom: 36,
  },
  accentStripe: { width: "100%", height: 3, backgroundColor: AMBER },

  iconGroup: { alignItems: "center", marginTop: 8 },
  outerRing: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.2)",
    backgroundColor: "rgba(245,158,11,0.05)",
    alignItems: "center", justifyContent: "center",
  },
  innerRing: {
    width: 66, height: 66, borderRadius: 33,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.35)",
    backgroundColor: "rgba(245,158,11,0.1)",
    alignItems: "center", justifyContent: "center",
  },

  textGroup: { alignItems: "center", gap: 8, paddingHorizontal: 28 },
  title:     { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle:  { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },

  countdownGroup: { alignItems: "center", gap: 8 },
  countdownRing: {
    width: 68, height: 68, borderRadius: 34,
    borderWidth: 2, borderColor: AMBER,
    backgroundColor: "rgba(245,158,11,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  countdownNum:  { fontSize: 30, fontFamily: "Inter_700Bold", color: AMBER },
  countdownHint: { fontSize: 13, fontFamily: "Inter_400Regular" },

  actions: { width: "100%", paddingHorizontal: 20, gap: 10 },
  proceedBtn: {
    width: "100%", flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1,
  },
  proceedBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cancelBtn: {
    width: "100%", flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8, paddingVertical: 15,
    borderRadius: 16, backgroundColor: AMBER,
  },
  cancelBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#000" },
});
