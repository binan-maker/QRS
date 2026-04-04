import { View, Text, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Reanimated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";

const SAFE_COLOR = "#22C55E";

interface Props {
  visible: boolean;
  ownerName: string;
}

export default function VerifiedModal({ visible, ownerName }: Props) {
  const { colors } = useTheme();
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Reanimated.View
        entering={FadeInDown.duration(380).springify()}
        style={[styles.sheet, { backgroundColor: colors.surface }]}
      >
        {/* Accent top stripe */}
        <View style={styles.accentStripe} />

        {/* Icon */}
        <Reanimated.View entering={FadeIn.duration(500).delay(120)} style={styles.iconGroup}>
          <View style={styles.iconOuterRing}>
            <View style={styles.iconInnerRing}>
              <View style={styles.iconCore}>
                <Ionicons name="shield-checkmark" size={36} color={SAFE_COLOR} />
              </View>
            </View>
          </View>
          {/* Check badge */}
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={14} color="#000" />
          </View>
        </Reanimated.View>

        {/* Text */}
        <View style={styles.textGroup}>
          <Text style={styles.eyebrow}>IDENTITY VERIFIED</Text>
          <Text style={styles.title}>Verified QR Code</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            This QR code was cryptographically signed and verified as created by{" "}
            <Text style={styles.ownerName}>{ownerName}</Text>
            {" "}using QR Guard's security system.
          </Text>
        </View>

        {/* Trust badge row */}
        <View style={styles.trustBadges}>
          <View style={styles.trustBadge}>
            <Ionicons name="lock-closed" size={12} color={SAFE_COLOR} />
            <Text style={styles.trustBadgeText}>Encrypted</Text>
          </View>
          <View style={styles.trustBadgeDivider} />
          <View style={styles.trustBadge}>
            <MaterialCommunityIcons name="shield-check" size={12} color={SAFE_COLOR} />
            <Text style={styles.trustBadgeText}>Authenticated</Text>
          </View>
          <View style={styles.trustBadgeDivider} />
          <View style={styles.trustBadge}>
            <Ionicons name="checkmark-circle" size={12} color={SAFE_COLOR} />
            <Text style={styles.trustBadgeText}>Safe</Text>
          </View>
        </View>

        {/* Redirect note */}
        <View style={styles.redirectRow}>
          <View style={styles.redirectDot} />
          <Text style={[styles.redirectText, { color: colors.textMuted }]}>
            Redirecting to full details…
          </Text>
        </View>

        {/* Bottom mark */}
        <View style={styles.bottomMark}>
          <MaterialCommunityIcons name="shield-check" size={11} color="rgba(0,212,255,0.35)" />
          <Text style={styles.bottomMarkText}>Verified by QR Guard AI</Text>
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
    borderColor: "rgba(34,197,94,0.3)",
    width: "100%",
    overflow: "hidden",
    gap: 20,
    paddingBottom: 28,
  },
  accentStripe: {
    width: "100%",
    height: 3,
    backgroundColor: SAFE_COLOR,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  iconGroup: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  iconOuterRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.2)",
    backgroundColor: "rgba(34,197,94,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconInnerRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
    backgroundColor: "rgba(34,197,94,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCore: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(34,197,94,0.14)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.45)",
  },
  checkBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: SAFE_COLOR,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(16,25,41,0.98)",
  },

  textGroup: { alignItems: "center", gap: 8, paddingHorizontal: 24 },
  eyebrow: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: SAFE_COLOR,
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
  ownerName: {
    fontFamily: "Inter_700Bold",
    color: SAFE_COLOR,
  },

  trustBadges: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34,197,94,0.07)",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.2)",
    gap: 12,
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  trustBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: SAFE_COLOR,
  },
  trustBadgeDivider: {
    width: 1,
    height: 14,
    backgroundColor: "rgba(34,197,94,0.2)",
  },

  redirectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  redirectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SAFE_COLOR,
    opacity: 0.7,
  },
  redirectText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },

  bottomMark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  bottomMarkText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(0,212,255,0.35)",
    letterSpacing: 0.3,
  },
});
