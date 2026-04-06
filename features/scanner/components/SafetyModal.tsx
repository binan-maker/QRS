import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Reanimated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { getScamTypeLabel, getConfidenceLevel } from "@/lib/security/scam-detector";

interface Props {
  visible: boolean;
  warnings: string[];
  riskLevel: "caution" | "dangerous";
  riskScore?: number;
  scamDetails?: any;
  onProceed: () => void;
  onBack: () => void;
}

export default function SafetyModal({ visible, warnings, riskLevel, riskScore = 0, scamDetails, onProceed, onBack }: Props) {
  const { colors } = useTheme();
  if (!visible) return null;

  const isDangerous = riskLevel === "dangerous";
  const accentColor = isDangerous ? "#EF4444" : "#F59E0B";
  const accentDim = isDangerous ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)";
  const accentBorder = isDangerous ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)";

  const headlineText = isDangerous ? "Danger Detected" : "Proceed with Caution";
  const subtitleText = isDangerous
    ? "This QR code has been flagged as potentially dangerous. We strongly recommend not proceeding."
    : "This link may not be secure. Verify the source before you proceed.";

  const displayWarnings = warnings.length > 0
    ? warnings
    : ["This link uses HTTP instead of HTTPS — your connection may not be encrypted."];

  // Get scam type label if available
  const scamTypeLabel = scamDetails?.scamType ? getScamTypeLabel(scamDetails.scamType) : null;
  const confidenceLevel = scamDetails?.confidence ? getConfidenceLevel(scamDetails.confidence) : null;

  return (
    <View style={styles.overlay}>
      <Reanimated.View
        entering={FadeInDown.duration(380).springify()}
        style={[styles.sheet, { backgroundColor: colors.surface, borderColor: accentBorder }]}
      >
        {/* Glow accent at top */}
        <View style={[styles.accentStripe, { backgroundColor: accentColor }]} />

        {/* Icon */}
        <Reanimated.View entering={FadeIn.duration(400).delay(100)} style={styles.iconGroup}>
          <View style={[styles.iconOuterRing, { borderColor: accentBorder, backgroundColor: accentDim }]}>
            <View style={[styles.iconInnerRing, { borderColor: accentColor + "40", backgroundColor: accentDim }]}>
              <Ionicons
                name={isDangerous ? "warning" : "alert-circle"}
                size={36}
                color={accentColor}
              />
            </View>
          </View>
        </Reanimated.View>

        {/* Text */}
        <View style={styles.textGroup}>
          <Text style={[styles.eyebrow, { color: accentColor }]}>
            {isDangerous ? "SECURITY ALERT" : "SECURITY WARNING"}
          </Text>
          <Text style={styles.title}>{headlineText}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitleText}</Text>
        </View>

        {/* Warning items */}
        <View style={[styles.warningBox, { backgroundColor: accentDim, borderColor: accentBorder }]}>
          {displayWarnings.map((w, i) => (
            <View key={i} style={styles.warningRow}>
              <Ionicons name="alert-circle" size={14} color={accentColor} style={{ flexShrink: 0, marginTop: 1 }} />
              <Text style={[styles.warningText, { color: accentColor }]}>{w}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.safeBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 }]}
          >
            <MaterialCommunityIcons name="shield-check" size={18} color="#fff" />
            <Text style={styles.safeBtnText}>Take Me to Safety</Text>
          </Pressable>

          <Pressable
            onPress={onProceed}
            style={({ pressed }) => [styles.proceedBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.proceedBtnText, { color: colors.textMuted }]}>
              {isDangerous ? "Ignore Warning & Proceed" : "I Understand, Proceed"}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Bottom note */}
        <View style={styles.bottomNote}>
          <MaterialCommunityIcons name="shield-check" size={11} color="rgba(0,212,255,0.35)" />
          <Text style={styles.bottomNoteText}>Security analysis by QR Guard</Text>
        </View>
      </Reanimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.88)",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sheet: {
    borderRadius: 28,
    alignItems: "center",
    borderWidth: 1,
    width: "100%",
    overflow: "hidden",
    gap: 20,
    paddingBottom: 28,
  },
  accentStripe: {
    width: "100%",
    height: 3,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  iconGroup: {
    alignItems: "center",
    marginTop: 20,
  },
  iconOuterRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconInnerRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  textGroup: { alignItems: "center", gap: 8, paddingHorizontal: 24 },
  eyebrow: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2.5,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
  },

  warningBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    alignSelf: "stretch",
    marginHorizontal: 20,
  },
  warningRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  warningText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 19,
    flex: 1,
  },

  actions: { width: "100%", paddingHorizontal: 20, gap: 10 },
  safeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 16,
  },
  safeBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  proceedBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  proceedBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },

  bottomNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  bottomNoteText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(0,212,255,0.35)",
    letterSpacing: 0.3,
  },
});
