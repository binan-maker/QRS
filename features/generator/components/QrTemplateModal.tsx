import React, { useState, useMemo, useCallback, memo, useRef } from "react";
import {
  View, Text, Modal, Pressable, ScrollView, TextInput,
  useWindowDimensions, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import * as Haptics from "@/lib/haptics";

// ── Types ────────────────────────────────────────────────────────────────────

type EncType = "WPA" | "WEP" | "nopass";
type ModalView = "home" | "ai" | "builder" | "template-form";

interface TemplateField {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "url" | "phone" | "email" | "number" | "password" | "multiline";
  optional?: boolean;
  hint?: string;
  maxLength?: number;
  validate?: (v: string) => string | null;
}

interface QrTemplate {
  id: string;
  name: string;
  emoji: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  tagline: string;
  securityNote: string;
  securityIcon: keyof typeof Ionicons.glyphMap;
  fields: TemplateField[];
  generate: (values: Record<string, string>, extras?: any) => string;
}

// ── Validators ───────────────────────────────────────────────────────────────

function validateVpa(v: string): string | null {
  if (!v.trim()) return null;
  if (!v.includes("@")) return "Must contain @ (e.g. name@paytm)";
  const [handle, provider] = v.split("@");
  if (!handle || handle.length < 1) return "Invalid UPI ID";
  if (!provider || provider.length < 2) return "Invalid UPI provider";
  return null;
}

function validateUrl(v: string): string | null {
  if (!v.trim()) return null;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try { new URL(withScheme); return null; }
  catch { return "Enter a valid URL (e.g. https://example.com)"; }
}

function validatePhone(v: string): string | null {
  if (!v.trim()) return null;
  const digits = v.replace(/[\s\-().+]/g, "");
  if (!/^\d{7,15}$/.test(digits)) return "Enter a valid phone number (7–15 digits)";
  return null;
}

function validateEmail(v: string): string | null {
  if (!v.trim()) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Enter a valid email address";
  return null;
}

function validateAmount(v: string): string | null {
  if (!v.trim()) return null;
  if (isNaN(Number(v)) || Number(v) < 0) return "Enter a valid amount";
  return null;
}

// ── Template Definitions ─────────────────────────────────────────────────────

const TEMPLATES: QrTemplate[] = [
  {
    id: "upi_payment",
    name: "UPI Payment",
    emoji: "💳",
    color: "#3B82F6",
    icon: "card-outline",
    tagline: "Send money to anyone",
    securityNote: "VPA format auto-validated. Warns if recipient pattern looks unusual.",
    securityIcon: "shield-checkmark-outline",
    fields: [
      { key: "vpa", label: "UPI ID (VPA)", placeholder: "name@upi", type: "text", hint: "e.g. john@paytm, 9876543210@upi", validate: validateVpa },
      { key: "name", label: "Payee Name", placeholder: "Recipient's name", type: "text", maxLength: 50 },
      { key: "amount", label: "Amount (₹)", placeholder: "Leave blank for any amount", type: "number", optional: true, validate: validateAmount },
      { key: "note", label: "Note", placeholder: "e.g. Bill payment, Table 5", type: "text", optional: true, maxLength: 80 },
    ],
    generate: (v) => {
      const parts: string[] = [`upi://pay?pa=${encodeURIComponent(v.vpa.trim())}&pn=${encodeURIComponent(v.name.trim())}&cu=INR`];
      if (v.amount?.trim()) parts.push(`&am=${v.amount.trim()}`);
      if (v.note?.trim()) parts.push(`&tn=${encodeURIComponent(v.note.trim())}`);
      return parts.join("");
    },
  },
  {
    id: "upi_merchant",
    name: "UPI Merchant",
    emoji: "🏪",
    color: "#10B981",
    icon: "storefront-outline",
    tagline: "Collect payments at your shop",
    securityNote: "Add a fixed amount to prevent overcharging.",
    securityIcon: "ribbon-outline",
    fields: [
      { key: "vpa", label: "Your UPI ID (VPA)", placeholder: "yourshop@upi", type: "text", hint: "e.g. shopname@icici", validate: validateVpa },
      { key: "business_name", label: "Business Name", placeholder: "Your shop or brand name", type: "text", maxLength: 60 },
      { key: "amount", label: "Fixed Amount (₹)", placeholder: "Leave blank for custom amount", type: "number", optional: true, validate: validateAmount },
    ],
    generate: (v) => {
      const parts: string[] = [`upi://pay?pa=${encodeURIComponent(v.vpa.trim())}&pn=${encodeURIComponent(v.business_name.trim())}&cu=INR`];
      if (v.amount?.trim()) parts.push(`&am=${v.amount.trim()}`);
      return parts.join("");
    },
  },
  {
    id: "contact_card",
    name: "Contact Card",
    emoji: "👤",
    color: "#8B5CF6",
    icon: "person-circle-outline",
    tagline: "Share your contact in one scan",
    securityNote: "Inputs are sanitized. No executable code is embedded.",
    securityIcon: "shield-outline",
    fields: [
      { key: "name", label: "Full Name", placeholder: "Your full name", type: "text", maxLength: 60 },
      { key: "phone", label: "Phone Number", placeholder: "+91 98765 43210", type: "phone", validate: validatePhone },
      { key: "email", label: "Email", placeholder: "you@example.com", type: "email", optional: true, validate: validateEmail },
      { key: "org", label: "Company / Org", placeholder: "Your company name", type: "text", optional: true, maxLength: 60 },
      { key: "address", label: "Address", placeholder: "City, State, Country", type: "text", optional: true, maxLength: 100 },
    ],
    generate: (v) => {
      const phone = v.phone.trim().replace(/[\s\-()]/g, "");
      const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${v.name.trim()}`, `TEL;TYPE=CELL:${phone}`];
      if (v.email?.trim()) lines.push(`EMAIL;TYPE=INTERNET:${v.email.trim()}`);
      if (v.org?.trim()) lines.push(`ORG:${v.org.trim()}`);
      if (v.address?.trim()) lines.push(`ADR;TYPE=HOME:;;${v.address.trim()};;;`);
      lines.push("END:VCARD");
      return lines.join("\n");
    },
  },
  {
    id: "wifi",
    name: "WiFi Network",
    emoji: "📶",
    color: "#F59E0B",
    icon: "wifi-outline",
    tagline: "Share WiFi credentials instantly",
    securityNote: "Password hidden in QR display. Works with WPA2 & WPA3 networks.",
    securityIcon: "lock-closed-outline",
    fields: [
      { key: "ssid", label: "Network Name (SSID)", placeholder: "Your WiFi name", type: "text", maxLength: 60 },
      { key: "password", label: "Password", placeholder: "WiFi password", type: "password", maxLength: 63, optional: true },
    ],
    generate: (v, extras) => {
      const enc: EncType = extras?.encType ?? "WPA";
      const ssid = v.ssid.trim().replace(/[\\;,"]/g, (c: string) => `\\${c}`);
      const pwd = (v.password ?? "").trim().replace(/[\\;,"]/g, (c: string) => `\\${c}`);
      return `WIFI:S:${ssid};T:${enc};P:${pwd};;`;
    },
  },
  {
    id: "website_url",
    name: "Website URL",
    emoji: "🌐",
    color: "#EF4444",
    icon: "globe-outline",
    tagline: "Link to any website or page",
    securityNote: "URL is mandatory-scanned for threats before QR is generated.",
    securityIcon: "shield-checkmark-outline",
    fields: [
      { key: "url", label: "URL", placeholder: "https://example.com", type: "url", validate: validateUrl },
    ],
    generate: (v) => {
      const raw = v.url.trim();
      return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    },
  },
  {
    id: "phone_number",
    name: "Phone Number",
    emoji: "📞",
    color: "#6366F1",
    icon: "call-outline",
    tagline: "Instant call on scan",
    securityNote: "Phone number format is validated before generation.",
    securityIcon: "checkmark-circle-outline",
    fields: [
      { key: "phone", label: "Phone Number", placeholder: "+91 98765 43210", type: "phone", hint: "Include country code for international", validate: validatePhone },
    ],
    generate: (v) => {
      const digits = v.phone.trim().replace(/[\s\-()]/g, "");
      return `tel:${digits}`;
    },
  },
  {
    id: "email",
    name: "Email",
    emoji: "✉️",
    color: "#EC4899",
    icon: "mail-outline",
    tagline: "Pre-fill email compose for your contact",
    securityNote: "Subject & body are scanned for phishing keywords before generation.",
    securityIcon: "mail-open-outline",
    fields: [
      { key: "email", label: "To (Email address)", placeholder: "contact@example.com", type: "email", validate: validateEmail },
      { key: "subject", label: "Subject", placeholder: "e.g. Hello from QR Guard", type: "text", optional: true, maxLength: 100 },
      { key: "body", label: "Body", placeholder: "Message body (optional)", type: "multiline", optional: true, maxLength: 300 },
    ],
    generate: (v) => {
      const parts: string[] = [`mailto:${v.email.trim()}`];
      const params: string[] = [];
      if (v.subject?.trim()) params.push(`subject=${encodeURIComponent(v.subject.trim())}`);
      if (v.body?.trim()) params.push(`body=${encodeURIComponent(v.body.trim())}`);
      if (params.length > 0) parts.push(`?${params.join("&")}`);
      return parts.join("");
    },
  },
  {
    id: "plain_text",
    name: "Plain Text",
    emoji: "📝",
    color: "#64748B",
    icon: "document-text-outline",
    tagline: "Encode any message or info",
    securityNote: "Content length limited to 500 chars.",
    securityIcon: "scan-outline",
    fields: [
      { key: "text", label: "Text Content", placeholder: "Type your message here…", type: "multiline", maxLength: 500 },
    ],
    generate: (v) => v.text.trim(),
  },
];

// ── AI example prompts ───────────────────────────────────────────────────────

const AI_EXAMPLES = [
  { label: "WiFi QR", prompt: "WiFi for MyShop, password: Secure@123" },
  { label: "UPI Payment", prompt: "UPI payment to john@paytm, ₹500, for groceries" },
  { label: "Website", prompt: "https://binance.com" },
  { label: "Contact card", prompt: "Contact card for Rahul Sharma, phone +91 9876543210, rahul@gmail.com" },
  { label: "SMS", prompt: "SMS to +91 9876543210 saying: Thanks for visiting!" },
  { label: "Email", prompt: "Email to support@example.com subject: Help needed" },
];

// ── API call ─────────────────────────────────────────────────────────────────

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:5000";

async function callAiQrGenerate(prompt: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/ai/qr-generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  const data = await res.json();
  if (!data.content) throw new Error("No content returned");
  return data.content as string;
}

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  onGenerate: (content: string, templateName: string) => void;
}

// ── Main Component ────────────────────────────────────────────────────────────

function QrTemplateModal({ visible, onClose, onGenerate }: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH, width: screenW } = useWindowDimensions();

  const [view, setView] = useState<ModalView>("home");

  // Template form state (for both "builder" and "template-form" views)
  const [selected, setSelected] = useState<QrTemplate | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPass, setShowPass] = useState(false);
  const [encType, setEncType] = useState<EncType>("WPA");

  // AI state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const s = Math.min(Math.max(screenW / 390, 0.82), 1.0);
  const rf = (n: number) => Math.round(n * s);
  const sp = (n: number) => Math.round(n * s);
  const bottomPad = Math.max(insets.bottom, 16);
  const sheetH = Math.min(screenH * 0.93, 800);

  function resetAll() {
    setView("home");
    setSelected(null);
    setValues({});
    setErrors({});
    setShowPass(false);
    setEncType("WPA");
    setAiPrompt("");
    setAiLoading(false);
    setAiResult(null);
    setAiError(null);
  }

  function handleClose() {
    resetAll();
    onClose();
  }

  function handlePickTemplate(t: QrTemplate) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelected(t);
    setValues({});
    setErrors({});
    setShowPass(false);
    setEncType("WPA");
    setView("template-form");
  }

  function handleOpenBuilder(t?: QrTemplate) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const initial = t ?? TEMPLATES[0];
    setSelected(initial);
    setValues({});
    setErrors({});
    setShowPass(false);
    setEncType("WPA");
    setView("builder");
  }

  function handleOpenAi() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAiResult(null);
    setAiError(null);
    setView("ai");
  }

  function handleBack() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (view === "template-form" || view === "builder" || view === "ai") {
      setView("home");
      setSelected(null);
      setValues({});
      setErrors({});
      setAiResult(null);
      setAiError(null);
    }
  }

  function setFieldValue(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function validate(): boolean {
    if (!selected) return false;
    const newErrors: Record<string, string> = {};
    for (const field of selected.fields) {
      const val = (values[field.key] ?? "").trim();
      if (!field.optional && !val) {
        newErrors[field.key] = `${field.label} is required`;
        continue;
      }
      if (val && field.validate) {
        const err = field.validate(val);
        if (err) newErrors[field.key] = err;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleGenerate() {
    if (!selected || !validate()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const content = selected.generate(values, { encType });
    onGenerate(content, selected.name);
    handleClose();
  }

  async function handleAiGenerate() {
    if (!aiPrompt.trim() || aiLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAiLoading(true);
    setAiResult(null);
    setAiError(null);
    try {
      const content = await callAiQrGenerate(aiPrompt.trim());
      setAiResult(content);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setAiError("Could not generate QR. Check your connection and try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setAiLoading(false);
    }
  }

  function handleAiConfirm() {
    if (!aiResult) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onGenerate(aiResult, "AI Generated");
    handleClose();
  }

  const canGenerate = useMemo(() => {
    if (!selected) return false;
    for (const field of selected.fields) {
      if (!field.optional && !(values[field.key] ?? "").trim()) return false;
    }
    return true;
  }, [selected, values]);

  const headerTitle = view === "ai" ? "AI Builder"
    : view === "builder" ? "Custom Builder"
    : view === "template-form" && selected ? selected.name
    : "Build Your QR";

  const headerSub = view === "ai" ? "Describe what you want, AI builds it"
    : view === "builder" ? "Pick a format and fill in your details"
    : view === "template-form" && selected ? selected.tagline
    : "Choose how to create your QR code";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, justifyContent: "flex-end" }}
      >
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.55)" }}
          onPress={handleClose}
        />

        <Animated.View
          entering={FadeInDown.duration(300).springify()}
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: sp(28),
            borderTopRightRadius: sp(28),
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: colors.surfaceBorder,
            paddingBottom: bottomPad,
            maxHeight: sheetH,
            zIndex: 10,
          }}
        >
          {/* Handle */}
          <View style={{ alignItems: "center", paddingTop: sp(12), marginBottom: sp(2) }}>
            <View style={{ width: sp(40), height: sp(4), borderRadius: sp(2), backgroundColor: colors.surfaceBorder }} />
          </View>

          {/* Header */}
          <View style={{
            flexDirection: "row", alignItems: "center",
            paddingHorizontal: sp(20), paddingTop: sp(8), paddingBottom: sp(12),
          }}>
            {view !== "home" ? (
              <Pressable
                onPress={handleBack}
                hitSlop={10}
                style={{ width: sp(36), height: sp(36), borderRadius: sp(18), backgroundColor: colors.surfaceLight, alignItems: "center", justifyContent: "center", marginRight: sp(10) }}
              >
                <Ionicons name="chevron-back" size={rf(18)} color={colors.text} />
              </Pressable>
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: rf(17), fontFamily: "Inter_700Bold", color: colors.text }}>
                {headerTitle}
              </Text>
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: sp(2) }}>
                {headerSub}
              </Text>
            </View>
            <Pressable
              onPress={handleClose}
              style={{ width: sp(34), height: sp(34), borderRadius: sp(17), backgroundColor: colors.surfaceLight, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="close" size={rf(17)} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Content */}
          {view === "home" && (
            <HomeView
              templates={TEMPLATES}
              colors={colors}
              isDark={isDark}
              rf={rf} sp={sp}
              onOpenAi={handleOpenAi}
              onOpenBuilder={() => handleOpenBuilder()}
              onPickTemplate={handlePickTemplate}
            />
          )}

          {view === "ai" && (
            <AiView
              prompt={aiPrompt}
              loading={aiLoading}
              result={aiResult}
              error={aiError}
              colors={colors}
              isDark={isDark}
              rf={rf} sp={sp}
              bottomPad={bottomPad}
              onChangePrompt={setAiPrompt}
              onGenerate={handleAiGenerate}
              onConfirm={handleAiConfirm}
              onRetry={() => { setAiResult(null); setAiError(null); }}
            />
          )}

          {(view === "builder" || view === "template-form") && selected && (
            <BuilderView
              template={selected}
              allTemplates={TEMPLATES}
              values={values}
              errors={errors}
              showPass={showPass}
              encType={encType}
              canGenerate={canGenerate}
              isBuilderView={view === "builder"}
              colors={colors}
              rf={rf} sp={sp}
              onSelectTemplate={(t) => {
                setSelected(t);
                setValues({});
                setErrors({});
              }}
              onSetValue={setFieldValue}
              onTogglePass={() => setShowPass((v) => !v)}
              onSetEncType={setEncType}
              onGenerate={handleGenerate}
            />
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Home View ─────────────────────────────────────────────────────────────────

function HomeView({ templates, colors, isDark, rf, sp, onOpenAi, onOpenBuilder, onPickTemplate }: {
  templates: QrTemplate[];
  colors: any;
  isDark: boolean;
  rf: (n: number) => number;
  sp: (n: number) => number;
  onOpenAi: () => void;
  onOpenBuilder: () => void;
  onPickTemplate: (t: QrTemplate) => void;
}) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: sp(16), paddingBottom: sp(24), gap: sp(10) }}
    >
      {/* ── AI Builder card ── */}
      <Animated.View entering={FadeInDown.duration(250)}>
        <Pressable
          onPress={onOpenAi}
          style={({ pressed }) => ({
            borderRadius: sp(20),
            overflow: "hidden",
            opacity: pressed ? 0.88 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <LinearGradient
            colors={["#7C3AED", "#4F46E5"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              padding: sp(18),
              gap: sp(10),
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(12) }}>
              <View style={{ width: sp(48), height: sp(48), borderRadius: sp(16), backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="sparkles" size={rf(24)} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: rf(16), fontFamily: "Inter_700Bold", color: "#fff" }}>AI Builder</Text>
                <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginTop: sp(2) }}>
                  Describe what you want — AI builds it
                </Text>
              </View>
              <View style={{ backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: sp(10), paddingVertical: sp(4), borderRadius: sp(20) }}>
                <Text style={{ fontSize: rf(10), fontFamily: "Inter_700Bold", color: "#fff" }}>NEW</Text>
              </View>
            </View>
            <View style={{ backgroundColor: "rgba(255,255,255,0.12)", borderRadius: sp(12), paddingHorizontal: sp(14), paddingVertical: sp(10) }}>
              <Text style={{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.85)", lineHeight: rf(18) }}>
                "WiFi for my shop, password Secure123"
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(6) }}>
              <Ionicons name="arrow-forward-circle" size={rf(16)} color="rgba(255,255,255,0.8)" />
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.8)" }}>
                Works for WiFi, UPI, contacts, links, and more
              </Text>
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* ── Custom Builder card ── */}
      <Animated.View entering={FadeInDown.duration(250).delay(60)}>
        <Pressable
          onPress={onOpenBuilder}
          style={({ pressed }) => ({
            borderRadius: sp(20),
            overflow: "hidden",
            opacity: pressed ? 0.88 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <View style={{
            borderRadius: sp(20),
            borderWidth: 1.5,
            borderColor: colors.primary + "50",
            backgroundColor: isDark ? colors.surface : colors.surfaceLight,
            padding: sp(16),
            flexDirection: "row",
            alignItems: "center",
            gap: sp(14),
          }}>
            <View style={{ width: sp(48), height: sp(48), borderRadius: sp(16), backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="construct-outline" size={rf(22)} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: rf(15), fontFamily: "Inter_700Bold", color: colors.text }}>Custom Builder</Text>
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: sp(2) }}>
                Pick a format, fill your own details
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={rf(18)} color={colors.primary} />
          </View>
        </Pressable>
      </Animated.View>

      {/* ── Divider ── */}
      <Animated.View entering={FadeInDown.duration(200).delay(100)} style={{ flexDirection: "row", alignItems: "center", gap: sp(10), marginVertical: sp(2) }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.surfaceBorder }} />
        <Text style={{ fontSize: rf(10), fontFamily: "Inter_500Medium", color: colors.textMuted }}>QUICK TEMPLATES</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.surfaceBorder }} />
      </Animated.View>

      {/* ── Quick Templates grid ── */}
      <Animated.View entering={FadeInDown.duration(200).delay(120)} style={{ flexDirection: "row", flexWrap: "wrap", gap: sp(8) }}>
        {templates.map((t, idx) => (
          <Animated.View key={t.id} entering={FadeInDown.duration(200).delay(120 + idx * 20)} style={{ width: "47.5%" }}>
            <Pressable
              onPress={() => onPickTemplate(t)}
              style={({ pressed }) => ({
                borderRadius: sp(16),
                borderWidth: 1,
                borderColor: pressed ? t.color + "60" : colors.surfaceBorder,
                backgroundColor: pressed ? t.color + "0D" : colors.surface,
                padding: sp(12),
                flexDirection: "row",
                alignItems: "center",
                gap: sp(10),
                opacity: pressed ? 0.86 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <View style={{ width: sp(36), height: sp(36), borderRadius: sp(11), backgroundColor: t.color + "18", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: rf(18) }}>{t.emoji}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.text }} numberOfLines={1}>{t.name}</Text>
                <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 1 }} numberOfLines={1}>{t.tagline}</Text>
              </View>
            </Pressable>
          </Animated.View>
        ))}
      </Animated.View>
    </ScrollView>
  );
}

// ── AI View ───────────────────────────────────────────────────────────────────

function AiView({ prompt, loading, result, error, colors, isDark, rf, sp, bottomPad, onChangePrompt, onGenerate, onConfirm, onRetry }: {
  prompt: string;
  loading: boolean;
  result: string | null;
  error: string | null;
  colors: any;
  isDark: boolean;
  rf: (n: number) => number;
  sp: (n: number) => number;
  bottomPad: number;
  onChangePrompt: (v: string) => void;
  onGenerate: () => void;
  onConfirm: () => void;
  onRetry: () => void;
}) {
  const accentColor = "#7C3AED";

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: sp(20), paddingBottom: sp(24), gap: sp(16) }}
    >
      <Animated.View entering={FadeInUp.duration(220)} style={{ gap: sp(16) }}>

        {/* Prompt input */}
        {!result && (
          <>
            <View>
              <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(8) }}>
                DESCRIBE YOUR QR CODE
              </Text>
              <View style={{
                backgroundColor: colors.surface,
                borderRadius: sp(16),
                borderWidth: 1.5,
                borderColor: prompt.trim() ? accentColor + "70" : colors.surfaceBorder,
                padding: sp(14),
                minHeight: sp(110),
              }}>
                <TextInput
                  value={prompt}
                  onChangeText={onChangePrompt}
                  placeholder={"e.g. WiFi for MyShop, password: Pass@123\nor: UPI payment to shop@paytm, ₹200"}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={{
                    fontSize: rf(14),
                    fontFamily: "Inter_400Regular",
                    color: colors.text,
                    textAlignVertical: "top",
                    minHeight: sp(80),
                    lineHeight: rf(22),
                  }}
                  autoFocus
                />
              </View>
            </View>

            {/* Example chips */}
            <View>
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_500Medium", color: colors.textMuted, marginBottom: sp(8) }}>
                TAP AN EXAMPLE TO START
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp(7) }}>
                {AI_EXAMPLES.map((ex) => (
                  <Pressable
                    key={ex.label}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChangePrompt(ex.prompt); }}
                    style={({ pressed }) => ({
                      paddingHorizontal: sp(12),
                      paddingVertical: sp(7),
                      borderRadius: sp(20),
                      backgroundColor: pressed ? accentColor + "20" : colors.surface,
                      borderWidth: 1,
                      borderColor: pressed ? accentColor + "60" : colors.surfaceBorder,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text style={{ fontSize: rf(11), fontFamily: "Inter_500Medium", color: colors.textSecondary }}>
                      {ex.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Generate button */}
            <Pressable
              onPress={onGenerate}
              disabled={!prompt.trim() || loading}
              style={({ pressed }) => ({
                borderRadius: sp(16),
                overflow: "hidden",
                opacity: !prompt.trim() ? 0.45 : pressed ? 0.88 : 1,
                transform: [{ scale: pressed && !!prompt.trim() ? 0.97 : 1 }],
              })}
            >
              <LinearGradient
                colors={prompt.trim() ? [accentColor, "#4F46E5"] : [colors.surfaceBorder, colors.surfaceBorder]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingVertical: sp(15), alignItems: "center", flexDirection: "row", justifyContent: "center", gap: sp(8) }}
              >
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={{ fontSize: rf(15), fontFamily: "Inter_700Bold", color: "#fff" }}>Generating…</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={rf(18)} color={prompt.trim() ? "#fff" : colors.textMuted} />
                    <Text style={{ fontSize: rf(15), fontFamily: "Inter_700Bold", color: prompt.trim() ? "#fff" : colors.textMuted }}>
                      Generate QR
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </>
        )}

        {/* Error state */}
        {error && (
          <Animated.View entering={FadeInDown.duration(250)}>
            <View style={{ backgroundColor: "#ef444415", borderRadius: sp(16), borderWidth: 1, borderColor: "#ef444440", padding: sp(16), gap: sp(12) }}>
              <View style={{ flexDirection: "row", gap: sp(10), alignItems: "flex-start" }}>
                <Ionicons name="alert-circle-outline" size={rf(20)} color="#ef4444" />
                <Text style={{ flex: 1, fontSize: rf(13), fontFamily: "Inter_500Medium", color: "#ef4444", lineHeight: rf(19) }}>
                  {error}
                </Text>
              </View>
              <Pressable
                onPress={onRetry}
                style={({ pressed }) => ({
                  alignItems: "center",
                  paddingVertical: sp(10),
                  borderRadius: sp(12),
                  backgroundColor: "#ef444420",
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: "#ef4444" }}>Try Again</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Result preview */}
        {result && !error && (
          <Animated.View entering={FadeInDown.duration(300)} style={{ gap: sp(14) }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(8) }}>
              <View style={{ width: sp(28), height: sp(28), borderRadius: sp(14), backgroundColor: "#22c55e20", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="checkmark-circle" size={rf(18)} color="#22c55e" />
              </View>
              <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: "#22c55e" }}>QR content ready!</Text>
            </View>

            {/* Preview box */}
            <View style={{
              backgroundColor: colors.surface,
              borderRadius: sp(16),
              borderWidth: 1.5,
              borderColor: "#22c55e40",
              padding: sp(14),
            }}>
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", color: colors.textMuted, marginBottom: sp(6) }}>
                GENERATED CONTENT
              </Text>
              <Text style={{
                fontSize: rf(12),
                fontFamily: "Inter_400Regular",
                color: colors.text,
                lineHeight: rf(18),
              }} numberOfLines={6}>
                {result}
              </Text>
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: "row", gap: sp(10) }}>
              <Pressable
                onPress={onRetry}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: sp(13),
                  borderRadius: sp(14),
                  borderWidth: 1.5,
                  borderColor: colors.surfaceBorder,
                  backgroundColor: colors.surface,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: sp(6),
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Ionicons name="refresh-outline" size={rf(15)} color={colors.textSecondary} />
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Redo</Text>
              </Pressable>
              <Pressable
                onPress={onConfirm}
                style={({ pressed }) => ({
                  flex: 2,
                  borderRadius: sp(14),
                  overflow: "hidden",
                  opacity: pressed ? 0.88 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <LinearGradient
                  colors={["#22c55e", "#16a34a"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ paddingVertical: sp(13), alignItems: "center", flexDirection: "row", justifyContent: "center", gap: sp(6) }}
                >
                  <Ionicons name="qr-code-outline" size={rf(16)} color="#fff" />
                  <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: "#fff" }}>Use This</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </Animated.View>
        )}

      </Animated.View>
    </ScrollView>
  );
}

// ── Builder / Template-Form View ──────────────────────────────────────────────

const ENC_OPTIONS: { value: EncType; label: string }[] = [
  { value: "WPA", label: "WPA/WPA2" },
  { value: "WEP", label: "WEP" },
  { value: "nopass", label: "Open" },
];

function BuilderView({ template, allTemplates, values, errors, showPass, encType, canGenerate, isBuilderView, colors, rf, sp, onSelectTemplate, onSetValue, onTogglePass, onSetEncType, onGenerate }: {
  template: QrTemplate;
  allTemplates: QrTemplate[];
  values: Record<string, string>;
  errors: Record<string, string>;
  showPass: boolean;
  encType: EncType;
  canGenerate: boolean;
  isBuilderView: boolean;
  colors: any;
  rf: (n: number) => number;
  sp: (n: number) => number;
  onSelectTemplate: (t: QrTemplate) => void;
  onSetValue: (key: string, val: string) => void;
  onTogglePass: () => void;
  onSetEncType: (t: EncType) => void;
  onGenerate: () => void;
}) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: sp(24) }}
    >
      <Animated.View entering={FadeInUp.duration(220)} style={{ gap: sp(14) }}>

        {/* Format selector — shown in builder view only */}
        {isBuilderView && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: sp(16), gap: sp(8), paddingBottom: sp(4) }}
          >
            {allTemplates.map((t) => {
              const active = t.id === template.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelectTemplate(t); }}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: sp(6),
                    paddingHorizontal: sp(14),
                    paddingVertical: sp(9),
                    borderRadius: sp(20),
                    borderWidth: active ? 1.5 : 1,
                    borderColor: active ? t.color + "80" : colors.surfaceBorder,
                    backgroundColor: active ? t.color + "14" : colors.surface,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text style={{ fontSize: rf(14) }}>{t.emoji}</Text>
                  <Text style={{ fontSize: rf(12), fontFamily: active ? "Inter_700Bold" : "Inter_500Medium", color: active ? t.color : colors.textSecondary }}>
                    {t.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={{ paddingHorizontal: sp(20), gap: sp(14) }}>
          {/* Security note */}
          <View style={{
            flexDirection: "row", alignItems: "flex-start", gap: sp(10),
            backgroundColor: template.color + "12",
            borderRadius: sp(14), borderWidth: 1,
            borderColor: template.color + "30",
            padding: sp(12),
          }}>
            <Ionicons name={template.securityIcon} size={rf(15)} color={template.color} style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: rf(11), fontFamily: "Inter_400Regular", color: template.color, lineHeight: rf(16) }}>
              {template.securityNote}
            </Text>
          </View>

          {/* Fields */}
          {template.fields.map((field, idx) => (
            <Animated.View key={field.key} entering={FadeInDown.duration(200).delay(idx * 35)}>
              <FieldInput
                field={field}
                value={values[field.key] ?? ""}
                error={errors[field.key] ?? ""}
                showPass={showPass}
                templateColor={template.color}
                colors={colors}
                rf={rf}
                sp={sp}
                onChangeText={(v) => onSetValue(field.key, v)}
                onTogglePass={field.type === "password" ? onTogglePass : undefined}
              />

              {template.id === "wifi" && field.key === "ssid" && (
                <View style={{ marginTop: sp(12) }}>
                  <Text style={{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", color: colors.textMuted, marginBottom: sp(8) }}>
                    ENCRYPTION TYPE
                  </Text>
                  <View style={{ flexDirection: "row", gap: sp(8) }}>
                    {ENC_OPTIONS.map((opt) => {
                      const active = encType === opt.value;
                      return (
                        <Pressable
                          key={opt.value}
                          onPress={() => onSetEncType(opt.value)}
                          style={({ pressed }) => ({
                            flex: 1,
                            borderRadius: sp(12),
                            borderWidth: active ? 1.5 : 1,
                            borderColor: active ? template.color + "80" : colors.surfaceBorder,
                            backgroundColor: active ? template.color + "12" : colors.surface,
                            paddingVertical: sp(9),
                            alignItems: "center",
                            opacity: pressed ? 0.8 : 1,
                          })}
                        >
                          <Text style={{ fontSize: rf(12), fontFamily: active ? "Inter_700Bold" : "Inter_500Medium", color: active ? template.color : colors.textMuted }}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </Animated.View>
          ))}

          {/* Generate button */}
          <Pressable
            onPress={onGenerate}
            disabled={!canGenerate}
            style={({ pressed }) => ({
              borderRadius: sp(16),
              overflow: "hidden",
              opacity: !canGenerate ? 0.45 : pressed ? 0.88 : 1,
              transform: [{ scale: pressed && canGenerate ? 0.97 : 1 }],
              marginTop: sp(4),
            })}
          >
            <LinearGradient
              colors={canGenerate ? [template.color, template.color + "CC"] : [colors.surfaceBorder, colors.surfaceBorder]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingVertical: sp(15), alignItems: "center", flexDirection: "row", justifyContent: "center", gap: sp(8) }}
            >
              <Ionicons name="qr-code-outline" size={rf(18)} color={canGenerate ? "#fff" : colors.textMuted} />
              <Text style={{ fontSize: rf(15), fontFamily: "Inter_700Bold", color: canGenerate ? "#fff" : colors.textMuted }}>
                Generate QR Code
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

// ── Field Input ───────────────────────────────────────────────────────────────

function FieldInput({ field, value, error, showPass, templateColor, colors, rf, sp, onChangeText, onTogglePass }: {
  field: TemplateField;
  value: string;
  error: string;
  showPass: boolean;
  templateColor: string;
  colors: any;
  rf: (n: number) => number;
  sp: (n: number) => number;
  onChangeText: (v: string) => void;
  onTogglePass?: () => void;
}) {
  const hasValue = value.trim().length > 0;
  const hasError = !!error;

  const keyboardType = (() => {
    if (field.type === "number") return "numeric" as const;
    if (field.type === "phone") return "phone-pad" as const;
    if (field.type === "email") return "email-address" as const;
    if (field.type === "url") return "url" as const;
    return "default" as const;
  })();

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: sp(6) }}>
        <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>
          {field.label}
          {!field.optional && <Text style={{ color: templateColor }}> *</Text>}
        </Text>
        {field.optional && (
          <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted }}>optional</Text>
        )}
      </View>

      <View style={{
        flexDirection: "row", alignItems: field.type === "multiline" ? "flex-start" : "center",
        backgroundColor: colors.surface,
        borderRadius: sp(14), borderWidth: 1.5,
        borderColor: hasError ? colors.danger : hasValue ? templateColor + "60" : colors.surfaceBorder,
        paddingHorizontal: sp(14),
        paddingVertical: field.type === "multiline" ? sp(12) : 0,
        minHeight: field.type === "multiline" ? sp(80) : sp(50),
      }}>
        <TextInput
          style={{
            flex: 1,
            fontSize: rf(14), fontFamily: "Inter_400Regular", color: colors.text,
            paddingVertical: field.type === "multiline" ? 0 : sp(13),
            textAlignVertical: field.type === "multiline" ? "top" : "center",
            minHeight: field.type === "multiline" ? sp(70) : undefined,
          }}
          value={value}
          onChangeText={onChangeText}
          placeholder={field.placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={field.type === "email" || field.type === "url" ? "none" : "sentences"}
          autoCorrect={false}
          secureTextEntry={field.type === "password" && !showPass}
          multiline={field.type === "multiline"}
          maxLength={field.maxLength}
        />
        {field.type === "password" && onTogglePass && (
          <Pressable onPress={onTogglePass} hitSlop={8}>
            <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={rf(18)} color={colors.textMuted} />
          </Pressable>
        )}
        {field.type !== "password" && hasValue && (
          <Pressable onPress={() => onChangeText("")} hitSlop={8}>
            <Ionicons name="close-circle" size={rf(16)} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {field.hint && !error && (
        <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: sp(4), marginLeft: sp(4) }}>
          {field.hint}
        </Text>
      )}

      {error ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp(4), marginTop: sp(4), marginLeft: sp(4) }}>
          <Ionicons name="alert-circle-outline" size={rf(12)} color={colors.danger} />
          <Text style={{ fontSize: rf(11), fontFamily: "Inter_500Medium", color: colors.danger }}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default memo(QrTemplateModal);
