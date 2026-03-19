import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  visible: boolean;
  ownerName: string;
}

export default function VerifiedModal({ visible, ownerName }: Props) {
  const { colors } = useTheme();
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Reanimated.View entering={FadeInDown.duration(350)} style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.safe + "40" }]}>
        <View style={[styles.iconRing, { backgroundColor: colors.safeDim }]}>
          <Ionicons name="shield-checkmark" size={40} color={colors.safe} />
        </View>
        <Text style={[styles.title, { color: colors.safe }]}>Verified QR Code</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          This QR code was verified as created by{" "}
          <Text style={[styles.ownerName, { color: colors.text }]}>{ownerName}</Text> using QR Guard's cryptographic signature system.
        </Text>
        <Text style={[styles.redirectText, { color: colors.textMuted }]}>Redirecting to details…</Text>
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
    borderRadius: 24, padding: 28, alignItems: "center",
    borderWidth: 1, width: "100%",
  },
  iconRing: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 10, textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, marginBottom: 16 },
  ownerName: { fontFamily: "Inter_700Bold" },
  redirectText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
