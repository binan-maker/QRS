import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "@/lib/haptics";
import { router } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import BusinessTypeSelector, { type BusinessCategory } from "./BusinessTypeSelector";

type QrMode = "individual" | "business" | "private";

interface Props {
  user: any;
  qrMode: QrMode;
  businessName: string;
  businessCategory: BusinessCategory;
  setQrMode: (mode: QrMode) => void;
  setBusinessName: (name: string) => void;
  switchBusinessCategory: (cat: BusinessCategory) => void;
}

export default function ModeSelector({ user, qrMode, businessName, businessCategory, setQrMode, setBusinessName, switchBusinessCategory }: Props) {
  const { colors } = useTheme();

  function handleMode(mode: QrMode) {
    setQrMode(mode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <>
      <View style={styles.modeRow}>
        {user ? (
          <>
            <Pressable
              onPress={() => handleMode("individual")}
              style={[
                styles.modeBtn,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                qrMode === "individual" && { backgroundColor: colors.primaryDim, borderColor: colors.primary },
              ]}
            >
              <Ionicons name="person" size={15} color={qrMode === "individual" ? colors.primary : colors.textMuted} />
              <Text style={[styles.modeBtnText, { color: qrMode === "individual" ? colors.primary : colors.textMuted }]} maxFontSizeMultiplier={1}>Individual</Text>
            </Pressable>
            <Pressable
              onPress={() => handleMode("business")}
              style={[
                styles.modeBtn,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                qrMode === "business" && { backgroundColor: colors.warningDim, borderColor: colors.warning + "60" },
              ]}
            >
              <Ionicons name="storefront" size={15} color={qrMode === "business" ? colors.warning : colors.textMuted} />
              <Text style={[styles.modeBtnText, { color: qrMode === "business" ? colors.warning : colors.textMuted }]} maxFontSizeMultiplier={1}>Business</Text>
            </Pressable>
            <Pressable
              onPress={() => handleMode("private")}
              style={[
                styles.modeBtn,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                qrMode === "private" && { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder },
              ]}
            >
              <Ionicons name="eye-off-outline" size={15} color={qrMode === "private" ? colors.textSecondary : colors.textMuted} />
              <Text style={[styles.modeBtnText, { color: qrMode === "private" ? colors.textSecondary : colors.textMuted }]} maxFontSizeMultiplier={1}>Private</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              onPress={() => handleMode("individual")}
              style={[
                styles.modeBtn,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                qrMode !== "private" && { backgroundColor: colors.primaryDim, borderColor: colors.primary },
              ]}
            >
              <Ionicons name="shield-checkmark" size={15} color={qrMode !== "private" ? colors.primary : colors.textMuted} />
              <Text style={[styles.modeBtnText, { color: qrMode !== "private" ? colors.primary : colors.textMuted }]} maxFontSizeMultiplier={1}>Standard</Text>
            </Pressable>
            <Pressable
              onPress={() => handleMode("private")}
              style={[
                styles.modeBtn,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                qrMode === "private" && { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder },
              ]}
            >
              <Ionicons name="eye-off-outline" size={15} color={qrMode === "private" ? colors.textSecondary : colors.textMuted} />
              <Text style={[styles.modeBtnText, { color: qrMode === "private" ? colors.textSecondary : colors.textMuted }]} maxFontSizeMultiplier={1}>Private</Text>
            </Pressable>
          </>
        )}
      </View>

      {qrMode === "individual" && user ? (
        <View style={[styles.banner, { backgroundColor: colors.safeDim, borderColor: colors.safe + "40" }]}>
          <Ionicons name="person" size={13} color={colors.safe} />
          <Text style={[styles.bannerText, { color: colors.safe }]} maxFontSizeMultiplier={1}>Signed QR saved to your profile with a unique ID</Text>
        </View>
      ) : qrMode === "business" && user ? (
        <View style={[styles.banner, { borderColor: colors.warning + "40", backgroundColor: colors.warningDim }]}>
          <Ionicons name="shield" size={13} color={colors.warning} />
          <Text style={[styles.bannerText, { color: colors.warning }]} maxFontSizeMultiplier={1}>Living Shield — update the destination anytime, no reprint needed</Text>
        </View>
      ) : qrMode === "private" ? (
        <View style={[styles.banner, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
          <Ionicons name="eye-off-outline" size={13} color={colors.textMuted} />
          <Text style={[styles.bannerText, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>No-trace — fully local, nothing recorded</Text>
        </View>
      ) : (
        <Pressable style={[styles.banner, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]} onPress={() => router.push("/(auth)/login")}>
          <Ionicons name="sparkles-outline" size={13} color={colors.primary} />
          <Text style={[styles.bannerText, { color: colors.primary }]} maxFontSizeMultiplier={1}>Sign in to create branded QR codes</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.primary} />
        </Pressable>
      )}

      {qrMode === "business" && user && (
        <>
          <View style={[styles.businessNameRow, { backgroundColor: colors.surface, borderColor: colors.warning + "40" }]}>
            <Ionicons name="business-outline" size={16} color={colors.warning} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.businessNameInput, { color: colors.text }]}
              placeholder="Store or organisation name (optional)"
              placeholderTextColor={colors.textMuted}
              value={businessName}
              onChangeText={setBusinessName}
              maxLength={60}
            />
          </View>
          <View style={{ marginTop: 14 }}>
            <BusinessTypeSelector
              businessCategory={businessCategory}
              onSelect={switchBusinessCategory}
            />
          </View>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  modeRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  modeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12, borderRadius: 14, borderWidth: 1,
  },
  modeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  banner: {
    flexDirection: "row", alignItems: "center", gap: 7,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, borderWidth: 1, marginBottom: 16,
  },
  bannerText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular" },
  businessNameRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10, marginTop: 10, marginBottom: 10,
  },
  businessNameInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
});
