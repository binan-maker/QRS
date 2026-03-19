import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";

interface Props {
  visible: boolean;
  ownerName: string;
}

export default function VerifiedModal({ visible, ownerName }: Props) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Reanimated.View entering={FadeInDown.duration(350)} style={styles.sheet}>
        <View style={styles.iconRing}>
          <Ionicons name="shield-checkmark" size={40} color={Colors.dark.safe} />
        </View>
        <Text style={styles.title}>Verified QR Code</Text>
        <Text style={styles.subtitle}>
          This QR code was verified as created by{" "}
          <Text style={styles.ownerName}>{ownerName}</Text> using QR Guard's cryptographic signature system.
        </Text>
        <Text style={styles.redirectText}>Redirecting to details…</Text>
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
    borderColor: Colors.dark.safe + "40",
    width: "100%",
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dark.safeDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.safe,
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
  },
  ownerName: {
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
  },
  redirectText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
});
