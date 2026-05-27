import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  StatusBar,
  NativeScrollEvent,
  NativeSyntheticEvent,
  useWindowDimensions,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const CONSENT_VERSION = "3.0";
const CONSENT_KEY = "qrguard_consent_version";

export async function hasUserConsented(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(CONSENT_KEY);
    return stored === CONSENT_VERSION;
  } catch {
    return false;
  }
}

export async function saveConsent(): Promise<void> {
  try {
    await AsyncStorage.setItem(CONSENT_KEY, CONSENT_VERSION);
  } catch {}
}

interface ConsentModalProps {
  visible: boolean;
  onAccept: () => void;
}

export default function ConsentModal({ visible, onAccept }: ConsentModalProps) {
  const { colors, isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  const [checked, setChecked] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const isAtBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
    if (isAtBottom && !scrolledToBottom) setScrolledToBottom(true);
  };

  const handleAccept = async () => {
    await saveConsent();
    onAccept();
  };

  const openPrivacyPolicy = () =>
    Linking.openURL("https://binan-maker.github.io/qrguard/privacy.html");
  const openTerms = () =>
    Linking.openURL("https://binan-maker.github.io/qrguard/terms.html");

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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
        <View
          style={[
            styles.card,
            { backgroundColor: cardBg, height: cardHeight, shadowColor: "#000" },
          ]}
        >
          {/* ── Header ───────────────────────────────────────────── */}
          <View style={[styles.header, { borderBottomColor: divider }]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryDim ?? (colors.primary + "18") }]}>
              <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: boldText }]}>
                QR Guard — Terms &amp; Privacy
              </Text>
              <Text style={[styles.subtitle, { color: hintText }]}>
                A quick read before you dive in
              </Text>
            </View>
          </View>

          {/* ── Scrollable Terms ─────────────────────────────────── */}
          <View style={styles.scrollWrapper}>
            <ScrollView
              ref={scrollRef}
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={true}
              bounces={Platform.OS === "ios"}
            >
              {/* Beta notice — calm blue info style */}
              <View style={[styles.infoBox, { backgroundColor: infoBg, borderColor: infoBorder }]}>
                <Ionicons name="information-circle-outline" size={14} color={sectionBlue} style={{ marginTop: 1, flexShrink: 0 }} />
                <Text style={[styles.infoBoxText, { color: bodyText }]}>
                  QR Guard is in{" "}
                  <Text style={{ fontWeight: "700", color: boldText }}>beta</Text>
                  {" "}— features may change without notice. Use at your own discretion.
                </Text>
              </View>

              <Section label="Nature of Service" color={sectionBlue}>
                <Body color={bodyText}>
                  Our security analysis is{" "}
                  <Bold color={boldText}>advisory only</Bold> — not a substitute for
                  professional cybersecurity advice. False positives and negatives may occur.
                </Body>
              </Section>

              <Section label="No Warranty" color={sectionBlue}>
                <Body color={bodyText}>
                  This app is provided{" "}
                  <Bold color={boldText}>"as is"</Bold> without any warranty of
                  merchantability, fitness, accuracy, or uninterrupted operation.
                </Body>
              </Section>

              <Section label="Limitation of Liability" color={sectionBlue}>
                <Body color={bodyText}>
                  QR Guard is{" "}
                  <Bold color={boldText}>not liable</Bold> for any direct, indirect, or
                  financial damages. Maximum liability is{" "}
                  <Bold color={boldText}>₹0 or amount paid</Bold>, whichever is greater.
                </Body>
              </Section>

              <Section label="Data We Collect" color={sectionBlue}>
                <Bullets
                  color={bodyText}
                  bullet={colors.primary}
                  items={[
                    "Account info: email, name, profile picture.",
                    "Device info: OS, app version, identifiers.",
                    "Usage data: scan history, feature patterns.",
                    "QR content: URLs, payment data, scanned text.",
                    "Network: IP address, approximate location.",
                    "Camera: processed locally, never uploaded.",
                    "Community: reports and votes you submit.",
                  ]}
                />
              </Section>

              <Section label="How We Use Your Data" color={sectionBlue}>
                <Bullets
                  color={bodyText}
                  bullet={colors.primary}
                  items={[
                    "To provide and improve QR Guard.",
                    "To perform security analysis on QR codes.",
                    "To maintain your account and scan history.",
                    "To detect and prevent abuse.",
                    "To comply with applicable laws.",
                  ]}
                />
              </Section>

              <Section label="AI Training" color={sectionBlue}>
                <Body color={bodyText}>
                  <Bold color={boldText}>By using QR Guard</Bold>, your anonymised scan
                  data may be used to{" "}
                  <Bold color={boldText}>train AI threat detection models</Bold>.
                  Opt-out is not available while using the scanning feature.
                </Body>
              </Section>

              <Section label="Advertising" color={sectionBlue}>
                <Body color={bodyText}>
                  QR Guard may display ads. Aggregated, non-personal usage data may be
                  shared with ad partners. We do{" "}
                  <Bold color={boldText}>not</Bold> sell personally identifiable
                  information.
                </Body>
              </Section>

              <Section label="Third-Party Services" color={sectionBlue}>
                <Body color={bodyText}>
                  Integrates Firebase, Google Safe Browsing, and Razorpay. We are{" "}
                  <Bold color={boldText}>not responsible</Bold> for those parties'
                  practices.
                </Body>
              </Section>

              <Section label="Your Responsibility" color={sectionBlue}>
                <Bullets
                  color={bodyText}
                  bullet={colors.primary}
                  items={[
                    "You use QR Guard voluntarily and at your own risk.",
                    "You are solely responsible for actions based on verdicts.",
                    "SAFE / CAUTION / DANGEROUS are indicators, not guarantees.",
                  ]}
                />
              </Section>

              <Section label="Governing Law" color={sectionBlue}>
                <Body color={bodyText}>
                  Governed by the laws of{" "}
                  <Bold color={boldText}>the Republic of India</Bold>. Disputes are
                  resolved by arbitration in Kerala, India. Class-action claims are
                  waived.
                </Body>
              </Section>

              <Section label="Contact" color={sectionBlue}>
                <Body color={bodyText}>
                  <Bold color={boldText}>legal@qrguard.app</Bold>
                  {"  ·  "}
                  <Bold color={boldText}>privacy@qrguard.app</Bold>
                </Body>
              </Section>

              <View style={[styles.policyRow, { borderTopColor: divider }]}>
                <Pressable onPress={openPrivacyPolicy} style={styles.policyBtn}>
                  <Ionicons name="document-text-outline" size={12} color={linkColor} />
                  <Text style={[styles.policyLink, { color: linkColor }]}>Privacy Policy</Text>
                </Pressable>
                <View style={[styles.policyDivider, { backgroundColor: divider }]} />
                <Pressable onPress={openTerms} style={styles.policyBtn}>
                  <Ionicons name="reader-outline" size={12} color={linkColor} />
                  <Text style={[styles.policyLink, { color: linkColor }]}>Terms of Service</Text>
                </Pressable>
              </View>
            </ScrollView>

            {!scrolledToBottom && (
              <View
                style={[styles.fadeHint, { backgroundColor: cardBg }]}
                pointerEvents="none"
              >
                <Ionicons name="chevron-down" size={14} color={hintText} />
                <Text style={[styles.fadeHintText, { color: hintText }]}>Scroll to read all</Text>
              </View>
            )}
          </View>

          {/* ── Footer ───────────────────────────────────────────── */}
          <View style={[styles.footer, { borderTopColor: divider }]}>
            <Pressable
              style={styles.checkRow}
              onPress={() => setChecked((c) => !c)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: checked ? colors.primary : checkboxBorder,
                    backgroundColor: checked ? colors.primary : "transparent",
                  },
                ]}
              >
                {checked && <Ionicons name="checkmark" size={11} color="#fff" />}
              </View>
              <Text style={[styles.checkLabel, { color: checkboxLabel }]}>
                I agree to QR Guard's{" "}
                <Text style={{ color: linkColor }} onPress={openPrivacyPolicy}>
                  Privacy Policy
                </Text>{" "}
                and{" "}
                <Text style={{ color: linkColor }} onPress={openTerms}>
                  Terms of Service
                </Text>
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.acceptBtn,
                {
                  backgroundColor: checked
                    ? colors.primary
                    : isDark ? "#1E293B" : "#F1F5F9",
                  opacity: checked ? 1 : 0.65,
                },
              ]}
              onPress={checked ? handleAccept : undefined}
              disabled={!checked}
              accessibilityLabel="Accept and continue"
            >
              <Text
                style={[
                  styles.acceptBtnText,
                  { color: checked ? "#fff" : (isDark ? "#475569" : "#9CA3AF") },
                ]}
              >
                Continue
              </Text>
              {checked && (
                <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 6 }} />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({
  label,
  color,
  children,
}: {
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 13 }}>
      <Text
        style={{
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color,
          marginBottom: 4,
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

function Body({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <Text style={{ fontSize: 12.5, color, lineHeight: 19, marginBottom: 2 }}>
      {children}
    </Text>
  );
}

function Bold({ children, color }: { children: React.ReactNode; color: string }) {
  return <Text style={{ fontWeight: "700", color }}>{children}</Text>;
}

function Bullets({
  items,
  color,
  bullet,
}: {
  items: string[];
  color: string;
  bullet: string;
}) {
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: "row", marginBottom: 3, alignItems: "flex-start" }}>
          <Text style={{ color: bullet, fontSize: 12, lineHeight: 19, marginRight: 7 }}>•</Text>
          <Text style={{ flex: 1, fontSize: 12.5, color, lineHeight: 19 }}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 22,
    overflow: "hidden",
    elevation: 28,
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginBottom: 1,
  },
  subtitle: {
    fontSize: 11.5,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  scrollWrapper: {
    flex: 1,
    position: "relative",
    minHeight: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
  },
  fadeHint: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 7,
  },
  fadeHintText: {
    fontSize: 11,
    fontWeight: "500",
  },
  policyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    marginTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  policyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  policyLink: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  policyDivider: {
    width: 1,
    height: 12,
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 20 : 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1.5,
    flexShrink: 0,
  },
  checkLabel: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },
  acceptBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  acceptBtnText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
});
