import { View, Text, StyleSheet, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
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
  const preset = QR_PRESETS[selectedPreset];
  const isBusinessMode = qrMode === "business" && isBranded;

  return (
    <>
      <Text style={styles.sectionLabel}>
        {isBusinessMode ? "Destination URL" : preset.label}
      </Text>

      <View style={styles.inputCard}>
        <TextInput
          style={styles.textInput}
          value={inputValue}
          onChangeText={(t) => {
            const kt = isBusinessMode ? "url" : preset.keyboardType;
            setInputValue(filterByKeyboardType(t, kt));
          }}
          placeholder={isBusinessMode ? "https://your-website.com" : selectedPreset === 9 ? "Full Name" : preset.placeholder}
          placeholderTextColor={Colors.dark.textMuted}
          multiline={preset.multiline && !preset.extraFields}
          maxLength={500}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={isBusinessMode ? "url" : preset.keyboardType}
        />
        {inputValue.length > 0 && (
          <Pressable onPress={() => setInputValue("")} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={20} color={Colors.dark.textMuted} />
          </Pressable>
        )}
      </View>

      {qrMode !== "business" && preset.extraFields?.map((field) => (
        <View key={field.key} style={[styles.inputCard, { marginTop: 10 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.extraFieldLabel}>{field.label}{field.optional ? "" : " *"}</Text>
            <TextInput
              style={[styles.textInput, { minHeight: 36 }]}
              value={extraFields[field.key] ?? ""}
              onChangeText={(t) => setExtraField(field.key, filterByKeyboardType(t, field.keyboardType ?? "default"))}
              placeholder={field.placeholder}
              placeholderTextColor={Colors.dark.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={field.keyboardType ?? "default"}
              secureTextEntry={field.secureText}
            />
          </View>
        </View>
      ))}

      <Text style={styles.charCount}>{inputValue.length}/500</Text>
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.dark.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10,
  },
  inputCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: "row", alignItems: "flex-start", marginBottom: 4,
  },
  textInput: {
    flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.dark.text,
    minHeight: 48, maxHeight: 120,
  },
  extraFieldLabel: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.dark.textMuted,
    textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4,
  },
  clearBtn: { padding: 4, marginTop: 4 },
  charCount: { fontSize: 11, color: Colors.dark.textMuted, textAlign: "right", marginBottom: 16 },
});
