import { useState, useEffect, useRef } from "react";
import {
  View, Text, Pressable, TextInput, FlatList,
  Platform, useWindowDimensions, ActivityIndicator,
  KeyboardAvoidingView, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "@/lib/haptics";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToUserGeneratedQrs,
  createGroup,
  addMultipleQrsToGroup,
  type GeneratedQrItem,
} from "@/lib/firestore-service";

const DEFAULT_GROUP_COLOR = "#6366F1";

type Step = "select" | "name";

export default function CreateGroupScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const s  = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (n: number) => Math.round(n * s);
  const sp = (n: number) => Math.round(n * s);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const [qrCodes, setQrCodes] = useState<GeneratedQrItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<Step>("select");
  const [groupName, setGroupName] = useState("");
  const [saving, setSaving] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!user) return;
    unsubRef.current = subscribeToUserGeneratedQrs(user.id, setQrCodes);
    return () => { unsubRef.current?.(); };
  }, [user?.id]);

  function toggleSelect(docId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(docId) ? next.delete(docId) : next.add(docId);
      return next;
    });
  }

  async function handleCreate() {
    if (!user || !groupName.trim() || saving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      const groupId = await createGroup(user.id, groupName.trim(), "", DEFAULT_GROUP_COLOR, "folder-outline");
      await addMultipleQrsToGroup(user.id, groupId, [...selected]);
      router.replace(`/qr-group/${groupId}` as any);
    } finally {
      setSaving(false);
    }
  }

  function renderQrItem({ item, index }: { item: GeneratedQrItem; index: number }) {
    const isSelected = selected.has(item.docId);
    const displayText = item.businessName || item.content || "QR Code";
    const isBusiness = item.qrType === "business";

    return (
      <Animated.View entering={FadeInDown.duration(280).delay(index * 25).springify()}>
        <Pressable
          onPress={() => toggleSelect(item.docId)}
          style={({ pressed }) => [{
            flexDirection: "row", alignItems: "center", gap: sp(12),
            borderRadius: sp(16), borderWidth: 1.5,
            borderColor: isSelected ? groupColor : colors.surfaceBorder,
            backgroundColor: isSelected ? groupColor + "10" : colors.surface,
            padding: sp(12), marginBottom: sp(10),
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          }]}
        >
          {/* QR preview */}
          <View style={{
            width: sp(52), height: sp(52), borderRadius: sp(10), overflow: "hidden",
            backgroundColor: (item as any).bgColor || "#F8FAFC",
            alignItems: "center", justifyContent: "center",
          }}>
            <QRCode
              value={item.content || "https://qrguard.app"}
              size={sp(42)}
              color={(item as any).fgColor || "#0A0E17"}
              backgroundColor={(item as any).bgColor || "#F8FAFC"}
              quietZone={2}
              ecl="L"
            />
          </View>

          {/* Info */}
          <View style={{ flex: 1, gap: sp(3) }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(5) }}>
              <View style={{
                borderRadius: sp(5), paddingHorizontal: sp(6), paddingVertical: sp(2),
                backgroundColor: isBusiness ? colors.warningDim : colors.primaryDim,
              }}>
                <Text style={{ fontSize: rf(9), fontFamily: "Inter_700Bold", color: isBusiness ? colors.warning : colors.primary }}>
                  {isBusiness ? "Business" : "Individual"}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: colors.text }} numberOfLines={1}>
              {displayText.length > 38 ? displayText.slice(0, 38) + "…" : displayText}
            </Text>
            <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted }}>
              {item.scanCount} {item.scanCount === 1 ? "scan" : "scans"}
            </Text>
          </View>

          {/* Checkmark */}
          <View style={{
            width: sp(26), height: sp(26), borderRadius: sp(13),
            borderWidth: 2,
            borderColor: isSelected ? groupColor : colors.surfaceBorder,
            backgroundColor: isSelected ? groupColor : "transparent",
            alignItems: "center", justifyContent: "center",
          }}>
            {isSelected && <Ionicons name="checkmark" size={rf(14)} color="#fff" />}
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* NavBar */}
      <View style={{
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: sp(20), paddingTop: topInset + sp(6), paddingBottom: sp(12),
        borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder,
      }}>
        <Pressable
          onPress={() => step === "name" ? setStep("select") : router.back()}
          style={{ width: sp(38), height: sp(38), borderRadius: sp(19), alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder }}
        >
          <Ionicons name="chevron-back" size={rf(20)} color={colors.text} />
        </Pressable>

        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: rf(16), fontFamily: "Inter_700Bold", color: colors.text }}>
            {step === "select" ? "Select QR Codes" : "Name Your Group"}
          </Text>
          {step === "select" && selected.size > 0 && (
            <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.primary }}>
              {selected.size} selected
            </Text>
          )}
        </View>

        {step === "select" ? (
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStep("name"); }}
            disabled={selected.size === 0}
            style={({ pressed }) => [{
              paddingHorizontal: sp(14), paddingVertical: sp(8),
              borderRadius: sp(12), opacity: selected.size === 0 ? 0.4 : pressed ? 0.8 : 1,
              backgroundColor: selected.size > 0 ? colors.primary : colors.surfaceLight,
            }]}
          >
            <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: selected.size > 0 ? "#fff" : colors.textMuted }}>
              Next
            </Text>
          </Pressable>
        ) : (
          <View style={{ width: sp(38) }} />
        )}
      </View>

      {step === "select" ? (
        /* ── Step 1: Select QR codes ── */
        <>
          {qrCodes.length === 0 ? (
            <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: sp(12), paddingHorizontal: sp(40) }}>
              <Ionicons name="qr-code-outline" size={rf(48)} color={colors.textMuted} />
              <Text style={{ fontSize: rf(15), fontFamily: "Inter_700Bold", color: colors.text, textAlign: "center" }}>No QR codes yet</Text>
              <Text style={{ fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center" }}>
                Generate some QR codes first, then organize them into groups.
              </Text>
            </Animated.View>
          ) : (
            <FlatList
              data={qrCodes}
              keyExtractor={(item) => item.docId}
              renderItem={renderQrItem}
              contentContainerStyle={{ padding: sp(20), paddingBottom: sp(40) }}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <Text style={{ fontSize: rf(12), fontFamily: "Inter_500Medium", color: colors.textMuted, marginBottom: sp(12) }}>
                  Select the QR codes to add to this group
                </Text>
              }
            />
          )}
        </>
      ) : (
        /* ── Step 2: Name the group ── */
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: sp(20), paddingBottom: sp(60) }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.duration(300).springify()} style={{ gap: sp(20) }}>

              {/* Selected codes summary */}
              <View style={{
                flexDirection: "row", alignItems: "center", gap: sp(12),
                borderRadius: sp(14), borderWidth: 1, borderColor: colors.surfaceBorder,
                backgroundColor: colors.surface, padding: sp(14),
              }}>
                <View style={{
                  width: sp(44), height: sp(44), borderRadius: sp(12),
                  backgroundColor: DEFAULT_GROUP_COLOR + "18",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Text style={{ fontSize: rf(20), fontFamily: "Inter_700Bold", color: DEFAULT_GROUP_COLOR }}>G</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: colors.text }}>
                    {selected.size} {selected.size === 1 ? "QR code" : "QR codes"} selected
                  </Text>
                  <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: sp(2) }}>
                    All will be added to this group
                  </Text>
                </View>
                <Pressable onPress={() => setStep("select")} style={{ paddingHorizontal: sp(10), paddingVertical: sp(6), borderRadius: sp(10), backgroundColor: colors.surfaceLight }}>
                  <Text style={{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Change</Text>
                </Pressable>
              </View>

              {/* Group name */}
              <View style={{ gap: sp(8) }}>
                <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Group Name
                </Text>
                <TextInput
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder="e.g. Marketing, Events, Personal…"
                  placeholderTextColor={colors.textMuted}
                  maxLength={40}
                  autoFocus
                  style={{
                    backgroundColor: colors.surface, borderRadius: sp(14), borderWidth: 1,
                    borderColor: groupName.trim() ? DEFAULT_GROUP_COLOR + "60" : colors.surfaceBorder,
                    paddingHorizontal: sp(16), paddingVertical: sp(14),
                    fontSize: rf(14), fontFamily: "Inter_500Medium", color: colors.text,
                  }}
                />
              </View>

              {/* Create button */}
              <Pressable
                onPress={handleCreate}
                disabled={!groupName.trim() || saving}
                style={({ pressed }) => [{
                  borderRadius: sp(16), overflow: "hidden",
                  opacity: pressed || saving || !groupName.trim() ? 0.55 : 1,
                  marginTop: sp(8),
                }]}
              >
                <LinearGradient
                  colors={groupName.trim() ? [DEFAULT_GROUP_COLOR, "#4F46E5"] : [colors.surfaceLight, colors.surfaceLight]}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: sp(10), paddingVertical: sp(15) }}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons name="checkmark-circle-outline" size={rf(18)} color={groupName.trim() ? "#fff" : colors.textMuted} />
                  )}
                  <Text style={{ fontSize: rf(15), fontFamily: "Inter_700Bold", color: groupName.trim() ? "#fff" : colors.textMuted }}>
                    {saving ? "Creating…" : `Create Group · ${selected.size} ${selected.size === 1 ? "code" : "codes"}`}
                  </Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
