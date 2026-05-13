import React, { useState, useCallback, memo, useMemo } from "react";
import {
  View, Text, Pressable, ScrollView, TextInput,
  StyleSheet, Platform, KeyboardAvoidingView,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, { FadeIn, FadeInDown, SlideInRight } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import * as Haptics from "@/lib/haptics";

/* ─────────── types ─────────── */
type FieldType = "text" | "number" | "url" | "phone" | "email" | "amount" | "upi" | "date";

interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder: string;
  optional?: boolean;
}

interface Template {
  id: string;
  emoji: string;
  name: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  build: (vals: Record<string, string>) => string;
  fields: FieldDef[];
}

/* ─────────── templates (output built invisibly) ─────────── */
const TEMPLATES: Template[] = [
  {
    id: "upi",
    emoji: "💳",
    name: "UPI Payment",
    color: "#EC4899",
    icon: "card-outline",
    fields: [
      { key: "pa",  label: "UPI ID",       type: "upi",    placeholder: "yourname@upi" },
      { key: "pn",  label: "Payee Name",   type: "text",   placeholder: "Your name or shop" },
      { key: "am",  label: "Amount (₹)",   type: "amount", placeholder: "Leave blank to let payer decide", optional: true },
      { key: "tn",  label: "Note",         type: "text",   placeholder: "e.g. Table 5 order", optional: true },
    ],
    build: (v) => {
      let url = `upi://pay?pa=${encodeURIComponent(v.pa)}&pn=${encodeURIComponent(v.pn)}&cu=INR`;
      if (v.am) url += `&am=${v.am}`;
      if (v.tn) url += `&tn=${encodeURIComponent(v.tn)}`;
      return url;
    },
  },
  {
    id: "menu",
    emoji: "🍽️",
    name: "Table / Menu",
    color: "#F59E0B",
    icon: "restaurant-outline",
    fields: [
      { key: "url",     label: "Menu Website",  type: "url",    placeholder: "https://yourmenu.com" },
      { key: "table",   label: "Table Number",  type: "number", placeholder: "e.g. 5" },
      { key: "section", label: "Section",       type: "text",   placeholder: "e.g. Ground Floor", optional: true },
    ],
    build: (v) => {
      let url = `${v.url}?table=${encodeURIComponent(v.table)}`;
      if (v.section) url += `&section=${encodeURIComponent(v.section)}`;
      return url;
    },
  },
  {
    id: "event",
    emoji: "🎟️",
    name: "Event Ticket",
    color: "#8B5CF6",
    icon: "ticket-outline",
    fields: [
      { key: "url",    label: "Event Website", type: "url",  placeholder: "https://event.example.com" },
      { key: "name",   label: "Attendee Name", type: "text", placeholder: "Full name" },
      { key: "ticket", label: "Ticket Code",   type: "text", placeholder: "e.g. TKT-001" },
      { key: "gate",   label: "Gate / Hall",   type: "text", placeholder: "e.g. Gate A", optional: true },
    ],
    build: (v) => {
      let url = `${v.url}/entry?name=${encodeURIComponent(v.name)}&ticket=${encodeURIComponent(v.ticket)}`;
      if (v.gate) url += `&gate=${encodeURIComponent(v.gate)}`;
      return url;
    },
  },
  {
    id: "link",
    emoji: "🔗",
    name: "Smart Link",
    color: "#3B82F6",
    icon: "arrow-forward-circle-outline",
    fields: [
      { key: "url",  label: "Website URL",   type: "url",  placeholder: "https://yoursite.com/page" },
      { key: "ref",  label: "Source Tag",    type: "text", placeholder: "e.g. store_entrance", optional: true },
      { key: "code", label: "Promo Code",    type: "text", placeholder: "e.g. SAVE10", optional: true },
    ],
    build: (v) => {
      let url = v.url;
      const params: string[] = [];
      if (v.ref)  params.push(`ref=${encodeURIComponent(v.ref)}`);
      if (v.code) params.push(`code=${encodeURIComponent(v.code)}`);
      if (params.length) url += (url.includes("?") ? "&" : "?") + params.join("&");
      return url;
    },
  },
  {
    id: "feedback",
    emoji: "⭐",
    name: "Feedback",
    color: "#F97316",
    icon: "star-outline",
    fields: [
      { key: "url",      label: "Review URL",  type: "url",  placeholder: "https://yoursite.com/review" },
      { key: "location", label: "Location",    type: "text", placeholder: "e.g. Main Branch" },
      { key: "order",    label: "Order / Table", type: "text", placeholder: "e.g. Table 12", optional: true },
    ],
    build: (v) => {
      let url = `${v.url}?location=${encodeURIComponent(v.location)}`;
      if (v.order) url += `&order=${encodeURIComponent(v.order)}`;
      return url;
    },
  },
  {
    id: "appointment",
    emoji: "📅",
    name: "Appointment",
    color: "#10B981",
    icon: "calendar-outline",
    fields: [
      { key: "url",      label: "Booking URL",     type: "url",  placeholder: "https://booking.example.com" },
      { key: "date",     label: "Date",             type: "date", placeholder: "DD/MM/YYYY" },
      { key: "name",     label: "Patient / Client", type: "text", placeholder: "Full name" },
      { key: "slot",     label: "Time Slot",        type: "text", placeholder: "e.g. 10:30 AM", optional: true },
    ],
    build: (v) => {
      let url = `${v.url}?date=${encodeURIComponent(v.date)}&name=${encodeURIComponent(v.name)}`;
      if (v.slot) url += `&slot=${encodeURIComponent(v.slot)}`;
      return url;
    },
  },
];

