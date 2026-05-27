import React, { useState, useRef } from "react";
import {
  View, Text, Modal, ScrollView, Pressable, StyleSheet,
  Platform, StatusBar, NativeScrollEvent, NativeSyntheticEvent,
  useWindowDimensions, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ConsentScrollBody from "./ConsentScrollBody";

export const CONSENT_VERSION = "3.0";
const CONSENT_KEY = "qrguard_consent_version";

export async function hasUserConsented(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(CONSENT_KEY);
    return stored === CONSENT_VERSION;
  } catch { return false; }
}

export async function saveConsent(): Promise<void> {
  try { await AsyncStorage.setItem(CONSENT_KEY, CONSENT_VERSION); } catch {}
}

interface ConsentModalProps {
  visible: boolean;
  onAccept: () => void;
}

export default function ConsentModal({ visible, onAccept }: ConsentModalProps) {
  const { colors, isDark } = useTheme();
  const { height } = useWindowDimensions();
  const [checked, setChecked] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
    if (isAtBottom && !scrolledToBottom) setScrolledToBottom(true);
  };

  const handleAccept = async () => { await saveConsent(); onAccept(); };
  const openPrivacyPolicy = () => Linking.openURL("https://binan-maker.github.io/qrguard/privacy.html");
  const openTerms = () => Linking.openURL("https://binan-maker.github.io/qrguard/terms.html");

  const cardHeight = Math.min(height * 0.78, 580);
  const cardBg      = isDark ? "#141E2B" : "#FFFFFF";
  const divider     = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const bodyText    = isDark ? "#94A3B8" : "#4B5563";
  const boldText    = isDark ? "#F1F5F9" : "#111827";
  const sectionBlue = isDark ? "#60A5FA" : "#2563EB";
  const hintText    = isDark ? "#475569" : "#9CA3AF";
  const checkboxBorder = isDark ? "#334155" : "#D1D5DB";
  const checkboxLabel  = isDark ? "#CBD5E1" : "#374151";
  const linkColor   = colors.primary;
  const infoBg      = isDark ? "rgba(59,130,246,0.09)" : "rgba(37,99,235,0.06)";
  const infoBorder  = isDark ? "rgba(59,130,246,0.22)" : "rgba(37,99,235,0.18)";

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
        <View style={[styles.card, { backgroundColor: cardBg, height: cardHeight, shadowColor: "#000" }]}>

          {/* ── Header ── */}
          <View style={[styles.header, { borderBottomColor: divider }]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryDim ?? (colors.primary + "18") }]}>
              <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: boldText }]}>QR Guard — Terms &amp; Privacy</Text>
              <Text style={[styles.subtitle, { color: hintText }]}>A quick read before you dive in</Text>
            </View>
          </View>

          {/* ── Scrollable Terms ── */}
          <ConsentScrollBody
            scrollRef={scrollRef}
            onScroll={handleScroll}
            scrolledToBottom={scrolledToBottom}
            sectionBlue={sectionBlue}
            bodyText={bodyText}
            boldText={boldText}
            hintText={hintText}
            divider={divider}
            infoBg={infoBg}
            infoBorder={infoBorder}
            linkColor={linkColor}
            primaryColor={colors.primary}
            onOpenPrivacyPolicy={openPrivacyPolicy}
            onOpenTerms={openTerms}
          />

          {/* ── Footer ── */}
          <View style={[styles.footer, { borderTopColor: divider }]}>
            <Pressable
              style={styles.checkRow}
              onPress={() => setChecked((c) => !c)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
            >
              <View style={[styles.checkbox, {
                borderColor: checked ? colors.primary : checkboxBorder,
                backgroundColor: checked ? colors.primary : "transparent",
              }]}>
                {checked && <Ionicons name="checkmark" size={11} color="#fff" />}
              </View>
              <Text style={[styles.checkLabel, { color: checkboxLabel }]}>
                I agree to QR Guard's{" "}
                <Text style={{ color: linkColor }} onPress={openPrivacyPolicy}>Privacy Policy</Text>
                {" "}and{" "}
                <Text style={{ color: linkColor }} onPress={openTerms}>Terms of Service</Text>
              </Text>
            </Pressable>

            <Pressable
              style={[styles.acceptBtn, {
                backgroundColor: checked ? colors.primary : (isDark ? "#1E293B" : "#F1F5F9"),
                opacity: checked ? 1 : 0.65,
              }]}
              onPress={checked ? handleAccept : undefined}
              disabled={!checked}
              accessibilityLabel="Accept and continue"
            >
              <Text style={[styles.acceptBtnText, { color: checked ? "#fff" : (isDark ? "#475569" : "#9CA3AF") }]}>
                Continue
              </Text>
              {checked && <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 6 }} />}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 18 },
  card: { width: "100%", maxWidth: 440, borderRadius: 22, overflow: "hidden", elevation: 28, shadowOpacity: 0.22, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  headerText: { flex: 1 },
  title: { fontSize: 15, fontWeight: "700", letterSpacing: -0.2, marginBottom: 1 },
  subtitle: { fontSize: 11.5 },
  footer: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: Platform.OS === "ios" ? 20 : 14, borderTopWidth: StyleSheet.hairlineWidth, gap: 10 },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginTop: 1.5, flexShrink: 0 },
  checkLabel: { flex: 1, fontSize: 12.5, lineHeight: 18 },
  acceptBtn: { paddingVertical: 13, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  acceptBtnText: { fontSize: 15, fontWeight: "700", letterSpacing: 0.1 },
});
