import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { QR_PRESETS } from "@/features/generator/data/presets";

interface Props {
  selectedPreset: number;
  onSelect: (idx: number) => void;
}

export default function ContentTypeSelector({ selectedPreset, onSelect }: Props) {
  const { colors } = useTheme();
  const preset = QR_PRESETS[selectedPreset];

  return (
    <>
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>Content Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
        <View style={styles.presetRow}>
          {QR_PRESETS.map((p, idx) => (
            <Pressable
              key={idx}
              onPress={() => onSelect(idx)}
              style={[
                styles.presetBtn,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                selectedPreset === idx && { backgroundColor: colors.primaryDim, borderColor: colors.primary },
              ]}
            >
              <Ionicons name={p.icon as any} size={16} color={selectedPreset === idx ? colors.primary : colors.textMuted} />
              <Text style={[styles.presetBtnText, { color: selectedPreset === idx ? colors.primary : colors.textMuted }]} maxFontSizeMultiplier={1}>{p.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      {preset.hint && (
        <View style={[styles.hintBanner, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" }]}>
          <Ionicons name="information-circle-outline" size={14} color={colors.primary} />
          <Text style={[styles.hintText, { color: colors.primary }]} maxFontSizeMultiplier={1}>{preset.hint}</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12, fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10,
  },
  presetRow: { flexDirection: "row", gap: 8, paddingRight: 4 },
  presetBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    borderWidth: 1,
  },
  presetBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  hintBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 10, padding: 10, borderWidth: 1, marginBottom: 12,
  },
  hintText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
});
