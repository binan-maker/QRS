import React, { useState, memo, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
  Share,
  Alert,
} from "react-native";
import * as ExpoClipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, { FadeIn, FadeInDown, SlideInRight, SlideInLeft } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "@/contexts/ThemeContext";
import * as Haptics from "@/lib/haptics";
import { buildQrContent } from "@/features/generator/data/qr-builder";
import { BUILT_IN_CATEGORIES } from "@/features/generator/data/built-in-categories";

/* ─────────────────────────────────────────────
   Category colours
───────────────────────────────────────────── */
const CAT_COLORS: Record<string, string> = {
  text: "#6366F1", url: "#3B82F6", email: "#EC4899", phone: "#14B8A6",
  sms: "#22C55E", whatsapp: "#25D366", wifi: "#F59E0B", upi: "#8B5CF6",
  location: "#EF4444", contact: "#3B82F6", crypto: "#F97316",
  instagram: "#C13584", twitter: "#1DA1F2", youtube: "#FF0000",
  linkedin: "#0077B5", telegram: "#2CA5E0", spotify: "#1DB954",
  facebook: "#1877F2", paypal: "#003087", venmo: "#3D95CE",
  grab: "#00B14F", zoom: "#2D8CFF", event: "#8B5CF6",
  app_download: "#6366F1", bharat_qr: "#10B981",
  google_review: "#F59E0B", restaurant_menu: "#F97316", donation: "#EF4444",
};

function catColor(id: string): string {
  return CAT_COLORS[id] ?? "#3B82F6";
}

/* ─────────────────────────────────────────────
   Category groups for the picker
───────────────────────────────────────────── */
const GROUPS: { emoji: string; label: string; color: string; ids: string[] }[] = [
  { emoji: "🇮🇳", label: "India First",  color: "#FF6B35", ids: ["upi", "bharat_qr", "google_review", "restaurant_menu"] },
  { emoji: "💳", label: "Payments",      color: "#10B981", ids: ["paypal", "venmo", "crypto", "donation"] },
  { emoji: "📱", label: "Social Media",  color: "#8B5CF6", ids: ["whatsapp", "instagram", "twitter", "youtube", "linkedin", "telegram", "spotify", "facebook"] },
  { emoji: "👤", label: "Contact",       color: "#3B82F6", ids: ["contact", "phone", "email", "sms"] },
  { emoji: "🔧", label: "Utility",       color: "#14B8A6", ids: ["wifi", "event", "location", "zoom", "app_download"] },
  { emoji: "🌐", label: "Web & Text",    color: "#6366F1", ids: ["url", "text"] },
];

/* ─────────────────────────────────────────────
   Blank / custom field types
───────────────────────────────────────────── */
interface BlankField { id: string; label: string; value: string }
function uid() { return Math.random().toString(36).slice(2, 9); }

/* ─────────────────────────────────────────────
   Keyboard type helper
───────────────────────────────────────────── */
function kbType(type: string) {
  if (type === "phone")   return "phone-pad"    as const;
  if (type === "decimal") return "decimal-pad"  as const;
  if (type === "number")  return "number-pad"   as const;
  if (type === "email" || type === "upi") return "email-address" as const;
  if (type === "url")     return "url"          as const;
  return "default" as const;
}

/* ─────────────────────────────────────────────
   Props
───────────────────────────────────────────── */
interface Props {
  onBack: () => void;
  onGenerate?: (content: string, label: string) => void;
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
type PageView = "pick" | "form" | "output";

function CustomQrBuilderPage({ onBack }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const topInset = Platform.OS === "web" ? 0 : insets.top;
  const tabBarHeight = 62 + insets.bottom + 8;

  /* view state */
  const [view, setView] = useState<PageView>("pick");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isBlank, setIsBlank] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [blankFields, setBlankFields] = useState<BlankField[]>([
    { id: uid(), label: "Name",  value: "" },
    { id: uid(), label: "Info",  value: "" },
  ]);
  const [qrContent, setQrContent] = useState("");
  const [qrLabel, setQrLabel] = useState("");

