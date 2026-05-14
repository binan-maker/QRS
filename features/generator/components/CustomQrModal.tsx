/**
 * CustomQrModal — Build-your-own QR code as a bottom sheet modal.
 *
 * • No preset templates — pure custom fields only.
 * • 9 field types: Text · Phone · Email · URL · Number · Date · Payment · Note · Symbol
 * • Each field row: type selector chip · label · value · remove
 * • Generate → inline QR preview with colour themes
 * • Copy / Share actions
 */

import React, { useState, useCallback, useMemo, memo } from "react";
import {
  View, Text, Modal, Pressable, ScrollView, TextInput,
  StyleSheet, useWindowDimensions, Share, Alert, Platform,
  KeyboardAvoidingView,
} from "react-native";
import * as ExpoClipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "@/contexts/ThemeContext";
import * as Haptics from "@/lib/haptics";

/* ─────────────────────────────────────────────────────────────
   FIELD TYPES
───────────────────────────────────────────────────────────── */
interface FieldTypeDef {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  kb: "default" | "phone-pad" | "email-address" | "url" | "number-pad" | "decimal-pad";
  color: string;
  hint: string;
}

const FIELD_TYPES: FieldTypeDef[] = [
  { key: "text",    label: "Text",    icon: "text-outline",          kb: "default",       color: "#6366F1", hint: "Any text or message" },
  { key: "phone",   label: "Phone",   icon: "call-outline",          kb: "phone-pad",     color: "#14B8A6", hint: "+91 9876543210" },
  { key: "email",   label: "Email",   icon: "mail-outline",          kb: "email-address", color: "#EC4899", hint: "user@example.com" },
  { key: "url",     label: "URL",     icon: "link-outline",          kb: "url",           color: "#3B82F6", hint: "https://example.com" },
  { key: "number",  label: "Number",  icon: "calculator-outline",    kb: "number-pad",    color: "#F97316", hint: "Any numeric value" },
  { key: "date",    label: "Date",    icon: "calendar-outline",      kb: "default",       color: "#8B5CF6", hint: "e.g. 13 May 2026" },
  { key: "payment", label: "Payment", icon: "cash-outline",          kb: "decimal-pad",   color: "#10B981", hint: "Amount in ₹" },
  { key: "note",    label: "Note",    icon: "document-text-outline", kb: "default",       color: "#64748B", hint: "Multi-line note or description" },
  { key: "symbol",  label: "Symbol",  icon: "code-slash-outline",    kb: "default",       color: "#F59E0B", hint: "Special text or code" },
];

function typeOf(key: string): FieldTypeDef {
  return FIELD_TYPES.find(t => t.key === key) ?? FIELD_TYPES[0];
}

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
function uid() { return Math.random().toString(36).slice(2, 9); }

interface FieldRow { id: string; type: string; label: string; value: string }

function formatValue(type: string, value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (type === "url")     return v.startsWith("http") ? v : `https://${v}`;
  if (type === "phone")   return `tel:${v.replace(/[\s\-()]/g, "")}`;
  if (type === "email")   return `mailto:${v}`;
  if (type === "payment") return `₹${v}`;
  return v;
}

function buildQrContent(rows: FieldRow[]): string {
  const filled = rows.filter(r => r.value.trim());
  if (filled.length === 0) return "";
  if (filled.length === 1) {
    return formatValue(filled[0].type, filled[0].value);
  }
  return filled.map(r => {
    const lbl = r.label.trim() || typeOf(r.type).label;
    return `${lbl}: ${formatValue(r.type, r.value)}`;
  }).join("\n");
}

function securityLabel(content: string): { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; color: string } {
  if (content.startsWith("https://")) return { icon: "lock-closed", label: "Secure HTTPS link",        color: "#10B981" };
  if (content.startsWith("http://"))  return { icon: "warning",     label: "Insecure HTTP link",       color: "#F59E0B" };
  if (content.startsWith("tel:"))     return { icon: "call",        label: "Phone direct-dial",        color: "#14B8A6" };
  if (content.startsWith("mailto:"))  return { icon: "mail",        label: "Email direct-open",        color: "#EC4899" };
  return                                     { icon: "document-text","label": "Custom encoded data",   color: "#6366F1" };
}