/* ─────────── blank field ─────────── */
interface BlankField {
  id: string;
  label: string;
  value: string;
}

function uid() { return Math.random().toString(36).slice(2, 8); }

/* ─────────── keyboard type helper ─────────── */
function kbType(type: FieldType) {
  if (type === "number") return "number-pad" as const;
  if (type === "amount") return "decimal-pad" as const;
  if (type === "phone")  return "phone-pad" as const;
  if (type === "email" || type === "upi") return "email-address" as const;
  if (type === "url")    return "url" as const;
  return "default" as const;
}

/* ─────────── component ─────────── */
interface Props {
  onBack: () => void;
  onGenerate: (content: string, label: string) => void;
}

function CustomQrBuilderPage({ onBack, onGenerate }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBarHeight = 62 + insets.bottom + 8;

  const [selectedTemplate, setSelectedTemplate] = useState<Template | "blank" | null>(null);
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});
  const [blankFields, setBlankFields] = useState<BlankField[]>([
    { id: uid(), label: "Field 1", value: "" },
  ]);

  /* pick template */
  function pickTemplate(t: Template) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedTemplate(t);
    setTemplateValues({});
  }

  function pickBlank() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTemplate("blank");
    setBlankFields([{ id: uid(), label: "Field 1", value: "" }]);
  }

  /* blank helpers */
  function addBlankField() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const n = blankFields.length + 1;
    setBlankFields(prev => [...prev, { id: uid(), label: `Field ${n}`, value: "" }]);
  }

  function updateBlankField(id: string, patch: Partial<BlankField>) {
    setBlankFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  }

  function removeBlankField(id: string) {
    if (blankFields.length <= 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBlankFields(prev => prev.filter(f => f.id !== id));
  }

  /* readiness */
  const canGenerate = useMemo(() => {
    if (!selectedTemplate) return false;
    if (selectedTemplate === "blank") {
      return blankFields.every(f => f.label.trim() && f.value.trim());
    }
    const required = selectedTemplate.fields.filter(f => !f.optional);
    return required.every(f => (templateValues[f.key] ?? "").trim().length > 0);
  }, [selectedTemplate, templateValues, blankFields]);

  function handleGenerate() {
    if (!canGenerate) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    let content: string;
    let label: string;
    if (selectedTemplate === "blank") {
      content = blankFields
        .filter(f => f.label.trim() && f.value.trim())
        .map(f => `${f.label}: ${f.value}`)
        .join("\n");
      label = "Custom QR";
    } else {
      content = (selectedTemplate as Template).build(templateValues);
      label = (selectedTemplate as Template).name;
    }
    onGenerate(content, label);
    onBack();
  }

  const tpl = selectedTemplate && selectedTemplate !== "blank" ? selectedTemplate as Template : null;

  return (
    <Reanimated.View entering={SlideInRight.duration(240)} style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>

        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <Pressable
            onPress={onBack}
            style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
          >
            <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
          </Pressable>
          <Text style={[styles.topTitle, { color: colors.text }]}>Custom QR</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + 16 }]}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Template selector ── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>CHOOSE TYPE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templatesRow}>
              {TEMPLATES.map((t, i) => {
                const active = tpl?.id === t.id;
                return (
                  <Reanimated.View key={t.id} entering={FadeInDown.duration(200).delay(i * 20)}>
                    <Pressable
                      onPress={() => pickTemplate(t)}
                      style={({ pressed }) => [
                        styles.templatePill,
                        {
                          backgroundColor: active ? t.color + "18" : colors.surface,
                          borderColor: active ? t.color + "70" : colors.surfaceBorder,
                          borderWidth: active ? 1.5 : 1,
                          opacity: pressed ? 0.75 : 1,
                          transform: [{ scale: pressed ? 0.96 : 1 }],
                        },
                      ]}
                    >
                      <Text style={styles.templateEmoji}>{t.emoji}</Text>
                      <Text style={[styles.templateName, { color: active ? t.color : colors.text }]}>
                        {t.name}
                      </Text>
                    </Pressable>
                  </Reanimated.View>
                );
              })}

              {/* Blank option */}
              <Reanimated.View entering={FadeInDown.duration(200).delay(TEMPLATES.length * 20)}>
                <Pressable
                  onPress={pickBlank}
                  style={({ pressed }) => [
                    styles.templatePill,
                    {
                      backgroundColor: selectedTemplate === "blank" ? colors.primaryDim : colors.surface,
                      borderColor: selectedTemplate === "blank" ? colors.primary + "70" : colors.surfaceBorder,
                      borderWidth: selectedTemplate === "blank" ? 1.5 : 1,
                      opacity: pressed ? 0.75 : 1,
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                    },
                  ]}
                >
                  <Text style={styles.templateEmoji}>✏️</Text>
                  <Text style={[styles.templateName, { color: selectedTemplate === "blank" ? colors.primary : colors.text }]}>
                    Blank
                  </Text>
                </Pressable>
              </Reanimated.View>
            </ScrollView>
          </View>

          {/* ── No selection placeholder ── */}
          {!selectedTemplate && (
            <Reanimated.View entering={FadeIn.duration(300)} style={[styles.emptyHint, { borderColor: colors.surfaceBorder }]}>
              <Ionicons name="apps-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyHintText, { color: colors.textMuted }]}>
                Pick a type above to get started
              </Text>
            </Reanimated.View>
          )}

          {/* ── Template fields ── */}
          {tpl && (
            <Reanimated.View entering={FadeIn.duration(220)} style={styles.section}>
              <View style={[styles.templateBanner, { backgroundColor: tpl.color + "12", borderColor: tpl.color + "30" }]}>
                <Text style={{ fontSize: 18 }}>{tpl.emoji}</Text>
                <Text style={[styles.templateBannerName, { color: tpl.color }]}>{tpl.name}</Text>
              </View>

              {tpl.fields.map((f, i) => (
                <Reanimated.View key={f.key} entering={FadeInDown.duration(180).delay(i * 25)}>
                  <View style={styles.fieldWrap}>
                    <View style={styles.fieldLabelRow}>
                      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{f.label.toUpperCase()}</Text>
                      {f.optional && (
                        <Text style={[styles.optionalTag, { color: colors.textMuted }]}>optional</Text>
                      )}
                    </View>
                    <View style={[
                      styles.inputCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: (templateValues[f.key] ?? "").length > 0
                          ? tpl.color + "60"
                          : colors.surfaceBorder,
                      },
                    ]}>
                      <TextInput
                        style={[styles.inputText, { color: colors.text }]}
                        value={templateValues[f.key] ?? ""}
                        onChangeText={v => setTemplateValues(prev => ({ ...prev, [f.key]: v }))}
                        placeholder={f.placeholder}
                        placeholderTextColor={colors.textMuted}
                        keyboardType={kbType(f.type)}
                        autoCapitalize={
                          f.type === "url" || f.type === "email" || f.type === "upi" ? "none" : "sentences"
                        }
                        autoCorrect={false}
                        selectTextOnFocus
                      />
                      {(templateValues[f.key] ?? "").length > 0 && (
                        <Ionicons name="checkmark-circle" size={16} color={tpl.color} />
                      )}
                    </View>
                  </View>
                </Reanimated.View>
              ))}
            </Reanimated.View>
          )}

          {/* ── Blank fields ── */}
          {selectedTemplate === "blank" && (
            <Reanimated.View entering={FadeIn.duration(220)} style={styles.section}>
              <View style={styles.blankHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>YOUR FIELDS</Text>
                <Pressable
                  onPress={addBlankField}
                  style={[styles.addFieldBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}
                >
                  <Ionicons name="add" size={14} color={colors.primary} />
                  <Text style={[styles.addFieldBtnText, { color: colors.primary }]}>Add Field</Text>
                </Pressable>
              </View>

              {blankFields.map((f, i) => (
                <Reanimated.View key={f.id} entering={FadeInDown.duration(180).delay(i * 20)}>
                  <View style={[styles.blankFieldCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    <View style={styles.blankFieldRow}>
                      <TextInput
                        style={[styles.blankLabelInput, { color: colors.textSecondary, borderRightColor: colors.surfaceBorder }]}
                        value={f.label}
                        onChangeText={v => updateBlankField(f.id, { label: v })}
                        placeholder="Label"
                        placeholderTextColor={colors.textMuted}
                        selectTextOnFocus
                      />
                      <TextInput
                        style={[styles.blankValueInput, { color: colors.text }]}
                        value={f.value}
                        onChangeText={v => updateBlankField(f.id, { value: v })}
                        placeholder="Value"
                        placeholderTextColor={colors.textMuted}
                        selectTextOnFocus
                      />
                      {blankFields.length > 1 && (
                        <Pressable onPress={() => removeBlankField(f.id)} hitSlop={10} style={{ paddingLeft: 8 }}>
                          <Ionicons name="close" size={15} color={colors.textMuted} />
                        </Pressable>
                      )}
                    </View>
                  </View>
                </Reanimated.View>
              ))}
            </Reanimated.View>
          )}

          {/* ── Generate button ── */}
          {selectedTemplate && (
            <Reanimated.View entering={FadeIn.duration(240)} style={styles.generateWrap}>
              <Pressable
                onPress={handleGenerate}
                disabled={!canGenerate}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  borderRadius: 18,
                  overflow: "hidden" as const,
                })}
              >
                <LinearGradient
                  colors={canGenerate
                    ? [colors.primary, (colors as any).primaryShade ?? colors.primary]
                    : [colors.surfaceLight, colors.surfaceLight]}
                  style={styles.generateBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="qr-code" size={20} color={canGenerate ? "#fff" : colors.textMuted} />
                  <Text style={[styles.generateBtnText, { color: canGenerate ? "#fff" : colors.textMuted }]}>
                    Create QR Code
                  </Text>
                </LinearGradient>
              </Pressable>
              {!canGenerate && (
                <Text style={[styles.disabledHint, { color: colors.textMuted }]}>
                  Fill in all required fields above
                </Text>
              )}
            </Reanimated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Reanimated.View>
  );
}

export default memo(CustomQrBuilderPage);

const styles = StyleSheet.create({
  container: { flex: 1 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 6,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
  },
  topTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },

  scroll: { paddingHorizontal: 20, gap: 20, paddingTop: 8 },

  section: { gap: 10 },

  sectionTitle: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    letterSpacing: 0.8, marginBottom: 2,
  },

  templatesRow: { gap: 8, paddingVertical: 2 },
  templatePill: {
    flexDirection: "row", alignItems: "center", gap: 7,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  templateEmoji: { fontSize: 16 },
  templateName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  emptyHint: {
    alignItems: "center", justifyContent: "center", gap: 10,
    paddingVertical: 40,
    borderRadius: 18, borderWidth: 1, borderStyle: "dashed",
  },
  emptyHintText: { fontSize: 14, fontFamily: "Inter_400Regular" },

  templateBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  templateBannerName: { fontSize: 14, fontFamily: "Inter_700Bold" },

  fieldWrap: { gap: 6 },
  fieldLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  fieldLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.7 },
  optionalTag: { fontSize: 10, fontFamily: "Inter_400Regular", fontStyle: "italic" },

  inputCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 12, gap: 8,
  },
  inputText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },

  blankHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  addFieldBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 9, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  addFieldBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  blankFieldCard: {
    borderRadius: 14, borderWidth: 1, overflow: "hidden",
  },
  blankFieldRow: { flexDirection: "row", alignItems: "center" },
  blankLabelInput: {
    width: 100, paddingHorizontal: 12, paddingVertical: 13,
    fontSize: 13, fontFamily: "Inter_600SemiBold",
    borderRightWidth: 1,
  },
  blankValueInput: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 13,
    fontSize: 14, fontFamily: "Inter_400Regular",
  },

  generateWrap: { gap: 8, marginTop: 4 },
  generateBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16,
  },
  generateBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  disabledHint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
});