  /* selected category from built-in list */
  const selectedCat = useMemo(
    () => BUILT_IN_CATEGORIES.find(c => c.id === selectedId) ?? null,
    [selectedId],
  );

  /* primary field key */
  const primaryKey = useMemo(
    () => selectedCat?.fields.find(f => f.isPrimary)?.key ?? null,
    [selectedCat],
  );

  /* can generate check */
  const canGenerate = useMemo(() => {
    if (isBlank) return blankFields.some(f => f.label.trim() && f.value.trim());
    if (!selectedCat) return false;
    return selectedCat.fields
      .filter(f => f.required !== false && !f.optional)
      .every(f => (values[f.key] ?? "").trim().length > 0);
  }, [isBlank, blankFields, selectedCat, values]);

  /* tile circle size */
  const pad = 16;
  const cols = 4;
  const circleSize = Math.floor((width - pad * 2 - (cols - 1) * 10) / cols);
  const iconCircle = circleSize - 4;

  /* ── handlers ── */
  const pickCategory = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedId(id);
    setIsBlank(false);
    setValues({});
    setView("form");
  }, []);

  const pickBlank = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsBlank(true);
    setSelectedId(null);
    setView("form");
  }, []);

  const handleGenerate = useCallback(() => {
    if (!canGenerate) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (isBlank) {
      const content = blankFields
        .filter(f => f.label.trim() && f.value.trim())
        .map(f => `${f.label}: ${f.value}`)
        .join("\n");
      setQrContent(content);
      setQrLabel("Custom QR");
    } else if (selectedCat) {
      const primaryVal = primaryKey ? (values[primaryKey] ?? "") : "";
      const extra: Record<string, string> = {};
      for (const f of selectedCat.fields) {
        if (!f.isPrimary) extra[f.key] = values[f.key] ?? "";
      }
      const content = buildQrContent(selectedCat.presetIdx, primaryVal, extra);
      setQrContent(content);
      setQrLabel(selectedCat.name);
    }
    setView("output");
  }, [canGenerate, isBlank, blankFields, selectedCat, primaryKey, values]);

  const handleCopy = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await ExpoClipboard.setStringAsync(qrContent);
    Alert.alert("Copied", "QR content copied to clipboard.");
  }, [qrContent]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({ message: qrContent, title: qrLabel });
    } catch {}
  }, [qrContent, qrLabel]);

  const resetAll = useCallback(() => {
    setView("pick");
    setSelectedId(null);
    setIsBlank(false);
    setValues({});
    setBlankFields([
      { id: uid(), label: "Name",  value: "" },
      { id: uid(), label: "Info",  value: "" },
    ]);
    setQrContent("");
    setQrLabel("");
  }, []);

  /* ── Blank field helpers ── */
  const addBlankField = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBlankFields(prev => [...prev, { id: uid(), label: "", value: "" }]);
  }, []);
  const updateBlankField = useCallback((id: string, patch: Partial<BlankField>) => {
    setBlankFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  }, []);
  const removeBlankField = useCallback((id: string) => {
    if (blankFields.length <= 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBlankFields(prev => prev.filter(f => f.id !== id));
  }, [blankFields.length]);

  /* ══════════════════════════════════════════
     PICKER VIEW — category circle grid
  ══════════════════════════════════════════ */
  if (view === "pick") {
    return (
      <Reanimated.View entering={SlideInLeft.duration(230)} style={[S.container, { backgroundColor: colors.background }]}>
        <View style={{ height: topInset, backgroundColor: colors.background }} />

        {/* Header */}
        <View style={S.header}>
          <Pressable onPress={onBack} style={[S.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[S.headerTitle, { color: colors.text }]}>Custom QR</Text>
            <Text style={[S.headerSub, { color: colors.textMuted }]}>Pick a type to get started</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[S.pickScroll, { paddingBottom: tabBarHeight + 16, paddingHorizontal: pad }]}
        >
          {GROUPS.map((grp, gi) => {
            const cats = BUILT_IN_CATEGORIES.filter(c => grp.ids.includes(c.id));
            if (!cats.length) return null;
            return (
              <Reanimated.View key={grp.label} entering={FadeInDown.duration(240).delay(gi * 40)}>
                {/* Group label */}
                <View style={S.groupHeader}>
                  <Text style={[S.groupEmoji]}>{grp.emoji}</Text>
                  <Text style={[S.groupLabel, { color: colors.textMuted }]}>{grp.label.toUpperCase()}</Text>
                  <View style={[S.groupLine, { backgroundColor: colors.surfaceBorder }]} />
                </View>

                {/* Circle tiles */}
                <View style={[S.tilesRow, { gap: 10 }]}>
                  {cats.map((cat) => {
                    const col = catColor(cat.id);
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => pickCategory(cat.id)}
                        style={({ pressed }) => [
                          S.circleTile,
                          { width: circleSize, opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.92 : 1 }] },
                        ]}
                      >
                        <View style={[S.circleIcon, {
                          width: iconCircle, height: iconCircle,
                          borderRadius: iconCircle / 2,
                          backgroundColor: col + "18",
                          borderColor: col + "40",
                        }]}>
                          <Ionicons name={cat.icon as any} size={iconCircle * 0.44} color={col} />
                        </View>
                        <Text style={[S.circleTileLabel, { color: colors.textSecondary }]} numberOfLines={2}>
                          {cat.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Reanimated.View>
            );
          })}

          {/* Custom blank card */}
          <Reanimated.View entering={FadeInDown.duration(240).delay(GROUPS.length * 40)}>
            <View style={S.groupHeader}>
              <Text style={S.groupEmoji}>✏️</Text>
              <Text style={[S.groupLabel, { color: colors.textMuted }]}>CUSTOM FIELDS</Text>
              <View style={[S.groupLine, { backgroundColor: colors.surfaceBorder }]} />
            </View>
            <Pressable
              onPress={pickBlank}
              style={({ pressed }) => [
                S.blankCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.primary + "50",
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <LinearGradient
                colors={[colors.primary + "18", colors.primary + "08"]}
                style={S.blankCardGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={[S.blankCardIcon, { backgroundColor: colors.primaryDim }]}>
                  <Ionicons name="create-outline" size={28} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[S.blankCardTitle, { color: colors.text }]}>Build Your Own</Text>
                  <Text style={[S.blankCardSub, { color: colors.textMuted }]}>
                    Add any labels and values — great for business cards, product tags, info boards
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </LinearGradient>
            </Pressable>
          </Reanimated.View>
        </ScrollView>
      </Reanimated.View>
    );
  }

  /* ══════════════════════════════════════════
     FORM VIEW — fill in the fields
  ══════════════════════════════════════════ */
  if (view === "form") {
    const formColor = isBlank ? colors.primary : catColor(selectedId ?? "");
    const formIcon: any = isBlank ? "create-outline" : (selectedCat?.icon ?? "qr-code-outline");
    const formTitle = isBlank ? "Custom Fields" : (selectedCat?.name ?? "");
    const formDesc  = isBlank ? "Add rows of any information — label and value pairs." : (selectedCat?.description ?? "");

    return (
      <Reanimated.View entering={SlideInRight.duration(230)} style={[S.container, { backgroundColor: colors.background }]}>
        <View style={{ height: topInset, backgroundColor: colors.background }} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>

          {/* Header */}
          <View style={S.header}>
            <Pressable onPress={() => setView("pick")} style={[S.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
            </Pressable>
            <View style={[S.formHeaderIcon, { width: 36, height: 36, borderRadius: 18, backgroundColor: formColor + "18" }]}>
              <Ionicons name={formIcon} size={18} color={formColor} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[S.headerTitle, { color: colors.text }]}>{formTitle}</Text>
              <Text style={[S.headerSub, { color: colors.textMuted }]} numberOfLines={1}>{formDesc}</Text>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[S.formScroll, { paddingBottom: tabBarHeight + 16 }]}
          >
            {/* ── Template fields ── */}
            {!isBlank && selectedCat && (
              <View style={{ gap: 12 }}>
                {selectedCat.fields.map((f, idx) => {
                  const val = values[f.key] ?? "";
                  const filled = val.trim().length > 0;
                  const required = f.required !== false && !f.optional;
                  const col = filled ? formColor : colors.surfaceBorder;
                  const isSelect = f.type === "select";
                  const isSecure = (f as any).secureText;
                  const isMultiline = f.type === "multiline";

                  return (
                    <Reanimated.View key={f.key} entering={FadeInDown.duration(200).delay(idx * 30)}>
                      {/* Field label row */}
                      <View style={S.fieldLabelRow}>
                        {/* Circle status indicator */}
                        <View style={[S.fieldCircle, {
                          borderColor: col,
                          backgroundColor: filled ? formColor + "18" : "transparent",
                        }]}>
                          {filled
                            ? <Ionicons name="checkmark" size={11} color={formColor} />
                            : <View style={[S.fieldCircleDot, { backgroundColor: required ? colors.surfaceBorder : colors.surfaceLight }]} />
                          }
                        </View>
                        <Text style={[S.fieldLabel, { color: colors.textSecondary }]}>{f.label}</Text>
                        {!required && (
                          <Text style={[S.optionalTag, { color: colors.textMuted }]}>optional</Text>
                        )}
                      </View>

                      {/* Select chips */}
                      {isSelect && f.options && (
                        <View style={S.chipsRow}>
                          {f.options.map(opt => {
                            const active = (values[f.key] ?? "") === opt.value;
                            return (
                              <Pressable
                                key={opt.value}
                                onPress={() => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  setValues(prev => ({ ...prev, [f.key]: opt.value }));
                                }}
                                style={[S.chip, {
                                  backgroundColor: active ? formColor + "18" : colors.surface,
                                  borderColor: active ? formColor + "70" : colors.surfaceBorder,
                                  borderWidth: active ? 1.5 : 1,
                                }]}
                              >
                                <Text style={[S.chipText, { color: active ? formColor : colors.text }]}>{opt.label}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      )}

                      {/* Text input */}
                      {!isSelect && (
                        <View style={[S.inputCard, {
                          backgroundColor: colors.surface,
                          borderColor: filled ? formColor + "60" : colors.surfaceBorder,
                          borderWidth: filled ? 1.5 : 1,
                        }]}>
                          <TextInput
                            style={[S.inputText, { color: colors.text }]}
                            value={val}
                            onChangeText={v => setValues(prev => ({ ...prev, [f.key]: v }))}
                            placeholder={f.placeholder ?? ""}
                            placeholderTextColor={colors.textMuted}
                            keyboardType={kbType(f.type)}
                            secureTextEntry={isSecure}
                            multiline={isMultiline}
                            numberOfLines={isMultiline ? 3 : 1}
                            autoCapitalize={f.type === "url" || f.type === "email" || f.type === "upi" ? "none" : "sentences"}
                            autoCorrect={false}
                            selectTextOnFocus
                          />
                          {filled && <Ionicons name="checkmark-circle" size={18} color={formColor} />}
                        </View>
                      )}

                      {/* Hint */}
                      {(f as any).hint && (
                        <Text style={[S.hintText, { color: colors.textMuted }]}>
                          {(f as any).hint}
                        </Text>
                      )}
                    </Reanimated.View>
                  );
                })}
              </View>
            )}

            {/* ── Blank fields ── */}
            {isBlank && (
              <View style={{ gap: 10 }}>
                {/* Example output card */}
                <View style={[S.exampleCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                  <View style={S.exampleHeader}>
                    <Ionicons name="eye-outline" size={13} color={colors.textMuted} />
                    <Text style={[S.exampleHeaderLabel, { color: colors.textMuted }]}>EXAMPLE — WHAT GETS SAVED IN THE QR</Text>
                  </View>
                  {[
                    { label: "Shop Name", value: "Ramesh Stores" },
                    { label: "Phone",     value: "+91 98765 43210" },
                    { label: "Address",   value: "Shop 4, MG Road, Bangalore" },
                  ].map((row, i) => (
                    <View key={i} style={S.exampleRow}>
                      <View style={[S.exampleDot, { backgroundColor: colors.primary }]} />
                      <Text style={[S.exampleLbl, { color: colors.textMuted }]}>{row.label}:</Text>
                      <Text style={[S.exampleVal, { color: colors.textSecondary }]}>{row.value}</Text>
                    </View>
                  ))}
                </View>

                {/* Add row header */}
                <View style={S.rowBetween}>
                  <Text style={[S.sectionLabel, { color: colors.textMuted }]}>YOUR ROWS</Text>
                  <Pressable
                    onPress={addBlankField}
                    style={[S.addBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}
                  >
                    <Ionicons name="add" size={14} color={colors.primary} />
                    <Text style={[S.addBtnText, { color: colors.primary }]}>Add row</Text>
                  </Pressable>
                </View>

                {blankFields.map((f, i) => {
                  const filled = f.label.trim().length > 0 && f.value.trim().length > 0;
                  return (
                    <Reanimated.View key={f.id} entering={FadeInDown.duration(160).delay(i * 15)}>
                      {/* Circle indicator + row */}
                      <View style={S.blankRowWrap}>
                        <View style={[S.fieldCircle, {
                          borderColor: filled ? colors.primary : colors.surfaceBorder,
                          backgroundColor: filled ? colors.primary + "18" : "transparent",
                        }]}>
                          {filled
                            ? <Ionicons name="checkmark" size={11} color={colors.primary} />
                            : <View style={[S.fieldCircleDot, { backgroundColor: colors.surfaceBorder }]} />
                          }
                        </View>
                        <View style={[S.blankRow, {
                          backgroundColor: colors.surface,
                          borderColor: filled ? colors.primary + "50" : colors.surfaceBorder,
                          flex: 1,
                        }]}>
                          <TextInput
                            style={[S.blankLabelInput, { color: colors.textSecondary, borderRightColor: colors.surfaceBorder }]}
                            value={f.label}
                            onChangeText={v => updateBlankField(f.id, { label: v })}
                            placeholder={i === 0 ? "e.g. Name" : i === 1 ? "e.g. Phone" : "Label"}
                            placeholderTextColor={colors.textMuted}
                            selectTextOnFocus
                          />
                          <TextInput
                            style={[S.blankValueInput, { color: colors.text }]}
                            value={f.value}
                            onChangeText={v => updateBlankField(f.id, { value: v })}
                            placeholder={i === 0 ? "Your name" : i === 1 ? "+91 …" : "Value"}
                            placeholderTextColor={colors.textMuted}
                            selectTextOnFocus
                          />
                          {blankFields.length > 1 && (
                            <Pressable onPress={() => removeBlankField(f.id)} hitSlop={12} style={S.removeBtn}>
                              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                            </Pressable>
                          )}
                        </View>
                      </View>
                    </Reanimated.View>
                  );
                })}
              </View>
            )}

            {/* ── Generate button ── */}
            <View style={{ marginTop: 24, gap: 10 }}>
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
                    ? [formColor, formColor + "CC"]
                    : [colors.surfaceLight, colors.surfaceLight]}
                  style={S.generateBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="qr-code" size={20} color={canGenerate ? "#fff" : colors.textMuted} />
                  <Text style={[S.generateBtnText, { color: canGenerate ? "#fff" : colors.textMuted }]}>
                    Generate QR Code
                  </Text>
                </LinearGradient>
              </Pressable>
              {!canGenerate && (
                <Text style={[S.disabledHint, { color: colors.textMuted }]}>
                  {isBlank
                    ? "Add at least one row with a label and value"
                    : "Fill in all required fields above to continue"}
                </Text>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Reanimated.View>
    );
  }

  /* ══════════════════════════════════════════
     OUTPUT VIEW — inline QR display
  ══════════════════════════════════════════ */
  const outputColor = isBlank ? colors.primary : catColor(selectedId ?? "");
  const outputIcon: any = isBlank ? "create-outline" : (selectedCat?.icon ?? "qr-code-outline");

  return (
    <Reanimated.View entering={SlideInRight.duration(230)} style={[S.container, { backgroundColor: colors.background }]}>
      <View style={{ height: topInset, backgroundColor: colors.background }} />

      {/* Header */}
      <View style={S.header}>
        <Pressable onPress={() => setView("form")} style={[S.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
        </Pressable>
        <View style={[S.formHeaderIcon, { width: 36, height: 36, borderRadius: 18, backgroundColor: outputColor + "18" }]}>
          <Ionicons name={outputIcon} size={18} color={outputColor} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[S.headerTitle, { color: colors.text }]}>QR Ready</Text>
          <Text style={[S.headerSub, { color: colors.textMuted }]}>{qrLabel}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[S.outputScroll, { paddingBottom: tabBarHeight + 16 }]}
      >
        <Reanimated.View entering={FadeIn.duration(350)}>

          {/* QR code card */}
          <View style={[S.qrCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <View style={[S.qrBadge, { backgroundColor: outputColor + "18", borderColor: outputColor + "40" }]}>
              <Ionicons name={outputIcon} size={13} color={outputColor} />
              <Text style={[S.qrBadgeText, { color: outputColor }]}>{qrLabel}</Text>
            </View>

            <View style={[S.qrWrapper, { backgroundColor: "#fff", borderRadius: 16 }]}>
              {qrContent.length > 0 && qrContent.length < 2000 ? (
                <QRCode
                  value={qrContent}
                  size={220}
                  color="#000000"
                  backgroundColor="#FFFFFF"
                />
              ) : (
                <View style={S.qrError}>
                  <Ionicons name="alert-circle-outline" size={40} color={colors.danger ?? "#EF4444"} />
                  <Text style={[S.qrErrorText, { color: colors.textMuted }]}>
                    Content is too long for a QR code. Try shorter values.
                  </Text>
                </View>
              )}
            </View>

            {/* Content preview */}
            <View style={[S.contentPreview, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
              <Text style={[S.contentPreviewLabel, { color: colors.textMuted }]}>ENCODED CONTENT</Text>
              <Text style={[S.contentPreviewText, { color: colors.textSecondary }]} numberOfLines={4}>
                {qrContent}
              </Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={S.actionRow}>
            <Pressable
              onPress={handleCopy}
              style={({ pressed }) => [S.actionBtn, {
                backgroundColor: colors.surface,
                borderColor: colors.surfaceBorder,
                opacity: pressed ? 0.7 : 1,
                flex: 1,
              }]}
            >
              <Ionicons name="copy-outline" size={20} color={colors.text} />
              <Text style={[S.actionBtnText, { color: colors.text }]}>Copy</Text>
            </Pressable>

            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [S.actionBtn, {
                backgroundColor: outputColor + "18",
                borderColor: outputColor + "50",
                opacity: pressed ? 0.7 : 1,
                flex: 1,
              }]}
            >
              <Ionicons name="share-outline" size={20} color={outputColor} />
              <Text style={[S.actionBtnText, { color: outputColor }]}>Share</Text>
            </Pressable>
          </View>

          {/* Make another */}
          <Pressable
            onPress={resetAll}
            style={({ pressed }) => [S.makeAnotherBtn, {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
              opacity: pressed ? 0.7 : 1,
            }]}
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.textSecondary} />
            <Text style={[S.makeAnotherText, { color: colors.textSecondary }]}>Create Another QR</Text>
          </Pressable>

          {/* Back to home */}
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [S.homeBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="home-outline" size={14} color={colors.textMuted} />
            <Text style={[S.homeBtnText, { color: colors.textMuted }]}>Back to Generator Home</Text>
          </Pressable>

        </Reanimated.View>
      </ScrollView>
    </Reanimated.View>
  );
}

export default memo(CustomQrBuilderPage);

/* ─────────────────────────────────────────────
   Styles
───────────────────────────────────────────── */
const S = StyleSheet.create({
  container: { flex: 1 },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 0,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", lineHeight: 21 },
  headerSub:   { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  formHeaderIcon: { marginLeft: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },

  /* ── PICK VIEW ── */
  pickScroll: { gap: 18, paddingTop: 4 },

  groupHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  groupEmoji:  { fontSize: 14 },
  groupLabel:  { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  groupLine:   { flex: 1, height: StyleSheet.hairlineWidth },

  tilesRow: { flexDirection: "row", flexWrap: "wrap" },

  circleTile: { alignItems: "center", gap: 6, marginBottom: 14 },
  circleIcon: {
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5,
  },
  circleTileLabel: {
    fontSize: 10, fontFamily: "Inter_500Medium",
    textAlign: "center", lineHeight: 13,
  },

  blankCard: { borderRadius: 18, borderWidth: 1.5, overflow: "hidden" },
  blankCardGrad: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 16, paddingVertical: 16,
  },
  blankCardIcon: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  blankCardTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 3 },
  blankCardSub:   { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },

  /* ── FORM VIEW ── */
  formScroll: { paddingHorizontal: 16, paddingTop: 4, gap: 0 },

  fieldLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 7 },
  fieldCircle: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  fieldCircleDot: { width: 6, height: 6, borderRadius: 3 },
  fieldLabel:  { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1 },
  optionalTag: { fontSize: 10, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  hintText:    { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4, marginLeft: 28 },

  inputCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13, gap: 8,
    marginBottom: 4,
  },
  inputText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  /* Example card (blank mode) */
  exampleCard: { borderRadius: 14, borderWidth: 1, padding: 13, gap: 7, marginBottom: 4 },
  exampleHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  exampleHeaderLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  exampleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  exampleDot: { width: 5, height: 5, borderRadius: 3 },
  exampleLbl: { fontSize: 12, fontFamily: "Inter_600SemiBold", minWidth: 72 },
  exampleVal: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },

  sectionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.7 },
  rowBetween:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },

  addBtn:     { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 9, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  addBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  blankRowWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  blankRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1.5, overflow: "hidden",
  },
  blankLabelInput: {
    width: 96, paddingHorizontal: 11, paddingVertical: 12,
    fontSize: 13, fontFamily: "Inter_600SemiBold",
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  blankValueInput: {
    flex: 1, paddingHorizontal: 11, paddingVertical: 12,
    fontSize: 13, fontFamily: "Inter_400Regular",
  },
  removeBtn: { paddingHorizontal: 10 },

  generateBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16, borderRadius: 18,
  },
  generateBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  disabledHint:    { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },

  /* ── OUTPUT VIEW ── */
  outputScroll: { paddingHorizontal: 16, paddingTop: 4, gap: 16 },

  qrCard: {
    borderRadius: 20, borderWidth: 1,
    padding: 18, alignItems: "center", gap: 16,
  },
  qrBadge: {
    flexDirection: "row", alignItems: "center", gap: 7,
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 5,
    alignSelf: "flex-start",
  },
  qrBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  qrWrapper: {
    padding: 16, alignItems: "center", justifyContent: "center",
  },
  qrError: { width: 220, height: 220, alignItems: "center", justifyContent: "center", gap: 12 },
  qrErrorText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },

  contentPreview: {
    width: "100%", borderRadius: 12, borderWidth: 1,
    padding: 12, gap: 5,
  },
  contentPreviewLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  contentPreviewText:  { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },

  actionRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, borderWidth: 1, paddingVertical: 13,
  },
  actionBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  makeAnotherBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, borderWidth: 1, paddingVertical: 12, marginTop: 4,
  },
  makeAnotherText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  homeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, marginTop: 2,
  },
  homeBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
