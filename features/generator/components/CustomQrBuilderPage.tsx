import React, { useState, memo, useMemo } from "react";
import {
  View, Text, Pressable, ScrollView, TextInput,
  StyleSheet, Platform, KeyboardAvoidingView,
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

/* ─────────── templates ─────────── */
const TEMPLATES: Template[] = [
  {
    id: "upi",
    emoji: "💳",
    name: "UPI Payment",
    color: "#EC4899",
    icon: "card-outline",
    fields: [
      { key: "pa", label: "UPI ID",       type: "upi",    placeholder: "yourname@upi" },
      { key: "pn", label: "Payee Name",   type: "text",   placeholder: "Your name or shop" },
      { key: "am", label: "Amount (₹)",   type: "amount", placeholder: "Leave blank to let payer decide", optional: true },
      { key: "tn", label: "Note",         type: "text",   placeholder: "e.g. Table 5 order", optional: true },
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
    name: "Table Menu",
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
      { key: "url",  label: "Website URL",  type: "url",  placeholder: "https://yoursite.com/page" },
      { key: "ref",  label: "Source Tag",   type: "text", placeholder: "e.g. store_entrance", optional: true },
      { key: "code", label: "Promo Code",   type: "text", placeholder: "e.g. SAVE10", optional: true },
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
      { key: "url",      label: "Review URL",    type: "url",  placeholder: "https://yoursite.com/review" },
      { key: "location", label: "Location",      type: "text", placeholder: "e.g. Main Branch" },
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
      { key: "url",  label: "Booking URL",     type: "url",  placeholder: "https://booking.example.com" },
      { key: "date", label: "Date",             type: "date", placeholder: "DD/MM/YYYY" },
      { key: "name", label: "Patient / Client", type: "text", placeholder: "Full name" },
      { key: "slot", label: "Time Slot",        type: "text", placeholder: "e.g. 10:30 AM", optional: true },
    ],
    build: (v) => {
      let url = `${v.url}?date=${encodeURIComponent(v.date)}&name=${encodeURIComponent(v.name)}`;
      if (v.slot) url += `&slot=${encodeURIComponent(v.slot)}`;
      return url;
    },
  },
];

/* ─────────── blank field ─────────── */
interface BlankField { id: string; label: string; value: string; }
function uid() { return Math.random().toString(36).slice(2, 8); }

/* ─────────── keyboard type ─────────── */
function kbType(type: FieldType) {
  if (type === "number") return "number-pad" as const;
  if (type === "amount") return "decimal-pad" as const;
  if (type === "phone")  return "phone-pad" as const;
  if (type === "email" || type === "upi") return "email-address" as const;
  if (type === "url")    return "url" as const;
  return "default" as const;
}

/* ─────────── props ─────────── */
interface Props {
  onBack: () => void;
  onGenerate: (content: string, label: string) => void;
}

function CustomQrBuilderPage({ onBack, onGenerate }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 0 : insets.top;
  const tabBarHeight = 62 + insets.bottom + 8;

  type Mode = "blank" | "template";
  const [mode, setMode] = useState<Mode>("blank");
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(TEMPLATES[0]);
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});
  const [blankFields, setBlankFields] = useState<BlankField[]>([
    { id: uid(), label: "Name",  value: "" },
    { id: uid(), label: "Info",  value: "" },
  ]);

  /* blank helpers */
  function addBlankField() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBlankFields(prev => [...prev, { id: uid(), label: "", value: "" }]);
  }
  function updateBlankField(id: string, patch: Partial<BlankField>) {
    setBlankFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  }
  function removeBlankField(id: string) {
    if (blankFields.length <= 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBlankFields(prev => prev.filter(f => f.id !== id));
  }

  /* pick template */
  function pickTemplate(t: Template) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedTemplate(t);
    setTemplateValues({});
  }

  /* readiness */
  const canGenerate = useMemo(() => {
    if (mode === "blank") {
      return blankFields.some(f => f.label.trim() && f.value.trim());
    }
    const required = selectedTemplate.fields.filter(f => !f.optional);
    return required.every(f => (templateValues[f.key] ?? "").trim().length > 0);
  }, [mode, selectedTemplate, templateValues, blankFields]);

  /* live preview text */
  const previewContent = useMemo(() => {
    if (mode === "blank") {
      const filled = blankFields.filter(f => f.label.trim() || f.value.trim());
      if (!filled.length) return null;
      return filled.map(f => `${f.label || "—"}: ${f.value || "—"}`).join("\n");
    }
    // Build template with current values (show placeholders for empty required fields)
    const vals: Record<string, string> = {};
    for (const field of selectedTemplate.fields) {
      vals[field.key] = templateValues[field.key] ?? "";
    }
    const hasAnyValue = Object.values(vals).some(v => v.trim().length > 0);
    if (!hasAnyValue) return null;
    try { return selectedTemplate.build(vals); } catch { return null; }
  }, [mode, blankFields, selectedTemplate, templateValues]);

  function handleGenerate() {
    if (!canGenerate) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    let content: string;
    let label: string;
    if (mode === "blank") {
      content = blankFields
        .filter(f => f.label.trim() && f.value.trim())
        .map(f => `${f.label}: ${f.value}`)
        .join("\n");
      label = "Custom QR";
    } else {
      content = selectedTemplate.build(templateValues);
      label = selectedTemplate.name;
    }
    onGenerate(content, label);
    onBack();
  }

  return (
    <Reanimated.View
      entering={SlideInRight.duration(240)}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Safe area spacer — flush header to status bar */}
      <View style={{ height: topInset, backgroundColor: colors.background }} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable
            onPress={onBack}
            style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
          >
            <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Custom QR</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>Build anything</Text>
          </View>
        </View>

        {/* ── Mode tabs ── */}
        <View style={[styles.modeTabs, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
          <Pressable
            onPress={() => { setMode("blank"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[
              styles.modeTab,
              mode === "blank" && { backgroundColor: colors.primary + "18", borderColor: colors.primary + "50" },
            ]}
          >
            <Ionicons name="create-outline" size={14} color={mode === "blank" ? colors.primary : colors.textMuted} />
            <Text style={[styles.modeTabText, { color: mode === "blank" ? colors.primary : colors.textMuted }]}>
              Blank
            </Text>
          </Pressable>
          <Pressable
            onPress={() => { setMode("template"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[
              styles.modeTab,
              mode === "template" && { backgroundColor: colors.primary + "18", borderColor: colors.primary + "50" },
            ]}
          >
            <Ionicons name="grid-outline" size={14} color={mode === "template" ? colors.primary : colors.textMuted} />
            <Text style={[styles.modeTabText, { color: mode === "template" ? colors.primary : colors.textMuted }]}>
              Templates
            </Text>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + 24 }]}
          keyboardShouldPersistTaps="handled"
        >

          {/* ══════════ BLANK MODE ══════════ */}
          {mode === "blank" && (
            <Reanimated.View entering={FadeIn.duration(200)} style={{ gap: 14 }}>

              {/* Explainer */}
              <View style={[styles.explainerCard, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" }]}>
                <Ionicons name="bulb-outline" size={15} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.explainerTitle, { color: colors.primary }]}>
                    Write anything into your QR
                  </Text>
                  <Text style={[styles.explainerBody, { color: colors.primary + "CC" }]}>
                    Add rows of info — like a label and its value. When someone scans the QR, they'll see all of it. Great for business cards, product tags, info boards.
                  </Text>
                </View>
              </View>

              {/* Example preview (greyed) */}
              <View style={[styles.exampleCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <Text style={[styles.exampleTitle, { color: colors.textMuted }]}>EXAMPLE OUTPUT</Text>
                {[
                  { label: "Shop Name", value: "Ramesh Stores" },
                  { label: "Phone",     value: "+91 98765 43210" },
                  { label: "Address",   value: "Shop 4, MG Road" },
                ].map((row, i) => (
                  <View key={i} style={styles.exampleRow}>
                    <Text style={[styles.exampleLabel, { color: colors.textMuted }]}>{row.label}:</Text>
                    <Text style={[styles.exampleValue, { color: colors.textMuted }]}>{row.value}</Text>
                  </View>
                ))}
                <Text style={[styles.exampleNote, { color: colors.textMuted }]}>
                  ↑ This is what gets saved into the QR code
                </Text>
              </View>

              {/* Fields */}
              <View style={{ gap: 8 }}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>YOUR ROWS</Text>
                  <Pressable
                    onPress={addBlankField}
                    style={[styles.addBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}
                  >
                    <Ionicons name="add" size={14} color={colors.primary} />
                    <Text style={[styles.addBtnText, { color: colors.primary }]}>Add row</Text>
                  </Pressable>
                </View>

                {blankFields.map((f, i) => (
                  <Reanimated.View key={f.id} entering={FadeInDown.duration(160).delay(i * 20)}>
                    <View style={[styles.blankRow, {
                      backgroundColor: colors.surface,
                      borderColor: (f.label.trim() && f.value.trim()) ? colors.primary + "40" : colors.surfaceBorder,
                    }]}>
                      <TextInput
                        style={[styles.blankLabelInput, { color: colors.textSecondary, borderRightColor: colors.surfaceBorder }]}
                        value={f.label}
                        onChangeText={v => updateBlankField(f.id, { label: v })}
                        placeholder={i === 0 ? "e.g. Name" : i === 1 ? "e.g. Phone" : "Label"}
                        placeholderTextColor={colors.textMuted}
                        selectTextOnFocus
                      />
                      <TextInput
                        style={[styles.blankValueInput, { color: colors.text }]}
                        value={f.value}
                        onChangeText={v => updateBlankField(f.id, { value: v })}
                        placeholder={i === 0 ? "Your name" : i === 1 ? "+91 …" : "Value"}
                        placeholderTextColor={colors.textMuted}
                        selectTextOnFocus
                      />
                      {blankFields.length > 1 && (
                        <Pressable onPress={() => removeBlankField(f.id)} hitSlop={12} style={styles.removeBtn}>
                          <Ionicons name="close" size={14} color={colors.textMuted} />
                        </Pressable>
                      )}
                    </View>
                  </Reanimated.View>
                ))}
              </View>

              {/* Live preview */}
              {previewContent && (
                <Reanimated.View entering={FadeIn.duration(220)}>
                  <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    <View style={styles.previewHeader}>
                      <Ionicons name="eye-outline" size={13} color={colors.textMuted} />
                      <Text style={[styles.previewLabel, { color: colors.textMuted }]}>WHAT THE QR WILL SHOW</Text>
                    </View>
                    <Text style={[styles.previewContent, { color: colors.text }]}>{previewContent}</Text>
                  </View>
                </Reanimated.View>
              )}
            </Reanimated.View>
          )}

          {/* ══════════ TEMPLATE MODE ══════════ */}
          {mode === "template" && (
            <Reanimated.View entering={FadeIn.duration(200)} style={{ gap: 14 }}>

              {/* Template pills */}
              <View style={{ gap: 6 }}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>CHOOSE TEMPLATE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                  {TEMPLATES.map((t, i) => {
                    const active = selectedTemplate.id === t.id;
                    return (
                      <Reanimated.View key={t.id} entering={FadeInDown.duration(180).delay(i * 15)}>
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
                          <Text style={{ fontSize: 15 }}>{t.emoji}</Text>
                          <Text style={[styles.templatePillText, { color: active ? t.color : colors.text }]}>
                            {t.name}
                          </Text>
                        </Pressable>
                      </Reanimated.View>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Selected template banner */}
              <View style={[styles.templateBanner, { backgroundColor: selectedTemplate.color + "12", borderColor: selectedTemplate.color + "30" }]}>
                <Text style={{ fontSize: 20 }}>{selectedTemplate.emoji}</Text>
                <Text style={[styles.templateBannerName, { color: selectedTemplate.color }]}>{selectedTemplate.name}</Text>
              </View>

              {/* Fields */}
              <View style={{ gap: 10 }}>
                {selectedTemplate.fields.map((f, i) => (
                  <Reanimated.View key={f.key} entering={FadeInDown.duration(180).delay(i * 25)}>
                    <View style={{ gap: 6 }}>
                      <View style={styles.rowBetween}>
                        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{f.label.toUpperCase()}</Text>
                        {f.optional && (
                          <Text style={[styles.optionalTag, { color: colors.textMuted }]}>optional</Text>
                        )}
                      </View>
                      <View style={[styles.inputCard, {
                        backgroundColor: colors.surface,
                        borderColor: (templateValues[f.key] ?? "").length > 0
                          ? selectedTemplate.color + "60"
                          : colors.surfaceBorder,
                      }]}>
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
                          <Ionicons name="checkmark-circle" size={16} color={selectedTemplate.color} />
                        )}
                      </View>
                    </View>
                  </Reanimated.View>
                ))}
              </View>

              {/* Live preview */}
              {previewContent && (
                <Reanimated.View entering={FadeIn.duration(220)}>
                  <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    <View style={styles.previewHeader}>
                      <Ionicons name="eye-outline" size={13} color={colors.textMuted} />
                      <Text style={[styles.previewLabel, { color: colors.textMuted }]}>WHAT THE QR WILL ENCODE</Text>
                    </View>
                    <Text style={[styles.previewContent, { color: colors.text }]} numberOfLines={5} selectable>
                      {previewContent}
                    </Text>
                  </View>
                </Reanimated.View>
              )}
            </Reanimated.View>
          )}

          {/* ── Generate button ── */}
          <View style={styles.generateWrap}>
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
                {mode === "blank"
                  ? "Add at least one row with a label and value"
                  : "Fill in all required fields above"}
              </Text>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </Reanimated.View>
  );
}

export default memo(CustomQrBuilderPage);

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", lineHeight: 21 },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },

  /* Mode tabs */
  modeTabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "transparent",
  },
  modeTabText: { fontSize: 13, fontFamily: "Inter_700Bold" },

  /* Scroll */
  scroll: { paddingHorizontal: 16, paddingTop: 2, gap: 0 },

  /* Explainer */
  explainerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
  },
  explainerTitle: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 4 },
  explainerBody:  { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },

  /* Example */
  exampleCard: {
    borderRadius: 14, borderWidth: 1, padding: 12, gap: 5,
  },
  exampleTitle: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.7, marginBottom: 4 },
  exampleRow:   { flexDirection: "row", gap: 6 },
  exampleLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", minWidth: 70 },
  exampleValue: { fontSize: 12, fontFamily: "Inter_400Regular" },
  exampleNote:  { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 4, fontStyle: "italic" },

  /* Section */
  sectionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.7 },
  rowBetween:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  /* Add button */
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 9, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  addBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  /* Blank row */
  blankRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1.5, overflow: "hidden",
  },
  blankLabelInput: {
    width: 100, paddingHorizontal: 12, paddingVertical: 13,
    fontSize: 13, fontFamily: "Inter_600SemiBold",
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  blankValueInput: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 13,
    fontSize: 14, fontFamily: "Inter_400Regular",
  },
  removeBtn: { paddingHorizontal: 10 },

  /* Template pills */
  templatePill: {
    flexDirection: "row", alignItems: "center", gap: 7,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
  },
  templatePillText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  /* Template banner */
  templateBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  templateBannerName: { fontSize: 14, fontFamily: "Inter_700Bold" },

  /* Field */
  fieldLabel:  { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.7 },
  optionalTag: { fontSize: 10, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  inputCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 12, gap: 8,
  },
  inputText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },

  /* Preview */
  previewCard: {
    borderRadius: 14, borderWidth: 1, padding: 12, marginTop: 4, gap: 8,
  },
  previewHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  previewLabel:  { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.7 },
  previewContent: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 19 },

  /* Generate */
  generateWrap: { gap: 8, marginTop: 20 },
  generateBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16,
  },
  generateBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  disabledHint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
});
