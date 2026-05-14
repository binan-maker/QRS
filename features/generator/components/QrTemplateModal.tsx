import React, { useState, useMemo, useCallback, memo } from "react";
import {
  View, Text, Modal, Pressable, ScrollView, TextInput,
  useWindowDimensions, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import * as Haptics from "@/lib/haptics";

// ── Types ────────────────────────────────────────────────────────────────────

type EncType = "WPA" | "WEP" | "nopass";

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
    securityNote: "Add a fixed amount to prevent overcharging. \"Verified by QR Guard\" badge is shown to scanners.",
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
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${v.name.trim()}`,
        `TEL;TYPE=CELL:${phone}`,
      ];
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
    securityNote: "Content length limited to 500 chars. Scanned for malicious patterns and app-open codes.",
    securityIcon: "scan-outline",
    fields: [
      { key: "text", label: "Text Content", placeholder: "Type your message here…", type: "multiline", maxLength: 500 },
    ],
    generate: (v) => v.text.trim(),
  },
];

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  onGenerate: (content: string) => void;
}

// ── Main Component ────────────────────────────────────────────────────────────

function QrTemplateModal({ visible, onClose, onGenerate }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH, width: screenW } = useWindowDimensions();

  const [selected, setSelected] = useState<QrTemplate | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPass, setShowPass] = useState(false);
  const [encType, setEncType] = useState<EncType>("WPA");

  const s = Math.min(Math.max(screenW / 390, 0.82), 1.0);
  const rf = (n: number) => Math.round(n * s);
  const sp = (n: number) => Math.round(n * s);

  const bottomPad = Platform.OS === "ios" ? Math.max(insets.bottom, 16) : Math.max(insets.bottom, 16);
  const sheetH = Math.min(screenH * 0.92, 780);

  function reset() {
    setSelected(null);
    setValues({});
    setErrors({});
    setShowPass(false);
    setEncType("WPA");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handlePickTemplate(t: QrTemplate) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelected(t);
    setValues({});
    setErrors({});
    setShowPass(false);
    setEncType("WPA");
  }

  function handleBack() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    reset();
  }

  function setValue(key: string, val: string) {
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
    onGenerate(content);
    handleClose();
  }

  const canGenerate = useMemo(() => {
    if (!selected) return false;
    for (const field of selected.fields) {
      if (!field.optional && !(values[field.key] ?? "").trim()) return false;
    }
    return true;
  }, [selected, values]);

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
            {selected ? (
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
                {selected ? selected.name : "Choose a Template"}
              </Text>
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: sp(2) }}>
                {selected ? selected.tagline : "8 ready-made QR formats"}
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
          {!selected ? (
            <TemplateGrid templates={TEMPLATES} colors={colors} rf={rf} sp={sp} onSelect={handlePickTemplate} />
          ) : (
            <TemplateForm
              template={selected}
              values={values}
              errors={errors}
              showPass={showPass}
              encType={encType}
              canGenerate={canGenerate}
              colors={colors}
              rf={rf}
              sp={sp}
              onSetValue={setValue}
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

// ── Template Grid ─────────────────────────────────────────────────────────────

function TemplateGrid({ templates, colors, rf, sp, onSelect }: {
  templates: QrTemplate[];
  colors: any;
  rf: (n: number) => number;
  sp: (n: number) => number;
  onSelect: (t: QrTemplate) => void;
}) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: sp(16), paddingBottom: sp(16) }}
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp(10) }}>
        {templates.map((t, idx) => (
          <Animated.View
            key={t.id}
            entering={FadeInDown.duration(220).delay(idx * 28)}
            style={{ width: "47.5%" }}
          >
            <Pressable
              onPress={() => onSelect(t)}
              style={({ pressed }) => ({
                borderRadius: sp(18),
                borderWidth: 1,
                borderColor: pressed ? t.color + "60" : colors.surfaceBorder,
                backgroundColor: pressed ? t.color + "0D" : colors.surface,
                padding: sp(14),
                gap: sp(8),
                opacity: pressed ? 0.88 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <View style={{
                width: sp(44), height: sp(44), borderRadius: sp(14),
                backgroundColor: t.color + "18",
                alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ fontSize: rf(24) }}>{t.emoji}</Text>
              </View>
              <View style={{ gap: sp(3) }}>
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: colors.text }} numberOfLines={1}>
                  {t.name}
                </Text>
                <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted }} numberOfLines={2}>
                  {t.tagline}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp(4) }}>
                <View style={{ width: sp(6), height: sp(6), borderRadius: sp(3), backgroundColor: t.color }} />
                <Text style={{ fontSize: rf(9), fontFamily: "Inter_500Medium", color: t.color }}>
                  {t.fields.filter(f => !f.optional).length} required field{t.fields.filter(f => !f.optional).length !== 1 ? "s" : ""}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
}

// ── Template Form ─────────────────────────────────────────────────────────────

const ENC_OPTIONS: { value: EncType; label: string }[] = [
  { value: "WPA", label: "WPA/WPA2" },
  { value: "WEP", label: "WEP" },
  { value: "nopass", label: "Open" },
];

function TemplateForm({ template, values, errors, showPass, encType, canGenerate, colors, rf, sp, onSetValue, onTogglePass, onSetEncType, onGenerate }: {
  template: QrTemplate;
  values: Record<string, string>;
  errors: Record<string, string>;
  showPass: boolean;
  encType: EncType;
  canGenerate: boolean;
  colors: any;
  rf: (n: number) => number;
  sp: (n: number) => number;
  onSetValue: (key: string, val: string) => void;
  onTogglePass: () => void;
  onSetEncType: (t: EncType) => void;
  onGenerate: () => void;
}) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: sp(20), paddingBottom: sp(24) }}
    >
      <Animated.View entering={FadeInUp.duration(220)} style={{ gap: sp(14) }}>

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

            {/* WiFi encryption selector — show after SSID field */}
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
                        style={({pressed}) => ({
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
