import { View, Text, Pressable, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useScaleFns } from "@/shared/utils/use-scale";

interface Props {
  effectiveContentType: string;
  isReadOnly: boolean;
  isStructured: boolean;
  editingDestination: boolean;
  setEditingDestination: (v: boolean) => void;
  newDestination: string;
  setNewDestination: (v: string) => void;
  destinationError: string | null;
  setDestinationError: (v: string | null) => void;
  savingDestination: boolean;
  isValidating: boolean;
  handleUpdateStandardDestination: () => void;
  handleUpdateRawContent: (content: string) => void;
  structuredFields: Record<string, string>;
  setStructuredFields: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  onStartEditing: () => void;
  rawContentPreview?: string;
}

export default function StandardLinkCard({
  effectiveContentType, isReadOnly, isStructured,
  editingDestination, setEditingDestination,
  newDestination, setNewDestination,
  destinationError, setDestinationError,
  savingDestination, isValidating,
  handleUpdateStandardDestination, handleUpdateRawContent,
  structuredFields, setStructuredFields, onStartEditing,
  rawContentPreview,
}: Props) {
  const { colors, isDark } = useTheme();
  const { rf, sp } = useScaleFns();

  const labelStyle = {
    fontSize: rf(10), fontFamily: "Inter_600SemiBold" as const,
    color: colors.textMuted, marginBottom: sp(6),
    textTransform: "uppercase" as const, letterSpacing: 0.8,
  };
  const inputStyle = {
    backgroundColor: isDark ? colors.surfaceLight : colors.background,
    borderRadius: sp(12), borderWidth: 1, borderColor: colors.surfaceBorder,
    paddingHorizontal: sp(14), paddingVertical: sp(12),
    fontSize: rf(13), color: colors.text, fontFamily: "Inter_400Regular" as const,
  };

  const set = (k: string, v: string) => setStructuredFields((prev) => ({ ...prev, [k]: v }));
  const f = structuredFields;

  function renderStructuredFields() {
    switch (effectiveContentType) {
      case "text":
        return (
          <View>
            <Text style={labelStyle}>Text Content</Text>
            <TextInput value={f.text || ""} onChangeText={(v) => set("text", v)} placeholder="Your text…" placeholderTextColor={colors.textMuted} multiline style={{ ...inputStyle, minHeight: sp(72), textAlignVertical: "top" }} />
          </View>
        );
      case "phone": case "mobilepay": case "grab":
        return (
          <View>
            <Text style={labelStyle}>Phone Number</Text>
            <TextInput value={f.phone || ""} onChangeText={(v) => set("phone", v)} placeholder="+91 98765 43210" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" style={inputStyle} />
          </View>
        );
      case "email":
        return (
          <View style={{ gap: sp(12) }}>
            <View><Text style={labelStyle}>Email Address</Text><TextInput value={f.email || ""} onChangeText={(v) => set("email", v)} placeholder="name@example.com" placeholderTextColor={colors.textMuted} keyboardType="email-address" autoCapitalize="none" style={inputStyle} /></View>
            <View><Text style={labelStyle}>Subject (optional)</Text><TextInput value={f.subject || ""} onChangeText={(v) => set("subject", v)} placeholder="Hello!" placeholderTextColor={colors.textMuted} style={inputStyle} /></View>
            <View><Text style={labelStyle}>Body (optional)</Text><TextInput value={f.body || ""} onChangeText={(v) => set("body", v)} placeholder="Email body text…" placeholderTextColor={colors.textMuted} multiline style={{ ...inputStyle, minHeight: sp(72), textAlignVertical: "top" }} /></View>
          </View>
        );
      case "sms":
        return (
          <View style={{ gap: sp(12) }}>
            <View><Text style={labelStyle}>Phone Number</Text><TextInput value={f.phone || ""} onChangeText={(v) => set("phone", v)} placeholder="+91 98765 43210" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" style={inputStyle} /></View>
            <View><Text style={labelStyle}>Pre-filled Message (optional)</Text><TextInput value={f.message || ""} onChangeText={(v) => set("message", v)} placeholder="Hello!" placeholderTextColor={colors.textMuted} multiline style={{ ...inputStyle, minHeight: sp(60), textAlignVertical: "top" }} /></View>
          </View>
        );
      case "upi": case "scantopay": case "bharatqr":
        return (
          <View style={{ gap: sp(12) }}>
            <View><Text style={labelStyle}>UPI ID / Payment Handle</Text><TextInput value={f.pa || ""} onChangeText={(v) => set("pa", v)} placeholder="name@upi" placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="email-address" style={inputStyle} /></View>
            <View><Text style={labelStyle}>Payee Name</Text><TextInput value={f.pn || ""} onChangeText={(v) => set("pn", v)} placeholder="Business or Person Name" placeholderTextColor={colors.textMuted} style={inputStyle} /></View>
            <View><Text style={labelStyle}>Amount ₹ (optional)</Text><TextInput value={f.am || ""} onChangeText={(v) => set("am", v)} placeholder="0.00" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" style={inputStyle} /></View>
          </View>
        );
      case "wifi":
        return (
          <View style={{ gap: sp(12) }}>
            <View><Text style={labelStyle}>Network Name (SSID)</Text><TextInput value={f.ssid || ""} onChangeText={(v) => set("ssid", v)} placeholder="MyWiFiNetwork" placeholderTextColor={colors.textMuted} style={inputStyle} /></View>
            <View><Text style={labelStyle}>Password</Text><TextInput value={f.password || ""} onChangeText={(v) => set("password", v)} placeholder="WiFi password" placeholderTextColor={colors.textMuted} secureTextEntry style={inputStyle} /></View>
            <View><Text style={labelStyle}>Security Type</Text><TextInput value={f.security || ""} onChangeText={(v) => set("security", v)} placeholder="WPA" placeholderTextColor={colors.textMuted} autoCapitalize="characters" style={inputStyle} /></View>
          </View>
        );
      case "calendly":
        return (
          <View style={{ gap: sp(12) }}>
            <View><Text style={labelStyle}>Calendly Username</Text><TextInput value={f.username || ""} onChangeText={(v) => set("username", v)} placeholder="yourusername" placeholderTextColor={colors.textMuted} autoCapitalize="none" style={inputStyle} /></View>
            <View><Text style={labelStyle}>Event Type Slug (optional)</Text><TextInput value={f.eventType || ""} onChangeText={(v) => set("eventType", v)} placeholder="30min" placeholderTextColor={colors.textMuted} autoCapitalize="none" style={inputStyle} /></View>
          </View>
        );
      case "zoom":
        return (
          <View style={{ gap: sp(12) }}>
            <View><Text style={labelStyle}>Meeting ID</Text><TextInput value={f.meetingId || ""} onChangeText={(v) => set("meetingId", v)} placeholder="123 456 7890" placeholderTextColor={colors.textMuted} keyboardType="number-pad" style={inputStyle} /></View>
            <View><Text style={labelStyle}>Passcode (optional)</Text><TextInput value={f.passcode || ""} onChangeText={(v) => set("passcode", v)} placeholder="123456" placeholderTextColor={colors.textMuted} keyboardType="number-pad" style={inputStyle} /></View>
          </View>
        );
      case "whatsapp":
        return (
          <View style={{ gap: sp(12) }}>
            <View><Text style={labelStyle}>WhatsApp Number</Text><TextInput value={f.phone || ""} onChangeText={(v) => set("phone", v)} placeholder="+91 98765 43210" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" style={inputStyle} /></View>
            <View><Text style={labelStyle}>Pre-filled Message (optional)</Text><TextInput value={f.message || ""} onChangeText={(v) => set("message", v)} placeholder="Hello!" placeholderTextColor={colors.textMuted} multiline style={{ ...inputStyle, minHeight: sp(72), textAlignVertical: "top" }} /></View>
          </View>
        );
      default:
        return null;
    }
  }

  function buildContent(): string {
    switch (effectiveContentType) {
      case "text": return f.text || "";
      case "phone": case "mobilepay": case "grab": return "tel:" + (f.phone || "").replace(/^tel:/, "");
      case "email": { const addr = (f.email || "").replace(/^mailto:/, ""); const p = new URLSearchParams(); if (f.subject) p.set("subject", f.subject); if (f.body) p.set("body", f.body); const qs = p.toString(); return "mailto:" + addr + (qs ? "?" + qs : ""); }
      case "sms": return "SMSTO:" + (f.phone || "") + ":" + (f.message || "");
      case "upi": case "scantopay": case "bharatqr": { const p = new URLSearchParams(); if (f.pa) p.set("pa", f.pa); if (f.pn) p.set("pn", f.pn); if (f.am) p.set("am", f.am); p.set("cu", "INR"); return "upi://pay?" + p.toString(); }
      case "wifi": return `WIFI:T:${f.security || "WPA"};S:${f.ssid || ""};P:${f.password || ""};;`;
      case "calendly": return `https://calendly.com/${f.username || ""}${f.eventType ? "/" + f.eventType : ""}`;
      case "zoom": { const base = `https://zoom.us/j/${(f.meetingId || "").replace(/\s/g, "")}`; return f.passcode ? base + `?pwd=${f.passcode}` : base; }
      case "whatsapp": { const phone = (f.phone || "").replace(/\D/g, ""); const msg = (f.message || "").trim(); return `https://wa.me/${phone}${msg ? "?text=" + encodeURIComponent(msg) : ""}`; }
      default: return "";
    }
  }

  const iconName = isReadOnly ? "lock-closed-outline" : isStructured ? "create-outline" : "pencil-outline";
  const cardTitle = isReadOnly ? "Encoded Content" : isStructured ? "Edit Content" : "Dynamic Destination";
  const cardSub   = isReadOnly ? "Content is read-only for this type" : "Update anytime without reprinting";

  return (
    <Animated.View entering={FadeInDown.duration(160)}>
      <View style={{
        borderRadius: sp(18), borderWidth: 1,
        borderColor: colors.surfaceBorder,
        backgroundColor: colors.surface,
        padding: sp(16), marginBottom: sp(14),
      }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp(10), marginBottom: sp(14) }}>
          <View style={{
            width: sp(36), height: sp(36), borderRadius: sp(11),
            backgroundColor: isDark ? colors.surfaceLight : colors.background,
            borderWidth: 1, borderColor: colors.surfaceBorder,
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name={iconName} size={rf(16)} color={colors.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: rf(14), fontFamily: "Inter_600SemiBold", color: colors.text }}>{cardTitle}</Text>
            <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 1 }}>{cardSub}</Text>
          </View>
          <View style={{
            borderRadius: sp(6), paddingHorizontal: sp(8), paddingVertical: sp(3),
            backgroundColor: isDark ? colors.surfaceLight : colors.background,
            borderWidth: 1, borderColor: colors.surfaceBorder,
          }}>
            <Text style={{ fontSize: rf(9), fontFamily: "Inter_700Bold", color: colors.textMuted, letterSpacing: 0.5 }}>
              {isReadOnly ? "READ ONLY" : "EDITABLE"}
            </Text>
          </View>
        </View>

        {/* Read-only notice */}
        {isReadOnly && (
          <View style={{
            flexDirection: "row", alignItems: "flex-start", gap: sp(10),
            backgroundColor: isDark ? colors.surfaceLight : colors.background,
            borderRadius: sp(12), borderWidth: 1, borderColor: colors.surfaceBorder,
            padding: sp(12),
          }}>
            <Ionicons name="information-circle-outline" size={rf(15)} color={colors.textMuted} style={{ marginTop: 1 }} />
            <Text style={{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: colors.textSecondary, flex: 1, lineHeight: rf(18) }}>
              {effectiveContentType === "contact"
                ? "Contact (vCard) data is structured. To update, generate a new Contact QR."
                : "Calendar event data is structured. To update, generate a new Event QR."}
            </Text>
          </View>
        )}

        {/* Structured fields */}
        {isStructured && (
          editingDestination ? (
            <View style={{ gap: sp(14) }}>
              {renderStructuredFields()}
              {destinationError && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp(6) }}>
                  <Ionicons name="warning-outline" size={rf(13)} color={colors.danger} />
                  <Text style={{ fontSize: rf(11), color: colors.danger, flex: 1 }}>{destinationError}</Text>
                </View>
              )}
              <View style={{ flexDirection: "row", gap: sp(8) }}>
                <Pressable
                  onPress={() => { setEditingDestination(false); setDestinationError(null); }}
                  style={({ pressed }) => [{ flex: 1, borderRadius: sp(12), borderWidth: 1, borderColor: colors.surfaceBorder, paddingVertical: sp(12), alignItems: "center", opacity: pressed ? 0.7 : 1, backgroundColor: colors.surface }]}
                >
                  <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => { const built = buildContent(); if (!built.trim()) { setDestinationError("Please fill in the required fields."); return; } handleUpdateRawContent(built); }}
                  disabled={savingDestination || isValidating}
                  style={({ pressed }) => [{ flex: 2, borderRadius: sp(12), backgroundColor: colors.primary, paddingVertical: sp(12), alignItems: "center", flexDirection: "row", justifyContent: "center", gap: sp(6), opacity: pressed || savingDestination || isValidating ? 0.75 : 1 }]}
                >
                  {(savingDestination || isValidating) && <ActivityIndicator size="small" color="#fff" />}
                  <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>
                    {isValidating ? "Checking…" : savingDestination ? "Saving…" : "Save Changes"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => { onStartEditing(); setEditingDestination(true); setDestinationError(null); }}
              style={({ pressed }) => [{
                flexDirection: "row", alignItems: "center", gap: sp(6),
                borderRadius: sp(12), borderWidth: 1, borderColor: colors.surfaceBorder,
                backgroundColor: isDark ? colors.surfaceLight : colors.background,
                paddingHorizontal: sp(14), paddingVertical: sp(10),
                alignSelf: "flex-start", opacity: pressed ? 0.7 : 1,
              }]}
            >
              <Ionicons name="pencil-outline" size={rf(13)} color={colors.text} />
              <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: colors.text }}>Edit Content</Text>
            </Pressable>
          )
        )}

        {/* Raw URL editor */}
        {!isStructured && !isReadOnly && (
          editingDestination ? (
            <View style={{ gap: sp(10) }}>
              <TextInput
                value={newDestination}
                onChangeText={(t) => { setNewDestination(t); setDestinationError(null); }}
                placeholder="https://new-url.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="url"
                style={{ ...inputStyle, borderColor: destinationError ? colors.danger : colors.surfaceBorder }}
              />
              {destinationError && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp(6) }}>
                  <Ionicons name="warning-outline" size={rf(13)} color={colors.danger} />
                  <Text style={{ fontSize: rf(11), color: colors.danger, flex: 1 }}>{destinationError}</Text>
                </View>
              )}
              <View style={{
                flexDirection: "row", alignItems: "center", gap: sp(8),
                backgroundColor: isDark ? colors.surfaceLight : colors.background,
                borderRadius: sp(10), borderWidth: 1, borderColor: colors.surfaceBorder,
                padding: sp(10),
              }}>
                <Ionicons name="shield-checkmark-outline" size={rf(13)} color={colors.textMuted} />
                <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted, flex: 1 }}>URL will be scanned for threats before saving</Text>
              </View>
              <View style={{ flexDirection: "row", gap: sp(8) }}>
                <Pressable
                  onPress={() => { setEditingDestination(false); setDestinationError(null); }}
                  style={({ pressed }) => [{ flex: 1, borderRadius: sp(12), borderWidth: 1, borderColor: colors.surfaceBorder, paddingVertical: sp(12), alignItems: "center", opacity: pressed ? 0.7 : 1, backgroundColor: colors.surface }]}
                >
                  <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleUpdateStandardDestination}
                  disabled={savingDestination || isValidating}
                  style={({ pressed }) => [{ flex: 2, borderRadius: sp(12), backgroundColor: colors.primary, paddingVertical: sp(12), alignItems: "center", flexDirection: "row", justifyContent: "center", gap: sp(6), opacity: pressed || savingDestination || isValidating ? 0.75 : 1 }]}
                >
                  {(isValidating || savingDestination) && <ActivityIndicator size="small" color="#fff" />}
                  <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>
                    {isValidating ? "Scanning…" : savingDestination ? "Saving…" : "Update URL"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => { if (rawContentPreview) setNewDestination(rawContentPreview); setEditingDestination(true); setDestinationError(null); }}
              style={({ pressed }) => [{
                flexDirection: "row", alignItems: "center", gap: sp(6),
                borderRadius: sp(12), borderWidth: 1, borderColor: colors.surfaceBorder,
                backgroundColor: isDark ? colors.surfaceLight : colors.background,
                paddingHorizontal: sp(14), paddingVertical: sp(10),
                alignSelf: "flex-start", opacity: pressed ? 0.7 : 1,
              }]}
            >
              <Ionicons name="pencil-outline" size={rf(13)} color={colors.text} />
              <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: colors.text }}>Change Destination</Text>
            </Pressable>
          )
        )}
      </View>
    </Animated.View>
  );
}
