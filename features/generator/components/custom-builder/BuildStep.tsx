import Reanimated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { parseTemplateTokens } from "@/features/generator/data/starter-templates";
import type { AppColors } from "@/shared/constants/colors";
import type {
  CustomField, FieldType,
} from "@/features/generator/data/starter-templates";

interface FieldTypeDef {
  value: FieldType;
  label: string;
  icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
  color: string;
  desc: string;
}

interface Props {
  colors: AppColors;
  templateName: string;
  setTemplateName: (v: string) => void;
  outputTemplate: string;
  setOutputTemplate: (v: string) => void;
  fields: CustomField[];
  missingKeys: string[];
  canProceed: boolean;
  FIELD_TYPES: FieldTypeDef[];
  FIELD_TYPE_MAP: Record<string, FieldTypeDef>;
  addField: () => void;
  removeField: (id: string) => void;
  updateField: (id: string, patch: Partial<CustomField>) => void;
  goToFill: () => void;
}

export function BuildStep({
  colors, templateName, setTemplateName,
  outputTemplate, setOutputTemplate,
  fields, missingKeys, canProceed,
  FIELD_TYPES, FIELD_TYPE_MAP,
  addField, removeField, updateField, goToFill,
}: Props) {
  return (
    <Reanimated.View entering={FadeInUp.duration(220)} style={{ gap: 14 }}>
      <View>
        <Text style={[ss.label, { color: colors.textMuted }]}>TEMPLATE NAME</Text>
        <View style={[ss.inputCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Ionicons name="bookmark-outline" size={15} color={colors.textMuted} />
          <TextInput
            style={[ss.inputText, { color: colors.text, flex: 1 }]}
            value={templateName}
            onChangeText={setTemplateName}
            placeholder="e.g. My Payment QR"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>

      <View>
        <View style={ss.rowBetween}>
          <Text style={[ss.label, { color: colors.textMuted }]}>YOUR FIELDS</Text>
          <Pressable onPress={addField} style={[ss.addBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}>
            <Ionicons name="add" size={13} color={colors.primary} />
            <Text style={[ss.addBtnText, { color: colors.primary }]}>Add Field</Text>
          </Pressable>
        </View>
        <Text style={[ss.helperText, { color: colors.textMuted }]}>
          Each field becomes a <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{"{{key}}"}</Text> placeholder you can use in the output below.
        </Text>

        {fields.map((f, i) => (
          <Reanimated.View key={f.id} entering={FadeInDown.duration(180)} style={[ss.fieldCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <View style={ss.fieldCardTop}>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={[ss.fieldNameInput, { color: colors.text, borderBottomColor: colors.surfaceBorder }]}
                  value={f.label}
                  onChangeText={v => updateField(f.id, { label: v })}
                  placeholder={`Field ${i + 1} name`}
                  placeholderTextColor={colors.textMuted}
                  selectTextOnFocus
                />
              </View>
              {fields.length > 1 && (
                <Pressable onPress={() => removeField(f.id)} hitSlop={10}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger + "CC"} />
                </Pressable>
              )}
            </View>

            <View style={[ss.keyBadge, { backgroundColor: colors.primary + "12" }]}>
              <Ionicons name="code-slash-outline" size={11} color={colors.primary} />
              <Text style={[ss.keyBadgeText, { color: colors.primary }]}>{"{{" + (f.key || "key") + "}}"}</Text>
              <Text style={[ss.keyBadgeHint, { color: colors.primary + "80" }]}>— use this in the output</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {FIELD_TYPES.map(t => {
                  const sel = f.type === t.value;
                  return (
                    <Pressable
                      key={t.value}
                      onPress={() => updateField(f.id, { type: t.value })}
                      style={[ss.typeChip, { backgroundColor: sel ? t.color + "18" : colors.surfaceLight, borderColor: sel ? t.color + "60" : "transparent", borderWidth: sel ? 1 : 0 }]}
                    >
                      <Ionicons name={t.icon} size={11} color={sel ? t.color : colors.textMuted} />
                      <Text style={[ss.typeChipText, { color: sel ? t.color : colors.textMuted }]}>{t.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {f.type && (
              <Text style={[ss.typeDesc, { color: colors.textMuted }]}>{FIELD_TYPE_MAP[f.type]?.desc}</Text>
            )}
          </Reanimated.View>
        ))}
      </View>

      <View>
        <Text style={[ss.label, { color: colors.textMuted }]}>OUTPUT TEMPLATE</Text>
        <Text style={[ss.helperText, { color: colors.textMuted }]}>
          Write the final QR content. Use{" "}
          <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{"{{field_name}}"}</Text>
          {" "}anywhere to insert a field's value.
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: "row", gap: 6, paddingVertical: 2 }}>
            {fields.map(f => {
              const ft = FIELD_TYPE_MAP[f.type];
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setOutputTemplate(outputTemplate + `{{${f.key}}}`)}
                  style={[ss.keyInsertChip, { backgroundColor: (ft?.color ?? colors.primary) + "15", borderColor: (ft?.color ?? colors.primary) + "40" }]}
                >
                  <Text style={[ss.keyInsertText, { color: ft?.color ?? colors.primary }]}>+{"{{" + f.key + "}}"}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={[ss.templateInputCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <TextInput
            style={[ss.templateInput, { color: colors.text }]}
            value={outputTemplate}
            onChangeText={setOutputTemplate}
            placeholder={"e.g. https://yoursite.com?table={{table}}&code={{code}}"}
            placeholderTextColor={colors.textMuted}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {missingKeys.length > 0 && (
          <Reanimated.View entering={FadeIn.duration(160)}>
            <View style={[ss.warnCard, { backgroundColor: colors.danger + "12", borderColor: colors.danger + "35" }]}>
              <Ionicons name="warning-outline" size={14} color={colors.danger} />
              <Text style={[ss.warnText, { color: colors.danger }]}>
                Unknown keys: {missingKeys.map(k => `{{${k}}}`).join(", ")} — add matching fields above or fix the spelling.
              </Text>
            </View>
          </Reanimated.View>
        )}

        {outputTemplate.length > 0 && missingKeys.length === 0 && (
          <Reanimated.View entering={FadeIn.duration(200)}>
            <View style={[ss.previewCard, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "28" }]}>
              <View style={ss.previewHeader}>
                <Ionicons name="eye-outline" size={13} color={colors.primary} />
                <Text style={[ss.previewLabel, { color: colors.primary }]}>Template Preview</Text>
              </View>
              <Text style={{ flexWrap: "wrap" }} numberOfLines={5}>
                {parseTemplateTokens(outputTemplate, fields, colors)}
              </Text>
              <Text style={[ss.previewHint, { color: colors.primary + "80" }]}>
                Coloured tokens = your fields. Grey text = fixed content.
              </Text>
            </View>
          </Reanimated.View>
        )}
      </View>

      <Pressable
        onPress={goToFill}
        disabled={!canProceed}
        style={({ pressed }) => [ss.proceedBtn, { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      >
        <LinearGradient
          colors={canProceed ? [colors.primary, colors.primaryShade ?? colors.primary] : [colors.surfaceLight, colors.surfaceLight]}
          style={ss.proceedBtnInner}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          <Text style={[ss.proceedBtnText, { color: canProceed ? "#fff" : colors.textMuted }]}>Fill in Values</Text>
          <Ionicons name="arrow-forward" size={16} color={canProceed ? "#fff" : colors.textMuted} />
        </LinearGradient>
      </Pressable>
    </Reanimated.View>
  );
}

const ss = StyleSheet.create({
  label: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.7, marginBottom: 6 },
  helperText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17, marginBottom: 10 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 9, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  addBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  inputCard: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11 },
  inputText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  fieldCard: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8, gap: 6 },
  fieldCardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  fieldNameInput: { fontSize: 14, fontFamily: "Inter_600SemiBold", borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 4 },
  keyBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: "flex-start" },
  keyBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  keyBadgeHint: { fontSize: 10, fontFamily: "Inter_400Regular" },
  typeChip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  typeChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  typeDesc: { fontSize: 10.5, fontFamily: "Inter_400Regular", marginTop: 2 },
  keyInsertChip: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  keyInsertText: { fontSize: 11.5, fontFamily: "Inter_700Bold" },
  templateInputCard: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8 },
  templateInput: { fontSize: 13, fontFamily: "Inter_400Regular", minHeight: 72, textAlignVertical: "top", lineHeight: 20 },
  warnCard: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 8 },
  warnText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  previewCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8, marginBottom: 4 },
  previewHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  previewLabel: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.6 },
  previewHint: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 4 },
  proceedBtn: { borderRadius: 16, overflow: "hidden", marginTop: 4 },
  proceedBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  proceedBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
