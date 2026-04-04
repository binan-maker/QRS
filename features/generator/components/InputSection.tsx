import { View, Text, StyleSheet, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { QR_PRESETS } from "@/features/generator/data/presets";
import { filterByKeyboardType } from "@/features/generator/data/qr-builder";
import { BUSINESS_CATEGORIES, type BusinessCategory } from "@/features/generator/components/BusinessTypeSelector";

interface BusinessExtraField {
  key: string;
  label: string;
  placeholder: string;
  keyboard: "default" | "url" | "phone-pad" | "decimal-pad";
  optional?: boolean;
  multiline?: boolean;
}

const BUSINESS_EXTRA_FIELDS: Record<BusinessCategory, BusinessExtraField[]> = {
  dynamic: [],
  smartmenu: [
    { key: "hours", label: "Business Hours (optional)", placeholder: "Mon–Fri 9am–9pm, Sat–Sun 10am–6pm", keyboard: "default", optional: true, multiline: true },
  ],
  review: [
    { key: "thankyou", label: "Thank-you message (optional)", placeholder: "Thank you for your feedback! It means a lot to us.", keyboard: "default", optional: true },
  ],
  whatsapp: [
    { key: "message", label: "Pre-filled message (optional)", placeholder: "Hi, I need help with my order from [Store Name].", keyboard: "default", optional: true },
  ],
  event: [
    { key: "date", label: "Date & Time (YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS)", placeholder: "20260601T180000/20260601T210000", keyboard: "default" },
    { key: "location", label: "Location / Google Maps link (optional)", placeholder: "https://maps.google.com/?q=...", keyboard: "url", optional: true },
    { key: "description", label: "Description (optional)", placeholder: "Join us for an exclusive grand opening event!", keyboard: "default", optional: true, multiline: true },
  ],
};

interface Props {
  selectedPreset: number;
  inputValue: string;
  extraFields: Record<string, string>;
  qrMode: "individual" | "business" | "private";
  isBranded: boolean;
  businessCategory?: BusinessCategory;
  setInputValue: (v: string) => void;
  setExtraField: (key: string, val: string) => void;
}

export default function InputSection({
  selectedPreset, inputValue, extraFields, qrMode, isBranded,
  businessCategory = "dynamic",
  setInputValue, setExtraField,
}: Props) {
  const { colors } = useTheme();
  const preset = QR_PRESETS[selectedPreset];
  const isBusinessMode = qrMode === "business" && isBranded;

  const bizCatDef = BUSINESS_CATEGORIES.find((c) => c.key === businessCategory) ?? BUSINESS_CATEGORIES[0];
  const bizExtraFields = BUSINESS_EXTRA_FIELDS[businessCategory] ?? [];

  return (
    <>
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
        {isBusinessMode ? bizCatDef.inputLabel : preset.label}
      </Text>

      <View style={[styles.inputCard, { backgroundColor: colors.inputBackground, borderColor: colors.surfaceBorder }]}>
        <TextInput
          style={[styles.textInput, { color: colors.text }]}
          value={inputValue}
          onChangeText={(t) => {
            const kt = isBusinessMode ? bizCatDef.inputKeyboard : preset.keyboardType;
            setInputValue(filterByKeyboardType(t, kt));
          }}
          placeholder={isBusinessMode ? bizCatDef.inputPlaceholder : preset.placeholder}
          placeholderTextColor={colors.textMuted}
          multiline={!isBusinessMode && preset.multiline && !preset.extraFields}
          maxLength={500}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={isBusinessMode ? bizCatDef.inputKeyboard : preset.keyboardType}
        />
        {inputValue.length > 0 && (
          <Pressable onPress={() => setInputValue("")} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {isBusinessMode && bizExtraFields.map((field) => (
        <View key={field.key} style={[styles.inputCard, { marginTop: 10, backgroundColor: colors.inputBackground, borderColor: colors.surfaceBorder }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.extraFieldLabel, { color: colors.textMuted }]}>
              {field.label}{field.optional ? "" : " *"}
            </Text>
            <TextInput
              style={[styles.textInput, { minHeight: 36, color: colors.text }]}
              value={extraFields[field.key] ?? ""}
              onChangeText={(t) => setExtraField(field.key, t)}
              placeholder={field.placeholder}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={field.keyboard}
              multiline={field.multiline}
            />
          </View>
        </View>
      ))}

      {!isBusinessMode && preset.extraFields?.map((field) => (
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
