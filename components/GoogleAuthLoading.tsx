import { View, Text, Modal, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import GoogleIcon from "@/components/GoogleIcon";

interface Props {
  visible: boolean;
}

export default function GoogleAuthLoading({ visible }: Props) {
  const { colors, isDark } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[
          styles.card,
          {
            backgroundColor: isDark ? colors.surface : "#fff",
            shadowColor: isDark ? "#000" : "#1a1a2e",
          },
        ]}>
          <View style={styles.logoRow}>
            <LinearGradient
              colors={[colors.primary, colors.primaryShade ?? colors.primary]}
              style={styles.appIconWrap}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="shield-checkmark" size={22} color="#fff" />
            </LinearGradient>

            <View style={styles.connectorLine}>
              <View style={[styles.dot, { backgroundColor: colors.primary + "60" }]} />
              <View style={[styles.dot, { backgroundColor: colors.primary + "40" }]} />
              <View style={[styles.dot, { backgroundColor: colors.primary + "20" }]} />
            </View>

            <View style={[styles.googleIconWrap, { backgroundColor: isDark ? colors.surfaceLight : "#f8f9fa", borderColor: isDark ? colors.surfaceBorder : "#e8eaed" }]}>
              <GoogleIcon size={24} />
            </View>
          </View>

          <View style={styles.spinnerWrap}>
            <ActivityIndicator color={colors.primary} size="small" />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            Connecting to Google
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Please wait a moment…
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.38)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    maxWidth: 300,
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: "center",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 12,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
  },
  appIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  connectorLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  googleIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  spinnerWrap: {
    marginBottom: 16,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 5,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
  },
});
