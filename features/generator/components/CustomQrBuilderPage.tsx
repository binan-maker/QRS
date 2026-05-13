/**
 * CustomQrBuilderPage — Full Blueprint Implementation
 *
 * Views:  pick → form → output
 *
 * Features:
 *  • Search across 35+ QR types (live filter)
 *  • Popular strip (top 6 by popularity)
 *  • 7 grouped category sections with circle icon tiles
 *  • Circle status indicators per field (empty ring → filled checkmark)
 *  • Select-chip fields (WiFi encryption, Crypto coin, etc.)
 *  • Progress bar: "X of Y required fields filled"
 *  • Live mini QR preview as user types
 *  • Inline QR output — no navigation away
 *  • 3 QR colour themes: Classic · Dark · Branded
 *  • Security badge (UPI safe, HTTPS, insecure, WiFi, etc.)
 *  • Copy / Share actions on output
 */

import React, { useState, memo, useMemo, useCallback, useRef } from "react";
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
import Reanimated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  SlideInLeft,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "@/contexts/ThemeContext";
import * as Haptics from "@/lib/haptics";
import { buildQrContent } from "@/features/generator/data/qr-builder";
import { BUILT_IN_CATEGORIES } from "@/features/generator/data/built-in-categories";
import type { CategorySchema, FieldDefinition } from "@/lib/schemas/CategorySchema";

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */

/** Colour assigned to each QR category id */
const CAT_COLOR: Record<string, string> = {
  text: "#6366F1",         url: "#3B82F6",       email: "#EC4899",
  phone: "#14B8A6",        sms: "#22C55E",        whatsapp: "#25D366",
  wifi: "#F59E0B",         upi: "#8B5CF6",        location: "#EF4444",
  contact: "#3B82F6",      crypto: "#F97316",     instagram: "#C13584",
  twitter: "#1DA1F2",      youtube: "#FF0000",    linkedin: "#0077B5",
  telegram: "#2CA5E0",     spotify: "#1DB954",    facebook: "#1877F2",
  paypal: "#003087",       venmo: "#3D95CE",      grab: "#00B14F",
  zoom: "#2D8CFF",         event: "#8B5CF6",      app_download: "#6366F1",
  bharat_qr: "#10B981",    google_review: "#F59E0B", restaurant_menu: "#F97316",
  donation: "#EF4444",     razorpay: "#3395FF",   google_maps: "#34A853",
  discord: "#5865F2",      tiktok: "#010101",     snapchat: "#FFFC00",
  google_pay: "#4285F4",   linktree: "#43E660",   mecard: "#8B5CF6",
};
function catColor(id: string) { return CAT_COLOR[id] ?? "#3B82F6"; }

/** IDs of the 6 most popular types shown in the "Popular" strip */
const POPULAR_IDS = ["google_pay", "upi", "whatsapp", "url", "wifi", "google_review"];

/** Category group definitions */
const GROUPS: { emoji: string; label: string; ids: string[] }[] = [
  { emoji: "🇮🇳", label: "India First",  ids: ["upi", "bharat_qr", "google_pay", "google_review", "restaurant_menu", "razorpay"] },
  { emoji: "💳",  label: "Payments",     ids: ["paypal", "venmo", "crypto", "donation"] },
  { emoji: "📱",  label: "Social Media", ids: ["whatsapp", "instagram", "twitter", "youtube", "linkedin", "telegram", "spotify", "facebook", "tiktok", "discord", "snapchat"] },
  { emoji: "👤",  label: "Contact",      ids: ["contact", "mecard", "phone", "email", "sms"] },
  { emoji: "🔧",  label: "Utility",      ids: ["wifi", "event", "location", "google_maps", "zoom", "app_download"] },
  { emoji: "🌐",  label: "Web & Links",  ids: ["url", "text", "linktree"] },
];

/** Security badge derived from QR content string */
function securityBadge(content: string): { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; color: string } {
  if (content.startsWith("upi://"))         return { icon: "shield-checkmark", label: "UPI Verified — NPCI Compliant", color: "#10B981" };
  if (content.startsWith("MECARD:"))        return { icon: "person",           label: "MeCard — Quick Contact",        color: "#3B82F6" };
  if (content.startsWith("BEGIN:VCARD"))    return { icon: "person",           label: "vCard 3.0 Contact",             color: "#3B82F6" };
  if (content.startsWith("BEGIN:VCALENDAR")) return { icon: "calendar",        label: "Calendar Event (iCal)",         color: "#8B5CF6" };
  if (content.startsWith("WIFI:"))          return { icon: "wifi",             label: "WiFi Credentials Encoded",      color: "#F59E0B" };
  if (content.startsWith("tel:"))           return { icon: "call",             label: "Phone Direct-Dial",             color: "#14B8A6" };
  if (content.startsWith("mailto:"))        return { icon: "mail",             label: "Email Direct-Open",             color: "#EC4899" };
  if (content.startsWith("geo:"))           return { icon: "location",         label: "GPS Coordinates",               color: "#EF4444" };
  if (content.startsWith("https://maps.google.com")) return { icon: "map",    label: "Google Maps Link",              color: "#34A853" };
  if (content.startsWith("https://"))       return { icon: "lock-closed",      label: "Secure Link (HTTPS)",           color: "#10B981" };
  if (content.startsWith("http://"))        return { icon: "warning",          label: "Insecure Link (HTTP)",          color: "#F59E0B" };
  return                                           { icon: "document-text",    label: "Custom Data",                   color: "#6366F1" };
}

