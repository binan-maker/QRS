import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface SafetyWarningCardProps {
  riskLevel: "caution" | "dangerous";
  warnings: string[];
}

export default function SafetyWarningCard({ riskLevel, warnings }: SafetyWarningCardProps) {
  const isDangerous = riskLevel === "dangerous";
  const color = isDangerous ? Colors.dark.danger : Colors.dark.warning;
  const bg = isDangerous ? Colors.dark.dangerDim : Colors.dark.warningDim;
  const icon = isDangerous ? "warning" : "alert-circle";
  const title = isDangerous ? "⚠ Suspicious URL Detected" : "⚠ Caution";

  return (
    <View style={[styles.card, { borderColor: color, backgroundColor: bg }]}>
      <View style={styles.header}>
        <Ionicons name={icon as any} size={22} color={color} />
        <Text style={[styles.title, { color }]}>{title}</Text>
      </View>
      {warnings.map((w, i) => (
        <View key={i} style={styles.row}>
          <Ionicons name="ellipse" size={6} color={color} style={{ marginTop: 5 }} />
          <Text style={styles.text}>{w}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, gap: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 14, fontFamily: "Inter_700Bold", flex: 1 },
  row: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  text: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.text, lineHeight: 18 },
});
