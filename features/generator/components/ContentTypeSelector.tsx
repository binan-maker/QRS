import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { QR_PRESETS } from "@/features/generator/data/presets";

interface Props {
  selectedPreset: number;
  onSelect: (idx: number) => void;
}

export default function ContentTypeSelector({ selectedPreset, onSelect }: Props) {
  const preset = QR_PRESETS[selectedPreset];
  return (
    <>
      <Text style={styles.sectionLabel}>Content Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
        <View style={styles.presetRow}>
          {QR_PRESETS.map((p, idx) => (
            <Pressable
              key={idx}
              onPress={() => onSelect(idx)}
              style={[styles.presetBtn, selectedPreset === idx && styles.presetBtnActive]}
            >
              <Ionicons name={p.icon as any} size={16} color={selectedPreset === idx ? Colors.dark.primary : Colors.dark.textMuted} />
              <Text style={[styles.presetBtnText, selectedPreset === idx && styles.presetBtnTextActive]}>{p.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      {preset.hint && (
        <View style={styles.hintBanner}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.dark.primary} />
          <Text style={styles.hintText}>{preset.hint}</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.dark.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10,
  },
  presetRow: { flexDirection: "row", gap: 8, paddingRight: 4 },
  presetBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  presetBtnActive: { backgroundColor: Colors.dark.primaryDim, borderColor: Colors.dark.primary },
  presetBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.textMuted },
  presetBtnTextActive: { color: Colors.dark.primary },
  hintBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.dark.primaryDim, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: Colors.dark.primary + "30", marginBottom: 12,
  },
  hintText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.primary },
});