/* ─────────────────────────────────────────────────────────────
   BLANK / CUSTOM FIELD TYPES
───────────────────────────────────────────────────────────── */
interface BlankField { id: string; label: string; value: string }
function uid() { return Math.random().toString(36).slice(2, 9); }

/* ─────────────────────────────────────────────────────────────
   KEYBOARD TYPE HELPER
───────────────────────────────────────────────────────────── */
function kbType(type: string) {
  if (type === "phone")   return "phone-pad"    as const;
  if (type === "decimal") return "decimal-pad"  as const;
  if (type === "number")  return "number-pad"   as const;
  if (type === "email")   return "email-address" as const;
  if (type === "url")     return "url"           as const;
  return "default" as const;
}

/* ─────────────────────────────────────────────────────────────
   SEARCH SCORER
───────────────────────────────────────────────────────────── */
function scoreCategory(cat: CategorySchema, query: string): number {
  const q = query.toLowerCase();
  let s = 0;
  if (cat.name.toLowerCase().includes(q)) s += 50;
  if (cat.id.toLowerCase().includes(q))   s += 30;
  if (cat.tags.some(t => t.includes(q)))  s += 20;
  if (cat.description.toLowerCase().includes(q)) s += 10;
  return s;
}

/* ─────────────────────────────────────────────────────────────
   PROPS
───────────────────────────────────────────────────────────── */
interface Props {
  onBack: () => void;
  onGenerate?: (content: string, label: string) => void;
}