/* ─────────────────────────────────────────────────────────────
   TYPE PICKER SHEET  (small sheet within the modal)
───────────────────────────────────────────────────────────── */
const TypePickerSheet = memo(function TypePickerSheet({
  current, onSelect, onClose,
}: { current: string; onSelect: (k: string) => void; onClose: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[TS.wrap, { backgroundColor: colors.background, borderColor: colors.surfaceBorder }]}>
      <View style={[TS.handle, { backgroundColor: colors.surfaceBorder }]} />
      <Text style={[TS.title, { color: colors.text }]}>Choose Field Type</Text>
      <View style={TS.grid}>
        {FIELD_TYPES.map(t => {
          const active = t.key === current;
          return (
            <Pressable
              key={t.key}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(t.key); onClose(); }}
              style={[TS.chip, {
                backgroundColor: active ? t.color + "1A" : colors.surface,
                borderColor:     active ? t.color + "70" : colors.surfaceBorder,
                borderWidth:     active ? 1.5 : 1,
              }]}
            >
              <Ionicons name={t.icon} size={18} color={t.color} />
              <Text style={[TS.chipLabel, { color: active ? t.color : colors.text }]}>{t.label}</Text>
              {active && <Ionicons name="checkmark-circle" size={13} color={t.color} />}
            </Pressable>
          );
        })}
      </View>
      <Pressable onPress={onClose} style={[TS.cancelBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <Text style={[TS.cancelTxt, { color: colors.textSecondary }]}>Cancel</Text>
      </Pressable>
    </View>
  );
});

const TS = StyleSheet.create({
  wrap: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, padding: 16, paddingBottom: 24 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  title: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 14, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 9 },
  chipLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  cancelBtn: { borderRadius: 14, borderWidth: 1, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  cancelTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});

/* ─────────────────────────────────────────────────────────────
   MAIN MODAL
───────────────────────────────────────────────────────────── */
interface Props {
  visible: boolean;
  onClose: () => void;
}

type Phase = "build" | "output";
type QrTheme = "classic" | "dark" | "branded";

function CustomQrModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();

  const sheetH = screenH * 0.90;

  /* ── state ── */
  const [phase,       setPhase]       = useState<Phase>("build");
  const [rows,        setRows]        = useState<FieldRow[]>([
    { id: uid(), type: "text",  label: "Name",    value: "" },
    { id: uid(), type: "phone", label: "Phone",   value: "" },
    { id: uid(), type: "url",   label: "Website", value: "" },
  ]);
  const [qrContent,   setQrContent]   = useState("");
  const [qrTheme,     setQrTheme]     = useState<QrTheme>("classic");
  const [pickerRowId, setPickerRowId] = useState<string | null>(null);

  /* ── derived ── */
  const liveContent = useMemo(() => buildQrContent(rows), [rows]);
  const canGenerate = liveContent.length > 0 && liveContent.length < 2000;
  const badge       = useMemo(() => securityLabel(qrContent), [qrContent]);

  const qrColors = useMemo(() => {
    if (qrTheme === "dark")    return { fg: "#E2E8F0", bg: "#0F172A" };
    if (qrTheme === "branded") return { fg: "#6366F1", bg: "#FFFFFF" };
    return { fg: "#000000", bg: "#FFFFFF" };
  }, [qrTheme]);

  /* ── row helpers ── */
  const addRow = useCallback((typeKey = "text") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const t = typeOf(typeKey);
    setRows(prev => [...prev, { id: uid(), type: typeKey, label: t.label, value: "" }]);
  }, []);

  const updateRow = useCallback((id: string, patch: Partial<FieldRow>) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r)), []);

  const removeRow = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRows(prev => prev.filter(r => r.id !== id));
  }, []);

  const changeType = useCallback((id: string, typeKey: string) => {
    const t = typeOf(typeKey);
    setRows(prev => prev.map(r => r.id === id
      ? { ...r, type: typeKey, label: r.label || t.label }
      : r));
  }, []);

  /* ── actions ── */
  const handleGenerate = useCallback(() => {
    if (!canGenerate) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setQrContent(liveContent);
    setQrTheme("classic");
    setPhase("output");
  }, [canGenerate, liveContent]);

  const handleCopy = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await ExpoClipboard.setStringAsync(qrContent);
    Alert.alert("Copied!", "QR content copied to clipboard.");
  }, [qrContent]);

  const handleShare = useCallback(async () => {
    try { await Share.share({ message: qrContent, title: "Custom QR" }); } catch {}
  }, [qrContent]);

  const handleReset = useCallback(() => {
    setPhase("build");
    setRows([
      { id: uid(), type: "text",  label: "Name",    value: "" },
      { id: uid(), type: "phone", label: "Phone",   value: "" },
      { id: uid(), type: "url",   label: "Website", value: "" },
    ]);
    setQrContent("");
  }, []);

  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  const pickerRow = pickerRowId ? rows.find(r => r.id === pickerRowId) : null;

  const THEMES: { key: QrTheme; label: string }[] = [
    { key: "classic", label: "Classic" },
    { key: "dark",    label: "Dark"    },
    { key: "branded", label: "Brand"   },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={S.overlay}>
        <Pressable style={S.backdrop} onPress={handleClose} />

        {/* Main sheet */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[S.sheet, {
            backgroundColor: colors.background,
            borderColor: colors.surfaceBorder,
            height: sheetH,
            paddingBottom: insets.bottom + 16,
          }]}
        >
          {/* Handle */}
          <View style={[S.handle, { backgroundColor: colors.surfaceBorder }]} />

          {/* Header */}
          <View style={S.header}>
            {phase === "output" ? (
              <Pressable onPress={() => setPhase("build")} style={[S.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
              </Pressable>
            ) : (
              <View style={[S.headerIcon, { backgroundColor: "#6366F1" + "18" }]}>
                <Ionicons name="create-outline" size={18} color="#6366F1" />
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[S.headerTitle, { color: colors.text }]}>
                {phase === "output" ? "QR Ready" : "Custom QR Builder"}
              </Text>
              <Text style={[S.headerSub, { color: colors.textMuted }]}>
                {phase === "output" ? "Your custom QR code" : "Add any fields · any data"}
              </Text>
            </View>
            <Pressable onPress={handleClose} style={[S.closeBtn, { backgroundColor: colors.surfaceLight }]}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* ══ BUILD PHASE ══ */}
          {phase === "build" && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={S.buildScroll}
            >
              {/* Field type legend */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={S.typeLegendRow}
              >
                {FIELD_TYPES.map(t => (
                  <Pressable
                    key={t.key}
                    onPress={() => addRow(t.key)}
                    style={[S.addTypeChip, { backgroundColor: t.color + "14", borderColor: t.color + "40" }]}
                  >
                    <Ionicons name={t.icon} size={13} color={t.color} />
                    <Text style={[S.addTypeLabel, { color: t.color }]}>+ {t.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Field rows */}
              <View style={{ gap: 8 }}>
                {rows.map((row, i) => {
                  const t      = typeOf(row.type);
                  const filled = row.value.trim().length > 0;
                  return (
                    <Reanimated.View key={row.id} entering={FadeInDown.duration(180).delay(i * 20)}>
                      <View style={[S.rowCard, {
                        backgroundColor: colors.surface,
                        borderColor:     filled ? t.color + "55" : colors.surfaceBorder,
                        borderWidth:     filled ? 1.5 : 1,
                      }]}>
                        {/* Type toggle button */}
                        <Pressable
                          onPress={() => setPickerRowId(row.id)}
                          style={[S.typeBtn, { backgroundColor: t.color + "14", borderColor: t.color + "40" }]}
                        >
                          <Ionicons name={t.icon} size={14} color={t.color} />
                          <Text style={[S.typeBtnLabel, { color: t.color }]}>{t.label}</Text>
                          <Ionicons name="chevron-down" size={10} color={t.color} />
                        </Pressable>

                        {/* Inputs */}
                        <View style={S.inputsWrap}>
                          <TextInput
                            style={[S.labelInput, { color: colors.textSecondary, borderBottomColor: colors.surfaceBorder }]}
                            value={row.label}
                            onChangeText={v => updateRow(row.id, { label: v })}
                            placeholder="Label (optional)"
                            placeholderTextColor={colors.textMuted}
                            selectTextOnFocus
                          />
                          <TextInput
                            style={[S.valueInput, { color: colors.text }]}
                            value={row.value}
                            onChangeText={v => updateRow(row.id, { value: v })}
                            placeholder={t.hint}
                            placeholderTextColor={colors.textMuted}
                            keyboardType={t.kb}
                            autoCapitalize={t.key === "url" || t.key === "email" ? "none" : "sentences"}
                            autoCorrect={false}
                            multiline={t.key === "note"}
                            numberOfLines={t.key === "note" ? 2 : 1}
                            selectTextOnFocus
                          />
                        </View>

                        {/* Remove */}
                        <Pressable onPress={() => removeRow(row.id)} hitSlop={10} style={S.removeBtn}>
                          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                        </Pressable>
                      </View>
                    </Reanimated.View>
                  );
                })}
              </View>

              {/* Add field button */}
              <Pressable
                onPress={() => addRow("text")}
                style={[S.addRowBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.textSecondary} />
                <Text style={[S.addRowTxt, { color: colors.textSecondary }]}>Add Another Field</Text>
              </Pressable>

              {/* Live preview hint */}
              {liveContent.length > 2 && (
                <Reanimated.View entering={FadeIn.duration(280)}>
                  <View style={[S.liveHint, { backgroundColor: colors.surface, borderColor: "#6366F1" + "30" }]}>
                    <Ionicons name="eye-outline" size={13} color="#6366F1" />
                    <Text style={[S.liveHintTxt, { color: colors.textMuted }]} numberOfLines={2}>{liveContent}</Text>
                  </View>
                </Reanimated.View>
              )}

              {/* Generate */}
              <Pressable
                onPress={handleGenerate}
                disabled={!canGenerate}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }], borderRadius: 18, overflow: "hidden" as const })}
              >
                <LinearGradient
                  colors={canGenerate ? ["#6366F1", "#8B5CF6"] : [colors.surfaceLight, colors.surfaceLight]}
                  style={S.generateBtn}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="qr-code" size={20} color={canGenerate ? "#fff" : colors.textMuted} />
                  <Text style={[S.generateBtnTxt, { color: canGenerate ? "#fff" : colors.textMuted }]}>
                    Generate QR Code
                  </Text>
                </LinearGradient>
              </Pressable>
              {!canGenerate && (
                <Text style={[S.disabledHint, { color: colors.textMuted }]}>
                  Fill at least one field value to generate
                </Text>
              )}
            </ScrollView>
          )}

          {/* ══ OUTPUT PHASE ══ */}
          {phase === "output" && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={S.outputScroll}
            >
              <Reanimated.View entering={FadeIn.duration(320)} style={{ gap: 14 }}>
                {/* QR card */}
                <View style={[S.qrCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                  {/* Security badge */}
                  <View style={[S.secBadge, { backgroundColor: badge.color + "12", borderColor: badge.color + "35" }]}>
                    <Ionicons name={badge.icon} size={12} color={badge.color} />
                    <Text style={[S.secBadgeTxt, { color: badge.color }]}>{badge.label}</Text>
                  </View>

                  {/* Theme switcher */}
                  <View style={[S.themeRow, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
                    {THEMES.map(th => {
                      const active = qrTheme === th.key;
                      return (
                        <Pressable
                          key={th.key}
                          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setQrTheme(th.key); }}
                          style={[S.themeBtn, active && {
                            backgroundColor: th.key === "dark" ? "#0F172A" : th.key === "branded" ? "#6366F1" + "18" : "#fff",
                            borderColor: th.key === "dark" ? "#E2E8F0" : "#6366F1",
                            borderWidth: 1.5,
                          }]}
                        >
                          <Text style={[S.themeBtnTxt, {
                            color: active
                              ? th.key === "dark" ? "#E2E8F0" : "#6366F1"
                              : colors.textMuted,
                          }]}>{th.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* QR code */}
                  <View style={[S.qrWrapper, { backgroundColor: qrColors.bg, borderRadius: 14 }]}>
                    <QRCode
                      value={qrContent}
                      size={210}
                      color={qrColors.fg}
                      backgroundColor={qrColors.bg}
                    />
                  </View>

                  {/* Encoded content */}
                  <View style={[S.encodedBox, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
                    <Text style={[S.encodedLabel, { color: colors.textMuted }]}>ENCODED CONTENT</Text>
                    <Text style={[S.encodedTxt, { color: colors.textSecondary }]} numberOfLines={5} selectable>
                      {qrContent}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={S.actionRow}>
                  <Pressable
                    onPress={handleCopy}
                    style={({ pressed }) => [S.actionBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Ionicons name="copy-outline" size={19} color={colors.text} />
                    <Text style={[S.actionTxt, { color: colors.text }]}>Copy</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleShare}
                    style={({ pressed }) => [S.actionBtn, { backgroundColor: "#6366F1" + "18", borderColor: "#6366F1" + "50", opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Ionicons name="share-outline" size={19} color="#6366F1" />
                    <Text style={[S.actionTxt, { color: "#6366F1" }]}>Share</Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={handleReset}
                  style={({ pressed }) => [S.anotherBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.7 : 1 }]}
                >
                  <Ionicons name="add-circle-outline" size={16} color={colors.textSecondary} />
                  <Text style={[S.anotherTxt, { color: colors.textSecondary }]}>Create Another</Text>
                </Pressable>
              </Reanimated.View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>

        {/* Type picker overlay */}
        {pickerRowId && (
          <Modal visible transparent animationType="slide" onRequestClose={() => setPickerRowId(null)}>
            <View style={S.overlay}>
              <Pressable style={S.backdrop} onPress={() => setPickerRowId(null)} />
              <TypePickerSheet
                current={pickerRow?.type ?? "text"}
                onSelect={key => { if (pickerRowId) changeType(pickerRowId, key); }}
                onClose={() => setPickerRowId(null)}
              />
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

export default memo(CustomQrModal);

/* ─────────────────────────────────────────────────────────────
   STYLES
───────────────────────────────────────────────────────────── */
const S = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.52)" },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    paddingTop: 10, overflow: "hidden",
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 10 },

  /* Header */
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 10 },
  headerIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  backBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", marginLeft: 8 },

  /* Build phase */
  buildScroll: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 24, gap: 10 },

  typeLegendRow: { flexDirection: "row", gap: 8, paddingBottom: 2 },
  addTypeChip: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  addTypeLabel: { fontSize: 11.5, fontFamily: "Inter_600SemiBold" },

  /* Field row */
  rowCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, overflow: "hidden", gap: 0,
  },
  typeBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 9, paddingVertical: 14,
    borderRightWidth: 1, borderRightColor: "transparent",
    borderRadius: 0, flexShrink: 0,
  },
  typeBtnLabel: { fontSize: 10, fontFamily: "Inter_700Bold" },
  inputsWrap: { flex: 1, paddingHorizontal: 10 },
  labelInput: {
    fontSize: 10, fontFamily: "Inter_600SemiBold",
    paddingBottom: 3, borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 3,
  },
  valueInput: { fontSize: 13, fontFamily: "Inter_400Regular", paddingVertical: 6 },
  removeBtn: { paddingHorizontal: 10 },

  /* Add row */
  addRowBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, borderWidth: 1, borderStyle: "dashed",
    paddingVertical: 12,
  },
  addRowTxt: { fontSize: 13, fontFamily: "Inter_500Medium" },

  /* Live hint */
  liveHint: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, padding: 10 },
  liveHintTxt: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },

  /* Generate */
  generateBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 15, borderRadius: 18,
  },
  generateBtnTxt: { fontSize: 15, fontFamily: "Inter_700Bold" },
  disabledHint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },

  /* Output phase */
  outputScroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, gap: 14 },
  qrCard: { borderRadius: 20, borderWidth: 1, padding: 14, gap: 12, alignItems: "center" },
  secBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 5, width: "100%",
  },
  secBadgeTxt: { fontSize: 11, fontFamily: "Inter_500Medium" },

  themeRow: { flexDirection: "row", borderRadius: 10, borderWidth: 1, padding: 3, gap: 2, width: "100%" },
  themeBtn: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 7, paddingVertical: 6 },
  themeBtnTxt: { fontSize: 11.5, fontFamily: "Inter_600SemiBold" },

  qrWrapper: { padding: 14, alignItems: "center", justifyContent: "center" },

  encodedBox: { width: "100%", borderRadius: 10, borderWidth: 1, padding: 10, gap: 4 },
  encodedLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.9 },
  encodedTxt: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },

  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, borderWidth: 1, paddingVertical: 12,
  },
  actionTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  anotherBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, borderWidth: 1, paddingVertical: 11,
  },
  anotherTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
