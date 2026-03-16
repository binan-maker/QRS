import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  Share,
  Alert,
  Image,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import QRCode from "react-native-qrcode-svg";
import { useAuth } from "@/contexts/AuthContext";
import { saveGeneratedQr, type QrType } from "@/lib/firestore-service";

const QR_PRESETS = [
  { label: "Text", icon: "text-outline", placeholder: "Type any text..." },
  { label: "URL", icon: "link-outline", placeholder: "https://example.com" },
  { label: "Email", icon: "mail-outline", placeholder: "email@example.com" },
  { label: "Phone", icon: "call-outline", placeholder: "+1234567890" },
  { label: "WiFi", icon: "wifi-outline", placeholder: "WIFI:T:WPA;S:NetworkName;P:Password;;" },
];

type LogoPosition = "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

const LOGO_POSITIONS: { key: LogoPosition; label: string; icon: string }[] = [
  { key: "center", label: "Center", icon: "square" },
  { key: "top-left", label: "Top Left", icon: "arrow-up-outline" },
  { key: "top-right", label: "Top Right", icon: "arrow-up-outline" },
  { key: "bottom-left", label: "Bot. Left", icon: "arrow-down-outline" },
  { key: "bottom-right", label: "Bot. Right", icon: "arrow-down-outline" },
];

function buildQrContent(type: number, value: string): string {
  if (!value.trim()) return "";
  switch (type) {
    case 1: return value.startsWith("http") ? value : `https://${value}`;
    case 2: return `mailto:${value}`;
    case 3: return `tel:${value}`;
    default: return value;
  }
}

