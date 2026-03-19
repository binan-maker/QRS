import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";

interface Props {
  visible: boolean;
  warnings: string[];
  riskLevel: "caution" | "dangerous";
  onProceed: () => void;
  onBack: () => void;
}

export default function SafetyModal({ visible, onProceed, onBack }: Props) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Reanimated.View entering={FadeInDown.duration(380)} style={styles.sheet}>
        <View style={styles.badge}>
          <Ionicons name="warning-outline" size={36} color={Colors.dark.warning} />
        </View>
        <Text style={styles.title}>Proceed with Caution</Text>
        <Text style={styles.subtitle}>
          This link uses HTTP instead of HTTPS — your connection may not be encrypted. Verify the source before proceeding.
        </Text>

        <Pressable onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={18} color="#000" />
          <Text style={styles.backBtnText}>Go Back to Safety</Text>
        </Pressable>
        <Pressable onPress={onProceed} style={styles.proceedBtn}>
          <Text style={styles.proceedBtnText}>I Understand, Proceed</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.dark.textMuted} />
        </Pressable>
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
    marginBottom: 16,
    backgroundColor: "rgba(245,158,11,0.12)",
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
    textAlign: "center",
    color: Colors.dark.warning,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.dark.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 10,
    width: "100%",
    justifyContent: "center",
  },
  backBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#000",
  },
  proceedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: "center",
    width: "100%",
  },
  proceedBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textMuted,
  },
});
