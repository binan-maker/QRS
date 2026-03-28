import { View, Text, StyleSheet, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { QR_PRESETS } from "@/features/generator/data/presets";
import { filterByKeyboardType } from "@/features/generator/data/qr-builder";

interface Props {
  selectedPreset: number;
  inputValue: string;
  extraFields: Record<string, string>;
  qrMode: "individual" | "business" | "private";
  isBranded: boolean;
  setInputValue: (v: string) => void;
  setExtraField: (key: string, val: string) => void;
}

export default function InputSection({
  selectedPreset, inputValue, extraFields, qrMode, isBranded,
  setInputValue, setExtraField,
}: Props) {
  const { colors } = useTheme();
  const preset = QR_PRESETS[selectedPreset];
  const isBusinessMode = qrMode === "business" && isBranded;

  return (
    <>
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
        {isBusinessMode ? "Destination URL" : preset.label}
      </Text>

      <View style={[styles.inputCard, { backgroundColor: colors.inputBackground, borderColor: colors.surfaceBorder }]}>
        <TextInput
          style={[styles.textInput, { color: colors.text }]}
          value={inputValue}
          onChangeText={(t) => {
            const kt = isBusinessMode ? "url" : preset.keyboardType;
            setInputValue(filterByKeyboardType(t, kt));
          }}
          placeholder={isBusinessMode ? "https://your-website.com" : selectedPreset === 9 ? "Full Name" : preset.placeholder}
          placeholderTextColor={colors.textMuted}
          multiline={preset.multiline && !preset.extraFields}
          maxLength={500}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={isBusinessMode ? "url" : preset.keyboardType}
        />
        {inputValue.length > 0 && (
          <Pressable onPress={() => setInputValue("")} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {qrMode !== "business" && preset.extraFields?.map((field) => (
        <View key={field.key} style={[styles.inputCard, { marginTop: 10, backgroundColor: colors.inputBackground, borderColor: colors.surfaceBorder }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.extraFieldLabel, { color: colors.textMuted }]}>{field.label}{field.optional ? "" : " *"}</Text>
            <TextInput
              style={[styles.textInput, { minHeight: 36, color: colors.text }]}
              value={extraFields[field.key] ?? ""}
              onChangeText={(t) => setExtraField(field.key, filterByKeyboardType(t, field.keyboardType ?? "default"))}
              placeholder={field.placeholder}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={field.keyboardType ?? "default"}
              secureTextEntry={field.secureText}
            />
          </View>
        </View>
      ))}

      <Text style={[styles.charCount, { color: colors.textMuted }]}>{inputValue.length}/500</Text>
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12, fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10,
  },
  inputCard: {
    borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: "row", alignItems: "flex-start", marginBottom: 4,
  },
  textInput: {
    flex: 1, fontSize: 13, fontFamily: "Inter_400Regular",
    minHeight: 40, maxHeight: 120,
  },
  extraFieldLabel: {
    fontSize: 12, fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4,
  },
  clearBtn: { padding: 4, marginTop: 4 },
  charCount: { fontSize: 12, textAlign: "right", marginBottom: 16 },
});
