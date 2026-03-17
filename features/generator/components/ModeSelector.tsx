import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Colors from "@/constants/colors";

type QrMode = "individual" | "business" | "private";

interface Props {
  user: any;
  qrMode: QrMode;
  businessName: string;
  setQrMode: (mode: QrMode) => void;
  setBusinessName: (name: string) => void;
}

export default function ModeSelector({ user, qrMode, businessName, setQrMode, setBusinessName }: Props) {
  function handleMode(mode: QrMode) {
    setQrMode(mode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <>
      <View style={styles.modeRow}>
        {user ? (
          <>
            <Pressable onPress={() => handleMode("individual")} style={[styles.modeBtn, qrMode === "individual" && styles.modeBtnActive]}>
              <Ionicons name="person" size={15} color={qrMode === "individual" ? Colors.dark.primary : Colors.dark.textMuted} />
              <Text style={[styles.modeBtnText, qrMode === "individual" && styles.modeBtnTextActive]}>Individual</Text>
            </Pressable>
            <Pressable onPress={() => handleMode("business")} style={[styles.modeBtn, qrMode === "business" && styles.modeBtnBusiness]}>
              <Ionicons name="storefront" size={15} color={qrMode === "business" ? "#FBBF24" : Colors.dark.textMuted} />
              <Text style={[styles.modeBtnText, qrMode === "business" && styles.modeBtnTextBusiness]}>Business</Text>
            </Pressable>
            <Pressable onPress={() => handleMode("private")} style={[styles.modeBtn, qrMode === "private" && styles.modeBtnPrivate]}>
              <Ionicons name="eye-off-outline" size={15} color={qrMode === "private" ? "#F8FAFC" : Colors.dark.textMuted} />
              <Text style={[styles.modeBtnText, qrMode === "private" && styles.modeBtnTextPrivate]}>Private</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable onPress={() => handleMode("individual")} style={[styles.modeBtn, qrMode !== "private" && styles.modeBtnActive]}>
              <Ionicons name="shield-checkmark" size={15} color={qrMode !== "private" ? Colors.dark.primary : Colors.dark.textMuted} />
              <Text style={[styles.modeBtnText, qrMode !== "private" && styles.modeBtnTextActive]}>Standard</Text>
            </Pressable>
            <Pressable onPress={() => handleMode("private")} style={[styles.modeBtn, qrMode === "private" && styles.modeBtnPrivate]}>
              <Ionicons name="eye-off-outline" size={15} color={qrMode === "private" ? "#F8FAFC" : Colors.dark.textMuted} />
              <Text style={[styles.modeBtnText, qrMode === "private" && styles.modeBtnTextPrivate]}>Private</Text>
            </Pressable>
          </>
        )}
      </View>

      {qrMode === "individual" && user ? (
        <View style={styles.brandedBanner}>
          <Ionicons name="person" size={14} color={Colors.dark.safe} />
          <Text style={styles.brandedBannerText}>Branded with your QR Guard identity — saved to your profile with a unique ID</Text>
        </View>
      ) : qrMode === "business" && user ? (
        <View style={[styles.brandedBanner, { borderColor: "#FBBF2440", backgroundColor: "#FBBF2410" }]}>
          <Ionicons name="shield" size={14} color="#FBBF24" />
          <Text style={[styles.brandedBannerText, { color: "#FBBF24" }]}>Living Shield — QR encodes a redirect you can update anytime without reprinting</Text>
        </View>
      ) : qrMode === "private" ? (
        <View style={styles.privateBanner}>
          <Ionicons name="eye-off-outline" size={14} color={Colors.dark.textMuted} />
          <Text style={styles.privateBannerText}>No-trace mode — nothing is recorded. Fully local QR code.</Text>
        </View>
      ) : (
        <Pressable style={styles.signInPrompt} onPress={() => router.push("/(auth)/login")}>
          <Ionicons name="sparkles-outline" size={14} color={Colors.dark.accent} />
          <Text style={styles.signInPromptText}>Sign in to create branded QR codes with your QR Guard identity</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.dark.accent} />
        </Pressable>
      )}

      {qrMode === "business" && user && (
        <View style={styles.businessNameRow}>
          <Ionicons name="business-outline" size={16} color="#FBBF24" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.businessNameInput}
            placeholder="Store or organisation name (optional)"
            placeholderTextColor={Colors.dark.textMuted}
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
    paddingVertical: 12, borderRadius: 14,
    backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  modeBtnActive: { backgroundColor: Colors.dark.primaryDim, borderColor: Colors.dark.primary },
  modeBtnBusiness: { backgroundColor: "#FBBF2420", borderColor: "#FBBF2460" },
  modeBtnPrivate: { backgroundColor: "#1E293B", borderColor: "#334155" },
  modeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.textMuted },
  modeBtnTextActive: { color: Colors.dark.primary },
  modeBtnTextBusiness: { color: "#FBBF24" },
  modeBtnTextPrivate: { color: "#F8FAFC" },
  brandedBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dark.safeDim, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.dark.safe + "40", marginBottom: 20,
  },
  brandedBannerText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.safe },
  privateBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(30,41,59,0.8)", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.dark.surfaceLight, marginBottom: 20,
  },
  privateBannerText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },
  signInPrompt: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dark.accentDim, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.dark.accent + "40", marginBottom: 20,
  },
  signInPromptText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.accent },
  businessNameRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.dark.surface, borderRadius: 14,
    borderWidth: 1, borderColor: "#FBBF2440",
    paddingHorizontal: 14, paddingVertical: 10, marginTop: 10, marginBottom: 10,
  },
  businessNameInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.text },
});
