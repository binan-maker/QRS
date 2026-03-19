import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";

type QrMode = "individual" | "business" | "private";

interface Props {
  user: any;
  qrMode: QrMode;
  businessName: string;
  setQrMode: (mode: QrMode) => void;
  setBusinessName: (name: string) => void;
}

export default function ModeSelector({ user, qrMode, businessName, setQrMode, setBusinessName }: Props) {
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
              <Text style={[styles.modeBtnText, { color: qrMode === "individual" ? colors.primary : colors.textMuted }]}>Individual</Text>
            </Pressable>
            <Pressable
              onPress={() => handleMode("business")}
              style={[
                styles.modeBtn,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                qrMode === "business" && { backgroundColor: "#FBBF2420", borderColor: "#FBBF2460" },
              ]}
            >
              <Ionicons name="storefront" size={15} color={qrMode === "business" ? "#FBBF24" : colors.textMuted} />
              <Text style={[styles.modeBtnText, { color: qrMode === "business" ? "#FBBF24" : colors.textMuted }]}>Business</Text>
            </Pressable>
            <Pressable
              onPress={() => handleMode("private")}
              style={[
                styles.modeBtn,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                qrMode === "private" && { backgroundColor: colors.isDark ? "#1E293B" : "#E2E8F0", borderColor: colors.isDark ? "#334155" : "#94A3B8" },
              ]}
            >
              <Ionicons name="eye-off-outline" size={15} color={qrMode === "private" ? (colors.isDark ? "#F8FAFC" : "#334155") : colors.textMuted} />
              <Text style={[styles.modeBtnText, { color: qrMode === "private" ? (colors.isDark ? "#F8FAFC" : "#334155") : colors.textMuted }]}>Private</Text>
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
              <Text style={[styles.modeBtnText, { color: qrMode !== "private" ? colors.primary : colors.textMuted }]}>Standard</Text>
            </Pressable>
            <Pressable
              onPress={() => handleMode("private")}
              style={[
                styles.modeBtn,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                qrMode === "private" && { backgroundColor: colors.isDark ? "#1E293B" : "#E2E8F0", borderColor: colors.isDark ? "#334155" : "#94A3B8" },
              ]}
            >
              <Ionicons name="eye-off-outline" size={15} color={qrMode === "private" ? (colors.isDark ? "#F8FAFC" : "#334155") : colors.textMuted} />
              <Text style={[styles.modeBtnText, { color: qrMode === "private" ? (colors.isDark ? "#F8FAFC" : "#334155") : colors.textMuted }]}>Private</Text>
            </Pressable>
          </>
        )}
      </View>

      {qrMode === "individual" && user ? (
        <View style={[styles.banner, { backgroundColor: colors.safeDim, borderColor: colors.safe + "40" }]}>
          <Ionicons name="person" size={14} color={colors.safe} />
          <Text style={[styles.bannerText, { color: colors.safe }]}>Branded with your QR Guard identity — saved to your profile with a unique ID</Text>
        </View>
      ) : qrMode === "business" && user ? (
        <View style={[styles.banner, { borderColor: "#FBBF2440", backgroundColor: "#FBBF2410" }]}>
          <Ionicons name="shield" size={14} color="#FBBF24" />
          <Text style={[styles.bannerText, { color: "#FBBF24" }]}>Living Shield — QR encodes a redirect you can update anytime without reprinting</Text>
        </View>
      ) : qrMode === "private" ? (
        <View style={[styles.banner, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
          <Ionicons name="eye-off-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.bannerText, { color: colors.textMuted }]}>No-trace mode — nothing is recorded. Fully local QR code.</Text>
        </View>
      ) : (
        <Pressable style={[styles.banner, { backgroundColor: colors.accentDim, borderColor: colors.accent + "40" }]} onPress={() => router.push("/(auth)/login")}>
          <Ionicons name="sparkles-outline" size={14} color={colors.accent} />
          <Text style={[styles.bannerText, { color: colors.accent }]}>Sign in to create branded QR codes with your QR Guard identity</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.accent} />
        </Pressable>
      )}

      {qrMode === "business" && user && (
        <View style={[styles.businessNameRow, { backgroundColor: colors.surface, borderColor: "#FBBF2440" }]}>
          <Ionicons name="business-outline" size={16} color="#FBBF24" style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.businessNameInput, { color: colors.text }]}
            placeholder="Store or organisation name (optional)"
            placeholderTextColor={colors.textMuted}
            value={businessName}
            onChangeText={setBusinessName}
            maxLength={60}
          />
        </View>
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
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 20,
  },
  bannerText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  businessNameRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10, marginTop: 10, marginBottom: 10,
  },
  businessNameInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
});
