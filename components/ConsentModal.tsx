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
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
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

  const statusBarHeight =
    Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 44;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const isAtBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 60;
    if (isAtBottom && !scrolledToBottom) setScrolledToBottom(true);
  };

  const handleAccept = async () => {
    await saveConsent();
    onAccept();
  };

  const openPrivacyPolicy = () => router.push("/privacy-policy" as never);
  const openTerms = () => router.push("/terms" as never);

  const cardMaxHeight = height - statusBarHeight - 48;

  const cardBg = isDark ? "#1C2B3A" : "#FFFFFF";
  const overlayBg = isDark ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0.54)";
  const dividerColor = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";
  const bodyText = isDark ? "#CBD5E1" : "#374151";
  const boldText = isDark ? "#F1F5F9" : "#111827";
  const sectionLabel = isDark ? "#64748B" : "#9CA3AF";
  const accentWarning = isDark ? "#F59E0B" : "#D97706";
  const hintText = isDark ? "#64748B" : "#9CA3AF";
  const checkboxBorder = isDark ? "#475569" : "#D1D5DB";
  const checkboxLabel = isDark ? "#CBD5E1" : "#374151";
  const linkColor = colors.primary;
  const btnDisabledBg = isDark ? "#1E3A5F" : "#EFF6FF";
  const btnDisabledText = isDark ? "#3B82F6" : "#93C5FD";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View
        style={[
          styles.overlay,
          { backgroundColor: overlayBg, paddingTop: statusBarHeight + 8 },
        ]}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: cardBg,
              maxHeight: cardMaxHeight,
              shadowColor: isDark ? "#000" : "#000",
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: dividerColor }]}>
            <Text style={[styles.title, { color: boldText }]}>
              Before You Continue
            </Text>
            <Text style={[styles.subtitle, { color: hintText }]}>
              Please read and accept our terms to use QR Guard
            </Text>
          </View>

          {/* Scrollable Terms Body */}
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
              <TermSection label="⚠ BETA NOTICE" accent={accentWarning}>
                <BodyText color={bodyText} bold={boldText}>
                  QR Guard is a{" "}
                  <B color={boldText}>beta-stage application</B> under active
                  development. Features may be incomplete or change without
                  notice. You use this app at your own risk.
                </BodyText>
              </TermSection>

              <TermSection label="1. Nature of the Service">
                <BodyText color={bodyText} bold={boldText}>
                  Our security analysis is{" "}
                  <B color={boldText}>advisory and informational only</B> — not
                  a substitute for professional cybersecurity advice.
                </BodyText>
                <BodyText color={bodyText} bold={boldText}>
                  <B color={boldText}>
                    We do not guarantee any QR code is 100% safe or 100%
                    dangerous.
                  </B>{" "}
                  False positives and false negatives may occur. Always exercise
                  your own judgment.
                </BodyText>
              </TermSection>

              <TermSection label='2. No Warranty ("As Is")'>
                <BodyText color={bodyText} bold={boldText}>
                  This app is provided{" "}
                  <B color={boldText}>"as is" and "as available"</B> without
                  any warranty — express or implied — including warranties of
                  merchantability, fitness, accuracy, or uninterrupted
                  operation.
                </BodyText>
              </TermSection>

              <TermSection label="3. Limitation of Liability">
                <BodyText color={bodyText} bold={boldText}>
                  QR Guard and its developers shall{" "}
                  <B color={boldText}>not be liable</B> for any direct,
                  indirect, financial, or consequential damages arising from
                  your use of this app. Maximum liability is limited to{" "}
                  <B color={boldText}>₹0 or the amount you paid</B>, whichever
                  is greater.
                </BodyText>
              </TermSection>

              <TermSection label="4. Data We Collect">
                <BulletList
                  color={bodyText}
                  bullet={colors.primary}
                  items={[
                    "Account info: email, display name, profile picture.",
                    "Device info: OS, app version, device identifiers.",
                    "Usage data: scan history, feature usage patterns.",
                    "QR content: URLs, payment data, text in scanned codes.",
                    "Network data: IP address, approximate location.",
                    "Camera: images processed locally, not uploaded.",
                    "Community: reports and votes you submit.",
                  ]}
                />
              </TermSection>

              <TermSection label="5. How We Use Your Data">
                <BulletList
                  color={bodyText}
                  bullet={colors.primary}
                  items={[
                    "To provide and improve the QR Guard service.",
                    "To perform security analysis on QR codes.",
                    "To maintain your account and scan history.",
                    "To detect and prevent abuse and security threats.",
                    "To comply with applicable laws.",
                  ]}
                />
              </TermSection>

              <TermSection label="6. AI Training — IMPORTANT" accent={accentWarning}>
                <BodyText color={bodyText} bold={boldText}>
                  <B color={boldText}>
                    BY USING QR GUARD, YOU CONSENT TO:
                  </B>{" "}
                  Your anonymised scan data may be used to{" "}
                  <B color={boldText}>
                    train and improve our AI threat detection models
                  </B>
                  . You cannot opt out while using the scanning feature.
                </BodyText>
              </TermSection>

              <TermSection label="7. Advertising">
                <BodyText color={bodyText} bold={boldText}>
                  QR Guard may display ads. Aggregated non-personal usage data
                  may be shared with advertising partners for ad relevance. We
                  do <B color={boldText}>not</B> sell personally identifiable
                  information.
                </BodyText>
              </TermSection>

              <TermSection label="8. Data Security">
                <BodyText color={bodyText} bold={boldText}>
                  We implement industry-standard security measures.{" "}
                  <B color={boldText}>
                    QR Guard is not liable for breaches caused by third-party
                    actors or cyberattacks beyond our control.
                  </B>
                </BodyText>
              </TermSection>

              <TermSection label="9. Third-Party Services">
                <BodyText color={bodyText} bold={boldText}>
                  The app integrates Firebase, Google Safe Browsing, Razorpay,
                  and others. We are{" "}
                  <B color={boldText}>not responsible</B> for those third
                  parties' practices.
                </BodyText>
              </TermSection>

              <TermSection label="10. Your Responsibility">
                <BulletList
                  color={bodyText}
                  bullet={colors.primary}
                  items={[
                    "You use QR Guard voluntarily and at your own risk.",
                    "You are solely responsible for actions taken based on verdicts.",
                    "SAFE / CAUTION / DANGEROUS are indicators, not guarantees.",
                  ]}
                />
              </TermSection>

              <TermSection label="11. Governing Law">
                <BodyText color={bodyText} bold={boldText}>
                  Governed by the laws of{" "}
                  <B color={boldText}>the Republic of India</B>. Disputes are
                  resolved by arbitration in Kerala, India (Arbitration Act,
                  1996). Class-action claims are waived.
                </BodyText>
              </TermSection>

              <TermSection label="12. Contact">
                <BodyText color={bodyText} bold={boldText}>
                  <B color={boldText}>legal@qrguard.app</B>
                  {" · "}
                  <B color={boldText}>privacy@qrguard.app</B>
                </BodyText>
              </TermSection>

              <View style={[styles.policyRow, { borderTopColor: dividerColor }]}>
                <Pressable onPress={openPrivacyPolicy}>
                  <Text style={[styles.policyLink, { color: linkColor }]}>
                    Privacy Policy
                  </Text>
                </Pressable>
                <Text style={[styles.policyDot, { color: hintText }]}>·</Text>
                <Pressable onPress={openTerms}>
                  <Text style={[styles.policyLink, { color: linkColor }]}>
                    Terms of Service
                  </Text>
                </Pressable>
              </View>
            </ScrollView>

            {!scrolledToBottom && (
              <View
                style={[styles.scrollHint, { backgroundColor: cardBg }]}
                pointerEvents="none"
              >
                <Text style={[styles.scrollHintText, { color: hintText }]}>
                  Scroll to read all terms ↓
                </Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: dividerColor }]}>
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
                {checked && (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                )}
              </View>
              <Text style={[styles.checkLabel, { color: checkboxLabel }]}>
                I have read and agree to QR Guard's{" "}
                <Text style={{ color: linkColor }} onPress={openPrivacyPolicy}>
                  Privacy Policy
                </Text>{" "}
                and{" "}
                <Text style={{ color: linkColor }} onPress={openTerms}>
                  Terms of Service
                </Text>
                .
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.acceptBtn,
                {
                  backgroundColor: checked ? colors.primary : btnDisabledBg,
                },
              ]}
              onPress={checked ? handleAccept : undefined}
              disabled={!checked}
              accessibilityLabel="Accept and continue"
            >
              <Text
                style={[
                  styles.acceptBtnText,
                  { color: checked ? "#fff" : btnDisabledText },
                ]}
              >
                I Accept — Continue
              </Text>
            </Pressable>

            <Text style={[styles.version, { color: hintText }]}>
              Consent v{CONSENT_VERSION} · QR Guard Beta
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function TermSection({
  label,
  accent,
  children,
}: {
  label: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.8,
          textTransform: "uppercase",
          color: accent ?? "#9CA3AF",
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

function BodyText({
  children,
  color,
  bold,
}: {
  children: React.ReactNode;
  color: string;
  bold: string;
}) {
  return (
    <Text style={{ fontSize: 13, color, lineHeight: 20, marginBottom: 6 }}>
      {children}
    </Text>
  );
}

function B({ children, color }: { children: React.ReactNode; color: string }) {
  return <Text style={{ fontWeight: "700", color }}>{children}</Text>;
}

function BulletList({
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
        <View
          key={i}
          style={{ flexDirection: "row", marginBottom: 4, alignItems: "flex-start" }}
        >
          <Text style={{ color: bullet, fontSize: 13, lineHeight: 20, marginRight: 6 }}>
            •
          </Text>
          <Text style={{ flex: 1, fontSize: 13, color, lineHeight: 20 }}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 24,
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 13,
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  scrollHint: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingVertical: 8,
  },
  scrollHintText: {
    fontSize: 11,
    fontWeight: "500",
  },
  policyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  policyLink: {
    fontSize: 12,
    fontWeight: "600",
  },
  policyDot: {
    fontSize: 12,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === "ios" ? 22 : 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  checkLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  acceptBtn: {
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  version: {
    fontSize: 10,
    textAlign: "center",
  },
});