function getContentType(preset: number): string {
  switch (preset) {
    case 1: return "url";
    case 2: return "email";
    case 3: return "phone";
    case 4: return "wifi";
    default: return "text";
  }
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function QrGeneratorScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const svgRef = useRef<any>(null);

  const [selectedPreset, setSelectedPreset] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [qrValue, setQrValue] = useState("");
  const [qrSize, setQrSize] = useState(220);
  const [qrMode, setQrMode] = useState<"individual" | "business" | "private">("individual");
  const [businessName, setBusinessName] = useState("");
  const [customLogoUri, setCustomLogoUri] = useState<string | null>(null);
  const [customLogoBase64, setCustomLogoBase64] = useState<string | null>(null);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>("center");
  const [generatedUuid, setGeneratedUuid] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [positionModalOpen, setPositionModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedToProfile, setSavedToProfile] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBarHeight = 60 + insets.bottom;

  const displayValue = buildQrContent(selectedPreset, inputValue);
  const privateMode = qrMode === "private";
  const isBranded = !!user && !privateMode;

  async function handleGenerate() {
    const val = displayValue.trim();
    if (!val) { Alert.alert("Empty", "Please enter some content first."); return; }
    const uuid = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      val + Date.now()
    );
    const shortUuid = uuid.slice(0, 16).toUpperCase().match(/.{1,4}/g)?.join("-") || uuid.slice(0, 16);
    setQrValue(val);
    setGeneratedUuid(isBranded ? shortUuid : null);
    setGeneratedAt(new Date());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (isBranded && user) {
      setSaving(true);
      setSavedToProfile(false);
      try {
        const qt: QrType = qrMode === "business" ? "business" : "individual";
        const logoToStore = qrMode === "business" && customLogoBase64 ? customLogoBase64 : null;
        await saveGeneratedQr(
          user.id,
          user.displayName,
          val,
          getContentType(selectedPreset),
          shortUuid,
          true,
          qt,
          qrMode === "business" ? (businessName.trim() || null) : null,
          logoToStore
        );
        setSavedToProfile(true);
        setTimeout(() => setSavedToProfile(false), 4000);
      } catch {}
      setSaving(false);
    }
  }

  async function handlePickCustomLogo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Gallery access is required."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      setCustomLogoUri(result.assets[0].uri);
      if (result.assets[0].base64) {
        setCustomLogoBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
      } else {
        setCustomLogoBase64(null);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  async function handleCopy() {
    if (!qrValue) return;
    await Clipboard.setStringAsync(qrValue);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Copied!", "QR content copied to clipboard.");
  }

  async function handleShare() {
    if (!qrValue || !svgRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (Platform.OS === "web") {
        await Share.share({
          message: isBranded
            ? `QR Code created with QR Guard\nContent: ${qrValue}\nID: ${generatedUuid || ""}`
            : qrValue,
          title: "QR Code — QR Guard",
        });
        return;
      }
      svgRef.current.toDataURL(async (base64: string) => {
        try {
          const fileUri = FileSystem.cacheDirectory + "qr_guard_code.png";
          await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          await Share.share(
            {
              url: fileUri,
              title: "QR Code — QR Guard",
              message: isBranded ? `QR Code — QR Guard ID: ${generatedUuid || ""}` : "QR Code — QR Guard",
            }
          );
        } catch {
          await Share.share({
            message: isBranded
              ? `QR Code created with QR Guard\nContent: ${qrValue}\nID: ${generatedUuid || ""}`
              : qrValue,
            title: "QR Code — QR Guard",
          });
        }
      });
    } catch {}
  }

  function handleClear() {
    setInputValue("");
    setQrValue("");
    setGeneratedUuid(null);
    setGeneratedAt(null);
    setCustomLogoUri(null);
    setCustomLogoBase64(null);
    setLogoPosition("center");
    setSavedToProfile(false);
    setBusinessName("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const logoSource = customLogoUri
    ? { uri: customLogoUri }
    : isBranded
    ? require("../../assets/images/icon.png")
    : undefined;

  function getLogoPositionLabel(pos: LogoPosition): string {
    return LOGO_POSITIONS.find((p) => p.key === pos)?.label || "Center";
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.navBar}>
        <Text style={styles.navTitle}>QR Generator</Text>
        <Pressable onPress={() => setInfoModalOpen(true)} style={styles.infoBtn}>
          <Ionicons name="information-circle-outline" size={22} color={Colors.dark.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Mode toggle */}
        <Animated.View entering={FadeInDown.duration(400)}>
          {user ? (
            <View style={styles.modeRow}>
              <Pressable
                onPress={() => { setQrMode("individual"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.modeBtn, qrMode === "individual" && styles.modeBtnActive]}
              >
                <Ionicons name="person" size={15} color={qrMode === "individual" ? Colors.dark.primary : Colors.dark.textMuted} />
                <Text style={[styles.modeBtnText, qrMode === "individual" && styles.modeBtnTextActive]}>Individual</Text>
              </Pressable>
              <Pressable
                onPress={() => { setQrMode("business"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.modeBtn, qrMode === "business" && styles.modeBtnBusiness]}
              >
                <Ionicons name="storefront" size={15} color={qrMode === "business" ? "#FBBF24" : Colors.dark.textMuted} />
                <Text style={[styles.modeBtnText, qrMode === "business" && styles.modeBtnTextBusiness]}>Business</Text>
              </Pressable>
              <Pressable
                onPress={() => { setQrMode("private"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.modeBtn, qrMode === "private" && styles.modeBtnPrivate]}
              >
                <Ionicons name="eye-off-outline" size={15} color={qrMode === "private" ? "#F8FAFC" : Colors.dark.textMuted} />
                <Text style={[styles.modeBtnText, qrMode === "private" && styles.modeBtnTextPrivate]}>Private</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.modeRow}>
              <Pressable
                onPress={() => { setQrMode("individual"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.modeBtn, qrMode !== "private" && styles.modeBtnActive]}
              >
                <Ionicons name="shield-checkmark" size={15} color={qrMode !== "private" ? Colors.dark.primary : Colors.dark.textMuted} />
                <Text style={[styles.modeBtnText, qrMode !== "private" && styles.modeBtnTextActive]}>Standard</Text>
              </Pressable>
              <Pressable
                onPress={() => { setQrMode("private"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.modeBtn, qrMode === "private" && styles.modeBtnPrivate]}
              >
                <Ionicons name="eye-off-outline" size={15} color={qrMode === "private" ? "#F8FAFC" : Colors.dark.textMuted} />
                <Text style={[styles.modeBtnText, qrMode === "private" && styles.modeBtnTextPrivate]}>Private</Text>
              </Pressable>
            </View>
          )}

          {qrMode === "individual" && user ? (
            <View style={styles.brandedBanner}>
              <Ionicons name="person" size={14} color={Colors.dark.safe} />
              <Text style={styles.brandedBannerText}>
                Branded with your QR Guard identity — saved to your profile with a unique ID
              </Text>
            </View>
          ) : qrMode === "business" && user ? (
            <View style={[styles.brandedBanner, { borderColor: "#FBBF2440", backgroundColor: "#FBBF2410" }]}>
              <Ionicons name="storefront" size={14} color="#FBBF24" />
              <Text style={[styles.brandedBannerText, { color: "#FBBF24" }]}>
                Business mode — link your store or organisation to this QR code
              </Text>
            </View>
          ) : qrMode === "private" ? (
            <View style={styles.privateBanner}>
              <Ionicons name="eye-off-outline" size={14} color={Colors.dark.textMuted} />
              <Text style={styles.privateBannerText}>
                No-trace mode — nothing is recorded. Fully local QR code.
              </Text>
            </View>
          ) : (
            <Pressable style={styles.signInPrompt} onPress={() => router.push("/(auth)/login")}>
              <Ionicons name="sparkles-outline" size={14} color={Colors.dark.accent} />
              <Text style={styles.signInPromptText}>
                Sign in to create branded QR codes with your QR Guard identity
              </Text>
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
        </Animated.View>

        {/* Content type */}
        <Animated.View entering={FadeInDown.duration(400).delay(80)}>
          <Text style={styles.sectionLabel}>Content Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            <View style={styles.presetRow}>
              {QR_PRESETS.map((p, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => { setSelectedPreset(idx); setInputValue(""); setQrValue(""); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[styles.presetBtn, selectedPreset === idx && styles.presetBtnActive]}
                >
                  <Ionicons name={p.icon as any} size={16} color={selectedPreset === idx ? Colors.dark.primary : Colors.dark.textMuted} />
                  <Text style={[styles.presetBtnText, selectedPreset === idx && styles.presetBtnTextActive]}>{p.label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </Animated.View>

        {/* Input */}
        <Animated.View entering={FadeInDown.duration(400).delay(140)}>
          <Text style={styles.sectionLabel}>Content</Text>
          <View style={styles.inputCard}>
            <TextInput
              style={styles.textInput}
              value={inputValue}
              onChangeText={setInputValue}
              placeholder={QR_PRESETS[selectedPreset].placeholder}
              placeholderTextColor={Colors.dark.textMuted}
              multiline={selectedPreset === 0 || selectedPreset === 4}
              maxLength={500}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {inputValue.length > 0 ? (
              <Pressable onPress={handleClear} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={20} color={Colors.dark.textMuted} />
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.charCount}>{inputValue.length}/500</Text>
        </Animated.View>

        {/* Logo + Position */}
        <Animated.View entering={FadeInDown.duration(400).delay(180)}>
          <Text style={styles.sectionLabel}>Logo (Optional)</Text>
          <View style={styles.logoRow}>
            {/* Logo picker */}
            <Pressable onPress={handlePickCustomLogo} style={styles.logoPicker}>
              {customLogoUri ? (
                <Image source={{ uri: customLogoUri }} style={styles.logoPreview} />
              ) : isBranded ? (
                <Image source={require("../../assets/images/icon.png")} style={styles.logoPreview} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={20} color={Colors.dark.textMuted} />
                  <Text style={styles.logoPickerText}>Add Logo</Text>
                </>
              )}
            </Pressable>

            <View style={styles.logoOptions}>
              {/* Position picker */}
              {(customLogoUri || isBranded) && (
                <Pressable
                  onPress={() => { setPositionModalOpen(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={styles.positionBtn}
                >
                  <Ionicons name="move-outline" size={16} color={Colors.dark.primary} />
                  <Text style={styles.positionBtnText}>Position: {getLogoPositionLabel(logoPosition)}</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.dark.textMuted} />
                </Pressable>
              )}

              {customLogoUri ? (
                <Pressable onPress={() => setCustomLogoUri(null)} style={styles.removeLogoBtn}>
                  <Ionicons name="close" size={16} color={Colors.dark.danger} />
                  <Text style={styles.removeLogoText}>Remove Custom Logo</Text>
                </Pressable>
              ) : isBranded ? (
                <View style={styles.defaultLogoInfo}>
                  <Ionicons name="shield-checkmark" size={14} color={Colors.dark.safe} />
                  <Text style={styles.defaultLogoText}>QR Guard logo — tap image to replace</Text>
                </View>
              ) : (
                <Text style={styles.logoHint}>Custom logo appears in the center of your QR code</Text>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Generate button */}
        <Animated.View entering={FadeInDown.duration(400).delay(220)}>
          <Pressable
            onPress={handleGenerate}
            disabled={!inputValue.trim()}
            style={({ pressed }) => [styles.generateBtn, { opacity: pressed || !inputValue.trim() ? 0.6 : 1 }]}
          >
            <MaterialCommunityIcons name="qrcode-edit" size={22} color="#000" />
            <Text style={styles.generateBtnText}>Generate QR Code</Text>
          </Pressable>
        </Animated.View>

        {/* QR display */}
        {qrValue ? (
          <Animated.View entering={FadeIn.duration(400)} style={styles.qrCard}>
            {/* QR code — only center position supported natively by the library */}
            <View style={styles.qrWrapper}>
              <View style={styles.qrBg}>
                <QRCode
                  value={qrValue}
                  size={qrSize}
                  color="#0A0E17"
                  backgroundColor="#F8FAFC"
                  getRef={(ref: any) => { svgRef.current = ref; }}
                  logo={logoPosition === "center" ? logoSource : undefined}
                  logoSize={customLogoUri ? 54 : isBranded ? 48 : undefined}
                  logoBackgroundColor="#F8FAFC"
                  logoBorderRadius={customLogoUri ? 27 : 10}
                  logoMargin={4}
                  quietZone={10}
                  ecl="H"
                />
                {/* Corner logo overlays for non-center positions */}
                {logoSource && logoPosition !== "center" && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.cornerLogoWrapper,
                      logoPosition === "top-left" && { top: 10, left: 10 },
                      logoPosition === "top-right" && { top: 10, right: 10 },
                      logoPosition === "bottom-left" && { bottom: 10, left: 10 },
                      logoPosition === "bottom-right" && { bottom: 10, right: 10 },
                    ]}
                  >
                    <Image
                      source={customLogoUri ? { uri: customLogoUri } : require("../../assets/images/icon.png")}
                      style={styles.cornerLogoImage}
                    />
                  </View>
                )}
              </View>
            </View>

            {/* Position note */}
            {logoPosition !== "center" && logoSource && (
              <View style={styles.positionNote}>
                <Ionicons name="information-circle-outline" size={13} color={Colors.dark.primary} />
                <Text style={styles.positionNoteText}>
                  Logo placed at {getLogoPositionLabel(logoPosition).toLowerCase()} corner
                </Text>
              </View>
            )}

            {/* Saved to profile banner */}
            {savedToProfile && (
              <Pressable
                onPress={() => router.push("/(tabs)/profile")}
                style={styles.savedBanner}
              >
                <Ionicons name="checkmark-circle" size={16} color={Colors.dark.safe} />
                <Text style={styles.savedBannerText}>Saved to your profile! Tap to view →</Text>
              </Pressable>
            )}

            {/* Branded footer */}
            {isBranded && generatedUuid ? (
              <View style={styles.brandedFooter}>
                <View style={styles.brandedHeader}>
                  <Image source={require("../../assets/images/icon.png")} style={styles.brandLogo} />
                  <Text style={styles.brandName}>QR Guard</Text>
                  <View style={styles.secureBadge}>
                    <Ionicons name="shield-checkmark" size={11} color={Colors.dark.safe} />
                    <Text style={styles.secureText}>Verified</Text>
                  </View>
                  {saving && (
                    <Text style={styles.savingText}>Saving…</Text>
                  )}
                </View>
                <View style={styles.brandedMeta}>
                  <View style={styles.brandedMetaItem}>
                    <Text style={styles.brandedMetaLabel}>QR ID</Text>
                    <Text style={styles.brandedMetaValue} numberOfLines={1}>{generatedUuid}</Text>
                  </View>
                  <View style={styles.brandedMetaItem}>
                    <Text style={styles.brandedMetaLabel}>Created by</Text>
                    <Text style={styles.brandedMetaValue} numberOfLines={1}>{user?.displayName}</Text>
                  </View>
                  {generatedAt ? (
                    <View style={styles.brandedMetaItem}>
                      <Text style={styles.brandedMetaLabel}>Date</Text>
                      <Text style={styles.brandedMetaValue}>{formatShortDate(generatedAt)}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.ownershipNote}>
                  <Ionicons name="lock-closed" size={12} color={Colors.dark.primary} />
                  <Text style={styles.ownershipNoteText}>
                    This QR is registered to your account. Only you can manage its comments and view followers.
                  </Text>
                </View>
              </View>
            ) : privateMode ? (
              <View style={styles.privateFooter}>
                <Ionicons name="eye-off-outline" size={14} color={Colors.dark.textMuted} />
                <Text style={styles.privateFooterText}>No-trace QR — not recorded anywhere</Text>
              </View>
            ) : null}

            <Text style={styles.qrContentPreview} numberOfLines={2}>{qrValue}</Text>

            {/* Size control */}
            <View style={styles.sizeRow}>
              <Text style={styles.sizeLabel}>Size</Text>
              <View style={styles.sizeButtons}>
                <Pressable onPress={() => setQrSize(Math.max(160, qrSize - 20))} style={styles.sizeBtn}>
                  <Ionicons name="remove" size={18} color={Colors.dark.primary} />
                </Pressable>
                <Text style={styles.sizePx}>{qrSize}px</Text>
                <Pressable onPress={() => setQrSize(Math.min(320, qrSize + 20))} style={styles.sizeBtn}>
                  <Ionicons name="add" size={18} color={Colors.dark.primary} />
                </Pressable>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.qrActions}>
              <Pressable onPress={handleCopy} style={styles.qrActionBtn}>
                <Ionicons name="copy-outline" size={19} color={Colors.dark.primary} />
                <Text style={styles.qrActionText}>Copy</Text>
              </Pressable>
              <Pressable onPress={handleShare} style={styles.qrActionBtn}>
                <Ionicons name="share-outline" size={19} color={Colors.dark.primary} />
                <Text style={styles.qrActionText}>Share</Text>
              </Pressable>
              <Pressable onPress={handleClear} style={[styles.qrActionBtn, { borderColor: Colors.dark.danger + "50" }]}>
                <Ionicons name="trash-outline" size={19} color={Colors.dark.danger} />
                <Text style={[styles.qrActionText, { color: Colors.dark.danger }]}>Clear</Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(400)} style={styles.emptyQr}>
            <View style={styles.emptyQrPlaceholder}>
              <MaterialCommunityIcons name="qrcode-scan" size={64} color={Colors.dark.textMuted} />
            </View>
            <Text style={styles.emptyQrText}>Your QR code will appear here</Text>
            <Text style={styles.emptyQrSub}>Enter content above and tap Generate</Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Logo Position Modal */}
      <Modal
        visible={positionModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPositionModalOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPositionModalOpen(false)}>
          <Pressable style={styles.infoSheet} onPress={() => {}}>
            <View style={styles.infoSheetHandle} />
            <Text style={styles.infoSheetTitle}>Logo Position</Text>
            <Text style={styles.infoSheetSub}>Choose where to place your logo on the QR code</Text>
            <View style={styles.positionGrid}>
              {LOGO_POSITIONS.map((pos) => (
                <Pressable
                  key={pos.key}
                  onPress={() => {
                    setLogoPosition(pos.key);
                    setPositionModalOpen(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[styles.positionGridBtn, logoPosition === pos.key && styles.positionGridBtnActive]}
                >
                  <View style={[styles.positionGridPreview, logoPosition === pos.key && styles.positionGridPreviewActive]}>
                    <View
                      style={[
                        styles.positionDot,
                        pos.key === "center" && { alignSelf: "center", marginTop: "auto", marginBottom: "auto" },
                        pos.key === "top-left" && { position: "absolute", top: 4, left: 4 },
                        pos.key === "top-right" && { position: "absolute", top: 4, right: 4 },
                        pos.key === "bottom-left" && { position: "absolute", bottom: 4, left: 4 },
                        pos.key === "bottom-right" && { position: "absolute", bottom: 4, right: 4 },
                      ]}
                    />
                  </View>
                  <Text style={[styles.positionGridLabel, logoPosition === pos.key && styles.positionGridLabelActive]}>
                    {pos.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.infoClose} onPress={() => setPositionModalOpen(false)}>
              <Text style={styles.infoCloseText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Info modal */}
      <Modal
        visible={infoModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setInfoModalOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setInfoModalOpen(false)}>
          <Pressable style={styles.infoSheet} onPress={() => {}}>
            <View style={styles.infoSheetHandle} />
            <Text style={styles.infoSheetTitle}>About QR Generation</Text>

            <View style={styles.infoItem}>
              <View style={[styles.infoItemIcon, { backgroundColor: Colors.dark.primaryDim }]}>
                <Ionicons name="shield-checkmark" size={20} color={Colors.dark.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoItemTitle}>Branded QR (Signed In)</Text>
                <Text style={styles.infoItemDesc}>
                  Includes the QR Guard logo, a unique ID, your name, and creation date. Saved and registered to your account. You get owner access — see followers, manage comments, receive private messages.
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View style={[styles.infoItemIcon, { backgroundColor: "rgba(100,116,139,0.15)" }]}>
                <Ionicons name="eye-off-outline" size={20} color={Colors.dark.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoItemTitle}>Private / No-Trace QR</Text>
                <Text style={styles.infoItemDesc}>
                  Completely local. No logo, no ID, no data sent or recorded anywhere. Ideal for personal use.
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View style={[styles.infoItemIcon, { backgroundColor: Colors.dark.accentDim }]}>
                <Ionicons name="image-outline" size={20} color={Colors.dark.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoItemTitle}>Custom Logo & Position</Text>
                <Text style={styles.infoItemDesc}>
                  Add your own image or logo. Place it in the center or any corner of the QR code.
                </Text>
              </View>
            </View>

            <Pressable style={styles.infoClose} onPress={() => setInfoModalOpen(false)}>
              <Text style={styles.infoCloseText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  navBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder,
  },
  navTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  infoBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    alignItems: "center", justifyContent: "center",
  },
  scrollContent: { padding: 20 },

  modeRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  modeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12, borderRadius: 14,
    backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  modeBtnActive: { backgroundColor: Colors.dark.primaryDim, borderColor: Colors.dark.primary },
  modeBtnPrivate: { backgroundColor: "#1E293B", borderColor: "#334155" },
  modeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.textMuted },
  modeBtnTextActive: { color: Colors.dark.primary },
  modeBtnTextPrivate: { color: "#F8FAFC" },
  modeBtnBusiness: { backgroundColor: "#FBBF2420", borderColor: "#FBBF2460" },
  modeBtnTextBusiness: { color: "#FBBF24" },
  businessNameRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.dark.surface, borderRadius: 14,
    borderWidth: 1, borderColor: "#FBBF2440",
    paddingHorizontal: 14, paddingVertical: 10,
    marginTop: 10, marginBottom: 10,
  },
  businessNameInput: {
    flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.text,
  },

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

  sectionLabel: {
    fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.dark.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10,
  },
  presetRow: { flexDirection: "row", gap: 8, paddingRight: 4 },
  presetBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  presetBtnActive: { backgroundColor: Colors.dark.primaryDim, borderColor: Colors.dark.primary },
  presetBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.textMuted },
  presetBtnTextActive: { color: Colors.dark.primary },

  inputCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: "row", alignItems: "flex-start", marginBottom: 4,
  },
  textInput: {
    flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.dark.text,
    minHeight: 48, maxHeight: 120,
  },
  clearBtn: { padding: 4, marginTop: 4 },
  charCount: { fontSize: 11, color: Colors.dark.textMuted, textAlign: "right", marginBottom: 16 },

  logoRow: { flexDirection: "row", gap: 12, marginBottom: 20, alignItems: "flex-start" },
  logoPicker: {
    width: 72, height: 72, borderRadius: 16,
    backgroundColor: Colors.dark.surface, borderWidth: 1.5,
    borderColor: Colors.dark.surfaceBorder, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", gap: 4,
    flexShrink: 0,
  },
  logoPreview: { width: 68, height: 68, borderRadius: 14 },
  logoPickerText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted },
  logoOptions: { flex: 1, gap: 8 },
  positionBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dark.primaryDim, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.dark.primary + "40",
  },
  positionBtnText: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },
  removeLogoBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.dark.dangerDim, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, alignSelf: "flex-start",
    borderWidth: 1, borderColor: Colors.dark.danger + "30",
  },
  removeLogoText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.dark.danger },
  defaultLogoInfo: { flexDirection: "row", alignItems: "center", gap: 6 },
  defaultLogoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.safe },
  logoHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },

  generateBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.dark.primary, paddingVertical: 16, borderRadius: 16, marginBottom: 24,
  },
  generateBtnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#000" },

  qrCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder, overflow: "hidden", marginBottom: 8,
  },
  qrWrapper: { alignItems: "center", paddingVertical: 24, paddingHorizontal: 16 },
  qrBg: {
    backgroundColor: "#F8FAFC", borderRadius: 16, padding: 12,
    position: "relative",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 6,
  },
  cornerLogoWrapper: {
    position: "absolute", width: 40, height: 40, borderRadius: 10,
    backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  cornerLogoImage: { width: 34, height: 34, borderRadius: 8 },
  positionNote: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginHorizontal: 16, marginTop: -8, marginBottom: 8,
    backgroundColor: Colors.dark.primaryDim, padding: 8, borderRadius: 8,
  },
  positionNoteText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.primary },

  brandedFooter: {
    borderTopWidth: 1, borderTopColor: Colors.dark.surfaceBorder, padding: 16,
  },
  brandedHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  brandLogo: { width: 24, height: 24, borderRadius: 6 },
  brandName: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  secureBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.dark.safeDim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  secureText: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.dark.safe },
  savingText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginLeft: 4 },
  brandedMeta: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 10 },
  brandedMetaItem: { minWidth: 80 },
  brandedMetaLabel: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted, marginBottom: 2 },
  brandedMetaValue: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  ownershipNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    backgroundColor: Colors.dark.primaryDim, padding: 10, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.dark.primary + "30",
  },
  ownershipNoteText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.dark.primary, lineHeight: 16 },

  privateFooter: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderTopWidth: 1, borderTopColor: Colors.dark.surfaceBorder, padding: 14,
  },
  privateFooterText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },

  savedBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dark.safeDim, borderRadius: 10, padding: 10, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.dark.safe + "40",
  },
  savedBannerText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.safe, flex: 1 },

  qrContentPreview: {
    fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted,
    paddingHorizontal: 16, paddingBottom: 8, textAlign: "center",
  },
  sizeRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: Colors.dark.surfaceBorder,
  },
  sizeLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary },
  sizeButtons: { flexDirection: "row", alignItems: "center", gap: 12 },
  sizeBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.dark.primaryDim, alignItems: "center", justifyContent: "center",
  },
  sizePx: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.dark.text, minWidth: 52, textAlign: "center" },
  qrActions: {
    flexDirection: "row", gap: 10, padding: 16,
    borderTopWidth: 1, borderTopColor: Colors.dark.surfaceBorder,
  },
  qrActionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12, borderRadius: 14,
    backgroundColor: Colors.dark.primaryDim, borderWidth: 1, borderColor: Colors.dark.primary + "40",
  },
  qrActionText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },

  emptyQr: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyQrPlaceholder: {
    width: 120, height: 120, borderRadius: 20,
    backgroundColor: Colors.dark.surface, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder, marginBottom: 8,
  },
  emptyQrText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary },
  emptyQrSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  infoSheet: {
    backgroundColor: Colors.dark.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 36, paddingTop: 12,
    borderTopWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  infoSheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.dark.surfaceLight, alignSelf: "center", marginBottom: 16,
  },
  infoSheetTitle: {
    fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.dark.text,
    paddingHorizontal: 20, marginBottom: 4,
  },
  infoSheetSub: {
    fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted,
    paddingHorizontal: 20, marginBottom: 16,
  },
  infoItem: {
    flexDirection: "row", alignItems: "flex-start", gap: 14,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  infoItemIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  infoItemTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.dark.text, marginBottom: 3 },
  infoItemDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, lineHeight: 18 },
  infoClose: {
    marginHorizontal: 20, marginTop: 16, paddingVertical: 14, borderRadius: 14,
    backgroundColor: Colors.dark.primary, alignItems: "center",
  },
  infoCloseText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#000" },

  positionGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 12,
    paddingHorizontal: 20, marginBottom: 8,
  },
  positionGridBtn: {
    alignItems: "center", gap: 6,
    width: "18%",
  },
  positionGridBtnActive: {},
  positionGridPreview: {
    width: 48, height: 48, borderRadius: 10,
    backgroundColor: Colors.dark.surfaceLight, borderWidth: 2, borderColor: Colors.dark.surfaceBorder,
    position: "relative",
  },
  positionGridPreviewActive: { borderColor: Colors.dark.primary, backgroundColor: Colors.dark.primaryDim },
  positionDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.dark.primary },
  positionGridLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.dark.textMuted, textAlign: "center" },
  positionGridLabelActive: { color: Colors.dark.primary },
});
