import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";

export default function CharityDonationSection() {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Ionicons name="heart-outline" size={40} color={colors.textMuted} />
      <Text style={[styles.title, { color: colors.text }]}>Support BinRo</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>
        Donation support is coming soon. Thank you for your support!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
