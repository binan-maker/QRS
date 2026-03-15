import { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import QRCode from "react-native-qrcode-svg";
import * as FileSystem from "expo-file-system";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { generateBrandedQr } from "@/lib/firestore-service";

const CONTENT_TYPES = [
  { key: "url", label: "URL", icon: "link-outline", placeholder: "https://yourwebsite.com" },
  { key: "text", label: "Text", icon: "text-outline", placeholder: "Enter any text or message" },
  { key: "email", label: "Email", icon: "mail-outline", placeholder: "mailto:you@example.com" },
  { key: "phone", label: "Phone", icon: "call-outline", placeholder: "tel:+1234567890" },
];

export default function GenerateScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [selectedType, setSelectedType] = useState("url");
  const [content, setContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ qrId: string; signature: string; uuid: string } | null>(null);

  const svgRef = useRef<any>(null);

  const placeholder = CONTENT_TYPES.find((t) => t.key === selectedType)?.placeholder || "";

  async function handleGenerate() {
    if (!user) {
      Alert.alert("Sign In Required", "You must be signed in to create a signed QR code.", [
        { text: "Sign In", onPress: () => router.push("/(auth)/login") },
        { text: "Cancel", style: "cancel" },
      ]);
      return;
    }
    if (!content.trim()) {
      Alert.alert("Content Required", "Please enter the content for your QR code.");
      return;
    }
    setGenerating(true);
    try {
      const r = await generateBrandedQr(content.trim(), user.id, user.displayName);
      setResult(r);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not generate QR code. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleShare() {
    if (!svgRef.current) return;
    try {
      svgRef.current.toDataURL(async (data: string) => {
        const filePath = `${FileSystem.cacheDirectory}qrguard_signed_${result?.uuid || "qr"}.png`;
        await FileSystem.writeAsStringAsync(filePath, data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await Share.share({
          url: filePath,
          message: `QR Code · ID: ${result?.uuid}\nScanned via QR Guard`,
          title: "QR Guard Signed QR Code",
        });
      });
    } catch {
      Alert.alert("Share failed", "Could not share the QR image.");
    }
  }

  function handleReset() {
    setResult(null);
    setContent("");
  }

  function handleViewDetail() {
    if (result) router.push(`/qr-detail/${result.qrId}`);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.dark.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="lock-closed" size={14} color={Colors.dark.primary} />
            <Text style={styles.headerTitle}>Digital Mint</Text>
          </View>
          <Text style={styles.headerSub}>Cryptographically signed QR codes</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!result ? (
          <>
            {/* Hero Banner */}
            <View style={styles.heroBanner}>
              <View style={styles.heroIconRing}>
                <MaterialCommunityIcons name="qrcode-edit" size={34} color={Colors.dark.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Create a Signed QR Code</Text>
                <Text style={styles.heroSub}>
                  Your QR will carry a cryptographic signature. Scanners using QR Guard will see "Verified Origin" when they scan it.
                </Text>
              </View>
            </View>

            {/* Type Selector */}
            <Text style={styles.fieldLabel}>Content Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View style={styles.typeRow}>
                {CONTENT_TYPES.map((t) => (
                  <Pressable
                    key={t.key}
                    onPress={() => { setSelectedType(t.key); setContent(""); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[styles.typeBtn, selectedType === t.key && styles.typeBtnActive]}
                  >
                    <Ionicons
                      name={t.icon as any}
                      size={18}
                      color={selectedType === t.key ? Colors.dark.primary : Colors.dark.textMuted}
                    />
                    <Text style={[styles.typeBtnText, selectedType === t.key && styles.typeBtnTextActive]}>
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Content Input */}
            <Text style={styles.fieldLabel}>Content</Text>
            <TextInput
              style={styles.contentInput}
              placeholder={placeholder}
              placeholderTextColor={Colors.dark.textMuted}
              value={content}
              onChangeText={setContent}
              autoCapitalize="none"
              autoCorrect={false}
              multiline={selectedType === "text"}
              numberOfLines={selectedType === "text" ? 4 : 1}
              maxLength={1000}
            />

            {/* Security Info */}
            <View style={styles.securityInfo}>
              <View style={styles.securityRow}>
                <Ionicons name="shield-checkmark" size={16} color={Colors.dark.safe} />
                <Text style={styles.securityText}>SHA-256 cryptographic signature</Text>
              </View>
              <View style={styles.securityRow}>
                <Ionicons name="person-circle-outline" size={16} color={Colors.dark.primary} />
                <Text style={styles.securityText}>Linked to your QR Guard account</Text>
              </View>
              <View style={styles.securityRow}>
                <Ionicons name="eye-outline" size={16} color={Colors.dark.textMuted} />
                <Text style={styles.securityText}>Verified Origin badge shown to scanners</Text>
              </View>
            </View>

            {/* Sign & Mint Button */}
            <Pressable
              onPress={handleGenerate}
              disabled={generating || !content.trim()}
              style={({ pressed }) => [
                styles.mintBtn,
                { opacity: generating || !content.trim() || pressed ? 0.55 : 1 },
              ]}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={18} color="#000" />
                  <Text style={styles.mintBtnText}>Sign & Mint QR Code</Text>
                </>
              )}
            </Pressable>

            {!user && (
              <Pressable onPress={() => router.push("/(auth)/login")} style={styles.signInPrompt}>
                <Ionicons name="person-outline" size={16} color={Colors.dark.primary} />
                <Text style={styles.signInPromptText}>Sign in to create signed QR codes</Text>
              </Pressable>
            )}
          </>
        ) : (
          <>
            {/* Success State */}
            <View style={styles.successBanner}>
              <View style={styles.successIconRing}>
                <Ionicons name="shield-checkmark" size={36} color={Colors.dark.safe} />
              </View>
              <Text style={styles.successTitle}>QR Code Minted!</Text>
              <Text style={styles.successSub}>
                Your cryptographically signed QR code is ready. Anyone scanning it with QR Guard will see "Verified Origin."
              </Text>
            </View>

            {/* QR Preview */}
            <View style={styles.qrContainer}>
              <QRCode
                value={content.trim() || " "}
                size={220}
                color="#000"
                backgroundColor="#fff"
                getRef={(ref) => { svgRef.current = ref; }}
              />
            </View>

            {/* Meta info */}
            <View style={styles.metaCard}>
              <View style={styles.metaRow}>
                <Ionicons name="fingerprint" size={15} color={Colors.dark.textMuted} />
                <Text style={styles.metaLabel}>QR ID</Text>
                <Text style={styles.metaValue} numberOfLines={1}>{result.uuid}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaRow}>
                <Ionicons name="lock-closed" size={15} color={Colors.dark.primary} />
                <Text style={styles.metaLabel}>Signature</Text>
                <Text style={[styles.metaValue, { color: Colors.dark.primary }]} numberOfLines={1}>
                  {result.signature.slice(0, 16)}…
                </Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaRow}>
                <Ionicons name="person" size={15} color={Colors.dark.textMuted} />
                <Text style={styles.metaLabel}>Owner</Text>
                <Text style={styles.metaValue}>{user?.displayName}</Text>
              </View>
            </View>

            {/* Verification badge preview */}
            <View style={styles.verifiedPreview}>
              <Ionicons name="shield-checkmark" size={18} color={Colors.dark.safe} />
              <View style={{ flex: 1 }}>
                <Text style={styles.verifiedPreviewTitle}>Verified Origin</Text>
                <Text style={styles.verifiedPreviewSub}>What scanners will see when they scan your QR</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionRow}>
              <Pressable onPress={handleShare} style={[styles.actionBtn, styles.actionBtnPrimary]}>
                <Ionicons name="share-outline" size={18} color="#000" />
                <Text style={styles.actionBtnPrimaryText}>Share QR</Text>
              </Pressable>
              <Pressable onPress={handleViewDetail} style={[styles.actionBtn, styles.actionBtnSecondary]}>
                <Ionicons name="bar-chart-outline" size={18} color={Colors.dark.primary} />
                <Text style={styles.actionBtnSecondaryText}>Dashboard</Text>
              </Pressable>
            </View>

            <Pressable onPress={handleReset} style={styles.resetBtn}>
              <Ionicons name="add-circle-outline" size={16} color={Colors.dark.textMuted} />
              <Text style={styles.resetBtnText}>Create Another</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder,
  },
  backBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginTop: 1 },
  scroll: { padding: 20 },

  heroBanner: {
    flexDirection: "row", gap: 14, alignItems: "flex-start",
    backgroundColor: Colors.dark.surface, borderRadius: 16, padding: 18,
    marginBottom: 24, borderWidth: 1, borderColor: Colors.dark.primary + "25",
  },
  heroIconRing: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: Colors.dark.primaryDim, alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  heroTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.dark.text, marginBottom: 6 },
  heroSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, lineHeight: 19 },

  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  typeRow: { flexDirection: "row", gap: 8, paddingRight: 8 },
  typeBtn: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
    backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  typeBtnActive: { backgroundColor: Colors.dark.primaryDim, borderColor: Colors.dark.primary },
  typeBtnText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted },
  typeBtnTextActive: { color: Colors.dark.primary, fontFamily: "Inter_600SemiBold" },

  contentInput: {
    backgroundColor: Colors.dark.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    padding: 16, fontSize: 15, fontFamily: "Inter_400Regular",
    color: Colors.dark.text, marginBottom: 20,
  },

  securityInfo: {
    backgroundColor: Colors.dark.surface, borderRadius: 14, padding: 16,
    marginBottom: 24, gap: 10, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  securityRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  securityText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary },

  mintBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.dark.primary, borderRadius: 16, paddingVertical: 16,
    marginBottom: 12,
  },
  mintBtnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#000" },

  signInPrompt: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12,
  },
  signInPromptText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },

  // Success state
  successBanner: { alignItems: "center", gap: 12, marginBottom: 28 },
  successIconRing: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: Colors.dark.safeDim, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: Colors.dark.safe,
  },
  successTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  successSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, textAlign: "center", lineHeight: 21, paddingHorizontal: 16 },

  qrContainer: {
    alignItems: "center", padding: 20,
    backgroundColor: "#fff", borderRadius: 20, marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },

  metaCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  metaLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted, width: 72 },
  metaValue: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.text, textAlign: "right" },
  metaDivider: { height: 1, backgroundColor: Colors.dark.surfaceBorder, marginVertical: 10 },

  verifiedPreview: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.dark.safeDim, borderRadius: 12, padding: 14,
    marginBottom: 20, borderWidth: 1, borderColor: Colors.dark.safe + "40",
  },
  verifiedPreviewTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.dark.safe },
  verifiedPreviewSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginTop: 2 },

  actionRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  actionBtnPrimary: { backgroundColor: Colors.dark.primary },
  actionBtnPrimaryText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#000" },
  actionBtnSecondary: { backgroundColor: Colors.dark.primaryDim, borderWidth: 1, borderColor: Colors.dark.primary + "40" },
  actionBtnSecondaryText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },

  resetBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 14,
  },
  resetBtnText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted },
});
