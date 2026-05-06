import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { QR_PRESETS } from "@/features/generator/data/presets";

interface Props {
  selectedPreset: number;
  detectedType: string | null;
  onOpenTemplates: () => void;
  onClearTemplate: () => void;
}

export default function SmartTemplateBar({ selectedPreset, detectedType, onOpenTemplates, onClearTemplate }: Props) {
  const { colors } = useTheme();
  const isTemplate = selectedPreset > 0;
  const preset = QR_PRESETS[selectedPreset];

  return (
    <View style={styles.row}>
      {isTemplate ? (
        <View style={[styles.chip, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "50" }]}>
          <Ionicons name={preset.icon as any} size={13} color={colors.primary} />
          <Text style={[styles.chipText, { color: colors.primary }]} numberOfLines={1}>
            {preset.label} template
          </Text>
          <Pressable onPress={onClearTemplate} hitSlop={10} style={styles.chipClose}>
            <Ionicons name="close-circle" size={16} color={colors.primary} />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.chip, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
          <View style={[styles.dot, { backgroundColor: detectedType ? colors.safe : colors.textMuted }]} />
          <Text style={[styles.autoText, { color: colors.textSecondary }]} numberOfLines={1}>
            {detectedType ? `Detected: ${detectedType}` : "Smart auto-detect"}
          </Text>
        </View>
      )}

      <Pressable
        onPress={onOpenTemplates}
        style={({ pressed }) => [
          styles.templatesBtn,
          {
            backgroundColor: colors.surface,
            borderColor: colors.surfaceBorder,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Ionicons name="apps-outline" size={14} color={colors.textSecondary} />
        <Text style={[styles.templatesBtnText, { color: colors.textSecondary }]}>Templates</Text>
        <Ionicons name="chevron-down" size={11} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  autoText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  chipClose: {
    marginLeft: 2,
  },
  templatesBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
  },
  templatesBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