type PageView  = "pick" | "form" | "output";
type QrTheme   = "classic" | "dark" | "branded";

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
function CustomQrBuilderPage({ onBack }: Props) {
  const { colors } = useTheme();
  const insets     = useSafeAreaInsets();
  const { width }  = useWindowDimensions();
  const topInset   = Platform.OS === "web" ? 0 : insets.top;
  const tabBarH    = 62 + insets.bottom + 8;

  /* ── page state ── */
  const [view,        setView]        = useState<PageView>("pick");
  const [search,      setSearch]      = useState("");
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [isBlank,     setIsBlank]     = useState(false);
  const [values,      setValues]      = useState<Record<string, string>>({});
  const [blankFields, setBlankFields] = useState<BlankField[]>([
    { id: uid(), label: "Name",  value: "" },
    { id: uid(), label: "Info",  value: "" },
  ]);
  const [qrContent, setQrContent] = useState("");
  const [qrLabel,   setQrLabel]   = useState("");
  const [qrTheme,   setQrTheme]   = useState<QrTheme>("classic");

  /* ── derived ── */
  const selectedCat = useMemo(
    () => BUILT_IN_CATEGORIES.find(c => c.id === selectedId) ?? null,
    [selectedId],
  );
  const primaryField = useMemo(
    () => selectedCat?.fields.find(f => f.isPrimary) ?? null,
    [selectedCat],
  );

  /** Required fields for the current category */
  const requiredFields = useMemo<FieldDefinition[]>(
    () => (selectedCat?.fields ?? []).filter(f => f.required !== false && !f.optional),
    [selectedCat],
  );
  const progressFilled = useMemo(
    () => requiredFields.filter(f => (values[f.key] ?? "").trim().length > 0).length,
    [requiredFields, values],
  );
  const canGenerate = useMemo(() => {
    if (isBlank) return blankFields.some(f => f.label.trim() && f.value.trim());
    return progressFilled === requiredFields.length && requiredFields.length > 0;
  }, [isBlank, blankFields, progressFilled, requiredFields]);

  /** Partial live preview content (form view) */
  const liveQrContent = useMemo(() => {
    if (isBlank) {
      const filled = blankFields.filter(f => f.label.trim() && f.value.trim());
      return filled.length ? filled.map(f => `${f.label}: ${f.value}`).join("\n") : "";
    }
    if (!selectedCat || !primaryField) return "";
    const pv = (values[primaryField.key] ?? "").trim();
    if (pv.length < 2) return "";
    const extra: Record<string, string> = {};
    for (const f of selectedCat.fields) {
      if (!f.isPrimary) extra[f.key] = values[f.key] ?? "";
    }
    try { return buildQrContent(selectedCat.presetIdx ?? 0, pv, extra); } catch { return ""; }
  }, [isBlank, blankFields, selectedCat, primaryField, values]);

  /** QR theme colours */
  const qrColors = useMemo(() => {
    const col = catColor(selectedId ?? "");
    if (qrTheme === "dark")    return { fg: "#E2E8F0", bg: "#0F172A" };
    if (qrTheme === "branded") return { fg: col, bg: "#FFFFFF" };
    return { fg: "#000000", bg: "#FFFFFF" };
  }, [qrTheme, selectedId]);

  /* ── search results ── */
  const searchResults = useMemo(() => {
    const q = search.trim();
    if (!q) return null;
    return BUILT_IN_CATEGORIES
      .map(cat => ({ cat, score: scoreCategory(cat, q) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score || b.cat.popularity - a.cat.popularity)
      .slice(0, 15)
      .map(x => x.cat);
  }, [search]);

  /* ── popular strip ── */
  const popularCats = useMemo(
    () => POPULAR_IDS.map(id => BUILT_IN_CATEGORIES.find(c => c.id === id)).filter(Boolean) as CategorySchema[],
    [],
  );

  /* ── tile dimensions ── */
  const SIDE_PAD = 16;
  const COLS     = 4;
  const GAP      = 10;
  const tileW    = Math.floor((width - SIDE_PAD * 2 - GAP * (COLS - 1)) / COLS);
  const circleD  = tileW - 4;

  /* ─── handlers ─── */
  const pickCategory = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedId(id);
    setIsBlank(false);
    setValues({});
    setSearch("");
    setView("form");
  }, []);

  const pickBlank = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsBlank(true);
    setSelectedId(null);
    setSearch("");
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
    } else if (selectedCat && primaryField) {
      const pv = (values[primaryField.key] ?? "").trim();
      const extra: Record<string, string> = {};
      for (const f of selectedCat.fields) {
        if (!f.isPrimary) extra[f.key] = values[f.key] ?? "";
      }
      setQrContent(buildQrContent(selectedCat.presetIdx ?? 0, pv, extra));
      setQrLabel(selectedCat.name);
    }
    setQrTheme("classic");
    setView("output");
  }, [canGenerate, isBlank, blankFields, selectedCat, primaryField, values]);

  const handleCopy = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await ExpoClipboard.setStringAsync(qrContent);
    Alert.alert("Copied!", "QR content copied to clipboard.");
  }, [qrContent]);

  const handleShare = useCallback(async () => {
    try { await Share.share({ message: qrContent, title: qrLabel }); } catch {}
  }, [qrContent, qrLabel]);

  const resetAll = useCallback(() => {
    setView("pick");
    setSelectedId(null);
    setIsBlank(false);
    setValues({});
    setSearch("");
    setBlankFields([{ id: uid(), label: "Name", value: "" }, { id: uid(), label: "Info", value: "" }]);
    setQrContent("");
    setQrLabel("");
  }, []);

  /* blank field helpers */
  const addBlankField = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBlankFields(prev => [...prev, { id: uid(), label: "", value: "" }]);
  }, []);
  const updateBlankField = useCallback((id: string, patch: Partial<BlankField>) =>
    setBlankFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f)), []);
  const removeBlankField = useCallback((id: string) => {
    if (blankFields.length <= 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBlankFields(prev => prev.filter(f => f.id !== id));
  }, [blankFields.length]);

  /* ══════════════════════════════════════════════════════════
     PICKER  VIEW
  ══════════════════════════════════════════════════════════ */
  if (view === "pick") {
    const hasSearch = search.trim().length > 0;

    return (
      <Reanimated.View entering={SlideInLeft.duration(230)} style={[S.root, { backgroundColor: colors.background }]}>
        <View style={{ height: topInset }} />

        {/* ── Header ── */}
        <View style={S.header}>
          <Pressable onPress={onBack} style={[S.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[S.headerTitle, { color: colors.text }]}>Custom QR</Text>
            <Text style={[S.headerSub, { color: colors.textMuted }]}>
              {BUILT_IN_CATEGORIES.length}+ types — pick one to start
            </Text>
          </View>
        </View>

        {/* ── Search bar ── */}
        <View style={[S.searchWrap, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={[S.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search — UPI, WhatsApp, WiFi, Google…"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={10}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[S.pickScroll, { paddingHorizontal: SIDE_PAD, paddingBottom: tabBarH + 16 }]}
        >
          {/* ── SEARCH RESULTS ── */}
          {hasSearch && (
            <Reanimated.View entering={FadeIn.duration(180)} style={{ gap: 8 }}>
              {searchResults && searchResults.length > 0 ? searchResults.map((cat, i) => (
                <Reanimated.View key={cat.id} entering={FadeInDown.duration(160).delay(i * 20)}>
                  <Pressable
                    onPress={() => pickCategory(cat.id)}
                    style={({ pressed }) => [S.searchRow, {
                      backgroundColor: colors.surface,
                      borderColor: colors.surfaceBorder,
                      opacity: pressed ? 0.75 : 1,
                    }]}
                  >
                    <View style={[S.searchRowIcon, { backgroundColor: catColor(cat.id) + "18" }]}>
                      <Ionicons name={cat.icon as any} size={20} color={catColor(cat.id)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={[S.searchRowName, { color: colors.text }]}>{cat.name}</Text>
                        {cat.isIndiaFirst && <Text style={S.flagBadge}>🇮🇳</Text>}
                        {cat.badge && (
                          <View style={[S.catBadge, { backgroundColor: (cat.badgeColor ?? "#888") + "22", borderColor: (cat.badgeColor ?? "#888") + "50" }]}>
                            <Text style={[S.catBadgeText, { color: cat.badgeColor ?? "#888" }]}>{cat.badge}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[S.searchRowDesc, { color: colors.textMuted }]} numberOfLines={1}>{cat.description}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                  </Pressable>
                </Reanimated.View>
              )) : (
                <View style={[S.emptySearch, { borderColor: colors.surfaceBorder }]}>
                  <Ionicons name="search-outline" size={28} color={colors.textMuted} />
                  <Text style={[S.emptySearchText, { color: colors.textMuted }]}>
                    No QR types match "{search}"
                  </Text>
                  <Text style={[S.emptySearchSub, { color: colors.textMuted }]}>
                    Try "UPI", "WiFi", "Instagram", "WhatsApp"…
                  </Text>
                </View>
              )}

              {/* Custom blank always shows at bottom of search */}
              <Pressable
                onPress={pickBlank}
                style={({ pressed }) => [S.searchRow, {
                  backgroundColor: colors.primaryDim,
                  borderColor: colors.primary + "50",
                  opacity: pressed ? 0.75 : 1,
                }]}
              >
                <View style={[S.searchRowIcon, { backgroundColor: colors.primary + "18" }]}>
                  <Ionicons name="create-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[S.searchRowName, { color: colors.primary }]}>Build Your Own</Text>
                  <Text style={[S.searchRowDesc, { color: colors.primary + "AA" }]}>Custom labels + values — any data you want</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
              </Pressable>
            </Reanimated.View>
          )}

          {/* ── NORMAL (no search) ── */}
          {!hasSearch && (
            <>
              {/* Popular strip */}
              <Reanimated.View entering={FadeInDown.duration(240)}>
                <View style={S.groupHeader}>
                  <Text style={S.groupEmoji}>🔥</Text>
                  <Text style={[S.groupLabel, { color: colors.textMuted }]}>MOST POPULAR</Text>
                  <View style={[S.groupLine, { backgroundColor: colors.surfaceBorder }]} />
                </View>
                <View style={[S.tilesRow, { gap: GAP }]}>
                  {popularCats.map(cat => (
                    <CircleTile
                      key={cat.id}
                      cat={cat}
                      size={tileW}
                      circleD={circleD}
                      onPress={() => pickCategory(cat.id)}
                    />
                  ))}
                </View>
              </Reanimated.View>

              {/* Category groups */}
              {GROUPS.map((grp, gi) => {
                const cats = BUILT_IN_CATEGORIES.filter(c => grp.ids.includes(c.id));
                if (!cats.length) return null;
                return (
                  <Reanimated.View key={grp.label} entering={FadeInDown.duration(240).delay((gi + 1) * 35)}>
                    <View style={S.groupHeader}>
                      <Text style={S.groupEmoji}>{grp.emoji}</Text>
                      <Text style={[S.groupLabel, { color: colors.textMuted }]}>{grp.label.toUpperCase()}</Text>
                      <View style={[S.groupLine, { backgroundColor: colors.surfaceBorder }]} />
                    </View>
                    <View style={[S.tilesRow, { gap: GAP }]}>
                      {cats.map(cat => (
                        <CircleTile
                          key={cat.id}
                          cat={cat}
                          size={tileW}
                          circleD={circleD}
                          onPress={() => pickCategory(cat.id)}
                        />
                      ))}
                    </View>
                  </Reanimated.View>
                );
              })}

              {/* Custom blank card */}
              <Reanimated.View entering={FadeInDown.duration(240).delay((GROUPS.length + 1) * 35)}>
                <View style={S.groupHeader}>
                  <Text style={S.groupEmoji}>✏️</Text>
                  <Text style={[S.groupLabel, { color: colors.textMuted }]}>CUSTOM FIELDS</Text>
                  <View style={[S.groupLine, { backgroundColor: colors.surfaceBorder }]} />
                </View>
                <Pressable
                  onPress={pickBlank}
                  style={({ pressed }) => [S.blankCard, {
                    backgroundColor: colors.surface,
                    borderColor: colors.primary + "50",
                    opacity: pressed ? 0.82 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  }]}
                >
                  <LinearGradient
                    colors={[colors.primary + "18", colors.primary + "06"]}
                    style={S.blankCardGrad}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  >
                    <View style={[S.blankCardIcon, { backgroundColor: colors.primaryDim }]}>
                      <Ionicons name="create-outline" size={28} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[S.blankCardTitle, { color: colors.text }]}>Build Your Own</Text>
                      <Text style={[S.blankCardSub, { color: colors.textMuted }]}>
                        Any labels + values — business cards, product tags, info boards, menus…
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </LinearGradient>
                </Pressable>
              </Reanimated.View>
            </>
          )}
        </ScrollView>
      </Reanimated.View>
    );
  }

  /* ══════════════════════════════════════════════════════════
     FORM  VIEW
  ══════════════════════════════════════════════════════════ */
  if (view === "form") {
    const fCol    = isBlank ? colors.primary : catColor(selectedId ?? "");
    const fIcon: any = isBlank ? "create-outline" : (selectedCat?.icon ?? "qr-code-outline");
    const fTitle  = isBlank ? "Custom Fields" : (selectedCat?.name ?? "");
    const fDesc   = isBlank ? "Add any labels and values to encode in the QR." : (selectedCat?.description ?? "");

    return (
      <Reanimated.View entering={SlideInRight.duration(230)} style={[S.root, { backgroundColor: colors.background }]}>
        <View style={{ height: topInset }} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>

          {/* ── Header ── */}
          <View style={S.header}>
            <Pressable onPress={() => setView("pick")} style={[S.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
            </Pressable>
            <View style={[S.formIconCircle, { width: 36, height: 36, borderRadius: 18, backgroundColor: fCol + "18" }]}>
              <Ionicons name={fIcon} size={17} color={fCol} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[S.headerTitle, { color: colors.text }]}>{fTitle}</Text>
              <Text style={[S.headerSub, { color: colors.textMuted }]} numberOfLines={1}>{fDesc}</Text>
            </View>
          </View>

          {/* ── Progress bar (template mode) ── */}
          {!isBlank && requiredFields.length > 0 && (
            <View style={[S.progressWrap, { paddingHorizontal: SIDE_PAD }]}>
              <View style={[S.progressTrack, { backgroundColor: colors.surfaceBorder }]}>
                <View style={[S.progressFill, {
                  backgroundColor: fCol,
                  width: `${Math.round((progressFilled / requiredFields.length) * 100)}%`,
                }]} />
              </View>
              <Text style={[S.progressLabel, { color: progressFilled === requiredFields.length ? fCol : colors.textMuted }]}>
                {progressFilled === requiredFields.length
                  ? "✓ All required fields complete"
                  : `${progressFilled} of ${requiredFields.length} required`}
              </Text>
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[S.formScroll, { paddingHorizontal: SIDE_PAD, paddingBottom: tabBarH + 16 }]}
          >
            {/* ── Template fields ── */}
            {!isBlank && selectedCat && (
              <View style={{ gap: 14 }}>
                {selectedCat.fields.map((f, idx) => {
                  const val      = values[f.key] ?? "";
                  const filled   = val.trim().length > 0;
                  const required = f.required !== false && !f.optional;
                  const isSelect = f.type === "select";
                  const isSecure = !!f.secureText;
                  const isMulti  = f.type === "multiline";

                  return (
                    <Reanimated.View key={f.key} entering={FadeInDown.duration(200).delay(idx * 25)}>
                      {/* Label row */}
                      <View style={S.fieldLabelRow}>
                        <FieldCircle filled={filled} required={required} color={fCol} />
                        <Text style={[S.fieldLabel, { color: colors.textSecondary }]}>{f.label}</Text>
                        {!required && (
                          <View style={[S.optionalPill, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
                            <Text style={[S.optionalPillText, { color: colors.textMuted }]}>optional</Text>
                          </View>
                        )}
                      </View>

                      {/* Select chips */}
                      {isSelect && f.options && (
                        <View style={S.chipsRow}>
                          {f.options.map(opt => {
                            const active = val === opt.value;
                            return (
                              <Pressable
                                key={opt.value}
                                onPress={() => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  setValues(prev => ({ ...prev, [f.key]: opt.value }));
                                }}
                                style={[S.chip, {
                                  backgroundColor: active ? fCol + "18" : colors.surface,
                                  borderColor:     active ? fCol + "70" : colors.surfaceBorder,
                                  borderWidth:     active ? 1.5 : 1,
                                }]}
                              >
                                <Text style={[S.chipText, { color: active ? fCol : colors.text }]}>{opt.label}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      )}

                      {/* Text / password / multiline input */}
                      {!isSelect && (
                        <View style={[S.inputCard, {
                          backgroundColor: colors.surface,
                          borderColor:     filled ? fCol + "60" : colors.surfaceBorder,
                          borderWidth:     filled ? 1.5 : 1,
                        }]}>
                          <TextInput
                            style={[S.inputText, { color: colors.text }]}
                            value={val}
                            onChangeText={v => setValues(prev => ({ ...prev, [f.key]: v }))}
                            placeholder={f.placeholder ?? ""}
                            placeholderTextColor={colors.textMuted}
                            keyboardType={kbType(f.type)}
                            secureTextEntry={isSecure}
                            multiline={isMulti}
                            numberOfLines={isMulti ? 3 : 1}
                            autoCapitalize={f.type === "url" || f.type === "email" ? "none" : "sentences"}
                            autoCorrect={false}
                            selectTextOnFocus
                          />
                          {filled && <Ionicons name="checkmark-circle" size={18} color={fCol} />}
                        </View>
                      )}

                      {/* Hint */}
                      {f.hint && (
                        <Text style={[S.hintText, { color: colors.textMuted }]}>{f.hint}</Text>
                      )}
                    </Reanimated.View>
                  );
                })}
              </View>
            )}

            {/* ── Blank / custom fields ── */}
            {isBlank && (
              <View style={{ gap: 10 }}>
                {/* Example card */}
                <View style={[S.exampleCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                  <View style={S.exampleHdr}>
                    <Ionicons name="eye-outline" size={13} color={colors.textMuted} />
                    <Text style={[S.exampleHdrTxt, { color: colors.textMuted }]}>EXAMPLE — WHAT GETS BAKED INTO THE QR</Text>
                  </View>
                  {[
                    { l: "Shop Name", v: "Ramesh Stores" },
                    { l: "Phone",     v: "+91 98765 43210" },
                    { l: "Address",   v: "Shop 4, MG Road" },
                  ].map((row, i) => (
                    <View key={i} style={S.exampleRow}>
                      <View style={[S.exampleDot, { backgroundColor: colors.primary }]} />
                      <Text style={[S.exampleLbl, { color: colors.textMuted }]}>{row.l}:</Text>
                      <Text style={[S.exampleVal, { color: colors.textSecondary }]}>{row.v}</Text>
                    </View>
                  ))}
                </View>

                {/* Row header */}
                <View style={S.rowBetween}>
                  <Text style={[S.sectionLbl, { color: colors.textMuted }]}>YOUR ROWS</Text>
                  <Pressable
                    onPress={addBlankField}
                    style={[S.addBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}
                  >
                    <Ionicons name="add" size={14} color={colors.primary} />
                    <Text style={[S.addBtnTxt, { color: colors.primary }]}>Add row</Text>
                  </Pressable>
                </View>

                {blankFields.map((f, i) => {
                  const filled = f.label.trim().length > 0 && f.value.trim().length > 0;
                  return (
                    <Reanimated.View key={f.id} entering={FadeInDown.duration(150).delay(i * 15)}>
                      <View style={S.blankRowWrap}>
                        <FieldCircle filled={filled} required color={colors.primary} />
                        <View style={[S.blankRow, {
                          backgroundColor: colors.surface,
                          borderColor: filled ? colors.primary + "55" : colors.surfaceBorder,
                          flex: 1,
                        }]}>
                          <TextInput
                            style={[S.blankLabel, { color: colors.textSecondary, borderRightColor: colors.surfaceBorder }]}
                            value={f.label}
                            onChangeText={v => updateBlankField(f.id, { label: v })}
                            placeholder={i === 0 ? "e.g. Name" : i === 1 ? "e.g. Phone" : "Label"}
                            placeholderTextColor={colors.textMuted}
                            selectTextOnFocus
                          />
                          <TextInput
                            style={[S.blankValue, { color: colors.text }]}
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

            {/* ── Live mini QR preview ── */}
            {liveQrContent.length > 3 && liveQrContent.length < 800 && (
              <Reanimated.View entering={FadeIn.duration(300)}>
                <View style={[S.livePreviewCard, { backgroundColor: colors.surface, borderColor: fCol + "30" }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.livePreviewLabel, { color: fCol }]}>LIVE PREVIEW</Text>
                    <Text style={[S.livePreviewContent, { color: colors.textSecondary }]} numberOfLines={3}>
                      {liveQrContent}
                    </Text>
                  </View>
                  <View style={[S.liveQrWrap, { backgroundColor: "#fff" }]}>
                    <QRCode value={liveQrContent} size={80} color="#000" backgroundColor="#fff" />
                  </View>
                </View>
              </Reanimated.View>
            )}

            {/* ── Generate button ── */}
            <View style={{ marginTop: 20, gap: 10 }}>
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
                  colors={canGenerate ? [fCol, fCol + "CC"] : [colors.surfaceLight, colors.surfaceLight]}
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
                  {isBlank
                    ? "Fill at least one row with a label and value"
                    : "Fill in all required fields above"}
                </Text>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Reanimated.View>
    );
  }

  /* ══════════════════════════════════════════════════════════
     OUTPUT  VIEW
  ══════════════════════════════════════════════════════════ */
  const oCol    = isBlank ? colors.primary : catColor(selectedId ?? "");
  const oIcon: any = isBlank ? "create-outline" : (selectedCat?.icon ?? "qr-code-outline");
  const badge   = securityBadge(qrContent);
  const canRender = qrContent.length > 0 && qrContent.length < 2000;

  const themes: { key: QrTheme; label: string }[] = [
    { key: "classic", label: "Classic" },
    { key: "dark",    label: "Dark" },
    { key: "branded", label: "Branded" },
  ];

  return (
    <Reanimated.View entering={SlideInRight.duration(230)} style={[S.root, { backgroundColor: colors.background }]}>
      <View style={{ height: topInset }} />

      {/* ── Header ── */}
      <View style={S.header}>
        <Pressable onPress={() => setView("form")} style={[S.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
        </Pressable>
        <View style={[S.formIconCircle, { width: 36, height: 36, borderRadius: 18, backgroundColor: oCol + "18" }]}>
          <Ionicons name={oIcon} size={17} color={oCol} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[S.headerTitle, { color: colors.text }]}>QR Ready</Text>
          <Text style={[S.headerSub, { color: colors.textMuted }]}>{qrLabel}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[S.outputScroll, { paddingHorizontal: SIDE_PAD, paddingBottom: tabBarH + 16 }]}
      >
        <Reanimated.View entering={FadeIn.duration(360)} style={{ gap: 14 }}>

          {/* ── QR Card ── */}
          <View style={[S.qrCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            {/* Top meta row */}
            <View style={S.qrCardTop}>
              <View style={[S.catBadge, { backgroundColor: oCol + "18", borderColor: oCol + "40" }]}>
                <Ionicons name={oIcon} size={11} color={oCol} />
                <Text style={[S.catBadgeText, { color: oCol }]}>{qrLabel}</Text>
              </View>
              <View style={[S.secBadge, { backgroundColor: badge.color + "12", borderColor: badge.color + "35" }]}>
                <Ionicons name={badge.icon} size={11} color={badge.color} />
                <Text style={[S.secBadgeText, { color: badge.color }]} numberOfLines={1}>{badge.label}</Text>
              </View>
            </View>

            {/* Theme switcher */}
            <View style={[S.themeRow, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
              {themes.map(t => {
                const active = qrTheme === t.key;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setQrTheme(t.key); }}
                    style={[S.themeBtn, active && {
                      backgroundColor: t.key === "branded" ? oCol + "18" : t.key === "dark" ? "#0F172A" : "#fff",
                      borderColor: active ? (t.key === "dark" ? "#E2E8F0" : oCol) : "transparent",
                      borderWidth: active ? 1.5 : 0,
                    }]}
                  >
                    <Text style={[S.themeBtnTxt, {
                      color: active
                        ? t.key === "dark" ? "#E2E8F0" : t.key === "branded" ? oCol : "#111"
                        : colors.textMuted,
                    }]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* QR Code */}
            <View style={[S.qrWrapper, { backgroundColor: qrColors.bg, borderRadius: 16 }]}>
              {canRender ? (
                <QRCode
                  value={qrContent}
                  size={220}
                  color={qrColors.fg}
                  backgroundColor={qrColors.bg}
                />
              ) : (
                <View style={S.qrError}>
                  <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
                  <Text style={[S.qrErrorTxt, { color: colors.textMuted }]}>
                    Content is too long for a QR code.{"\n"}Try shorter values.
                  </Text>
                </View>
              )}
            </View>

            {/* Encoded content */}
            <View style={[S.encodedBox, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
              <Text style={[S.encodedLabel, { color: colors.textMuted }]}>ENCODED CONTENT</Text>
              <Text style={[S.encodedText, { color: colors.textSecondary }]} numberOfLines={4} selectable>
                {qrContent}
              </Text>
            </View>
          </View>

          {/* ── Action buttons ── */}
          <View style={S.actionRow}>
            <Pressable
              onPress={handleCopy}
              style={({ pressed }) => [S.actionBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.7 : 1, flex: 1 }]}
            >
              <Ionicons name="copy-outline" size={20} color={colors.text} />
              <Text style={[S.actionBtnTxt, { color: colors.text }]}>Copy</Text>
            </Pressable>

            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [S.actionBtn, { backgroundColor: oCol + "18", borderColor: oCol + "50", opacity: pressed ? 0.7 : 1, flex: 1 }]}
            >
              <Ionicons name="share-outline" size={20} color={oCol} />
              <Text style={[S.actionBtnTxt, { color: oCol }]}>Share</Text>
            </Pressable>
          </View>

          {/* ── Create another ── */}
          <Pressable
            onPress={resetAll}
            style={({ pressed }) => [S.anotherBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.textSecondary} />
            <Text style={[S.anotherBtnTxt, { color: colors.textSecondary }]}>Create Another QR</Text>
          </Pressable>

          {/* ── Back to home ── */}
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [S.homeBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="home-outline" size={13} color={colors.textMuted} />
            <Text style={[S.homeBtnTxt, { color: colors.textMuted }]}>Back to Generator Home</Text>
          </Pressable>
        </Reanimated.View>
      </ScrollView>
    </Reanimated.View>
  );
}

export default memo(CustomQrBuilderPage);

/* ─────────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────────── */

/** Circle tile in the category picker */
const CircleTile = memo(function CircleTile({
  cat, size, circleD, onPress,
}: { cat: CategorySchema; size: number; circleD: number; onPress: () => void }) {
  const { colors } = useTheme();
  const col = catColor(cat.id);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        S.circleTile,
        { width: size, opacity: pressed ? 0.65 : 1, transform: [{ scale: pressed ? 0.9 : 1 }] },
      ]}
    >
      <View style={[S.circleIcon, {
        width: circleD, height: circleD,
        borderRadius: circleD / 2,
        backgroundColor: col + "18",
        borderColor: col + "40",
      }]}>
        <Ionicons name={cat.icon as any} size={Math.floor(circleD * 0.43)} color={col} />
        {cat.isIndiaFirst && (
          <View style={S.indiaFlag}>
            <Text style={{ fontSize: 7 }}>🇮🇳</Text>
          </View>
        )}
      </View>
      <Text style={[S.circleTileLabel, { color: colors.textSecondary }]} numberOfLines={2}>
        {cat.name}
      </Text>
    </Pressable>
  );
});

/** Small field-status circle (empty ring → filled checkmark) */
const FieldCircle = memo(function FieldCircle({
  filled, required, color,
}: { filled: boolean; required: boolean; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={[S.fieldCircle, {
      borderColor:     filled ? color : required ? colors.surfaceBorder : colors.surfaceLight,
      backgroundColor: filled ? color + "18" : "transparent",
    }]}>
      {filled
        ? <Ionicons name="checkmark" size={10} color={color} />
        : <View style={[S.fieldCircleDot, { backgroundColor: required ? colors.surfaceBorder : colors.surfaceLight }]} />
      }
    </View>
  );
});

/* ─────────────────────────────────────────────────────────────
   STYLES
───────────────────────────────────────────────────────────── */
const S = StyleSheet.create({
  root: { flex: 1 },

  /* Header */
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, borderWidth: 1,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  headerSub:   { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  formIconCircle: { alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 10 },

  /* Search */
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: {
    flex: 1, fontSize: 14, fontFamily: "Inter_400Regular",
  },

  /* Picker scroll */
  pickScroll: { gap: 18, paddingTop: 2 },

  groupHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  groupEmoji:  { fontSize: 14 },
  groupLabel:  { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.9 },
  groupLine:   { flex: 1, height: StyleSheet.hairlineWidth },

  tilesRow: { flexDirection: "row", flexWrap: "wrap" },

  /* Circle tile */
  circleTile: { alignItems: "center", gap: 5, marginBottom: 12 },
  circleIcon: {
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, position: "relative",
  },
  indiaFlag: {
    position: "absolute", bottom: 2, right: 2,
    backgroundColor: "#fff", borderRadius: 5, padding: 1,
  },
  circleTileLabel: {
    fontSize: 9.5, fontFamily: "Inter_500Medium",
    textAlign: "center", lineHeight: 12,
  },

  /* Search results */
  searchRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 13, paddingVertical: 11,
  },
  searchRowIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  searchRowName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  searchRowDesc: { fontSize: 11.5, fontFamily: "Inter_400Regular", marginTop: 1 },
  flagBadge:     { fontSize: 12 },
  catBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 6, borderWidth: 1,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  catBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },

  emptySearch: {
    alignItems: "center", gap: 8,
    borderRadius: 14, borderWidth: 1, borderStyle: "dashed",
    paddingVertical: 28,
  },
  emptySearchText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emptySearchSub:  { fontSize: 12, fontFamily: "Inter_400Regular" },

  /* Blank card */
  blankCard: { borderRadius: 18, borderWidth: 1.5, overflow: "hidden" },
  blankCardGrad: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 16, paddingVertical: 16,
  },
  blankCardIcon:  { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  blankCardTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 3 },
  blankCardSub:   { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },

  /* Form */
  progressWrap:   { gap: 5, marginBottom: 10 },
  progressTrack:  { height: 4, borderRadius: 3, overflow: "hidden" },
  progressFill:   { height: 4, borderRadius: 3 },
  progressLabel:  { fontSize: 11, fontFamily: "Inter_500Medium" },

  formScroll: { gap: 0, paddingTop: 4 },

  fieldLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 7 },
  fieldCircle: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  fieldCircleDot: { width: 6, height: 6, borderRadius: 3 },
  fieldLabel:     { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1 },
  optionalPill: {
    borderRadius: 6, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2,
  },
  optionalPillText: { fontSize: 9, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  hintText: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4, marginLeft: 28 },

  inputCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, gap: 8,
    marginBottom: 2,
  },
  inputText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 2 },
  chip: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  /* Blank fields */
  exampleCard: { borderRadius: 14, borderWidth: 1, padding: 13, gap: 6, marginBottom: 4 },
  exampleHdr:   { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  exampleHdrTxt: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  exampleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  exampleDot: { width: 5, height: 5, borderRadius: 3 },
  exampleLbl: { fontSize: 12, fontFamily: "Inter_600SemiBold", minWidth: 70 },
  exampleVal: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },

  sectionLbl: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.7 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  addBtn:     { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 9, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  addBtnTxt:  { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  blankRowWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  blankRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1.5, overflow: "hidden",
  },
  blankLabel: {
    width: 96, paddingHorizontal: 11, paddingVertical: 12,
    fontSize: 13, fontFamily: "Inter_600SemiBold",
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  blankValue: {
    flex: 1, paddingHorizontal: 11, paddingVertical: 12,
    fontSize: 13, fontFamily: "Inter_400Regular",
  },
  removeBtn: { paddingHorizontal: 10 },

  /* Live preview */
  livePreviewCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1.5,
    padding: 12, marginTop: 6,
  },
  livePreviewLabel:   { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.9, marginBottom: 4 },
  livePreviewContent: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  liveQrWrap: {
    borderRadius: 10, padding: 6, flexShrink: 0,
    alignItems: "center", justifyContent: "center",
  },

  /* Generate button */
  generateBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16, borderRadius: 18,
  },
  generateBtnTxt: { fontSize: 16, fontFamily: "Inter_700Bold" },
  disabledHint:   { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },

  /* Output */
  outputScroll: { paddingTop: 4 },

  qrCard: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 14, alignItems: "center" },
  qrCardTop: {
    flexDirection: "row", alignItems: "center",
    gap: 8, width: "100%", flexWrap: "wrap",
  },
  secBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 4, flex: 1,
  },
  secBadgeText: { fontSize: 10, fontFamily: "Inter_500Medium", flex: 1 },

  themeRow: {
    flexDirection: "row", borderRadius: 12, borderWidth: 1,
    padding: 3, gap: 2, width: "100%",
  },
  themeBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    borderRadius: 9, paddingVertical: 7,
  },
  themeBtnTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  qrWrapper: { padding: 16, alignItems: "center", justifyContent: "center" },
  qrError: { width: 220, height: 220, alignItems: "center", justifyContent: "center", gap: 10 },
  qrErrorTxt: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },

  encodedBox: { width: "100%", borderRadius: 12, borderWidth: 1, padding: 11, gap: 5 },
  encodedLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.9 },
  encodedText:  { fontSize: 11.5, fontFamily: "Inter_400Regular", lineHeight: 16 },

  /* Actions */
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, borderWidth: 1, paddingVertical: 13,
  },
  actionBtnTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  anotherBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, borderWidth: 1, paddingVertical: 12,
  },
  anotherBtnTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  homeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10,
  },
  homeBtnTxt: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
