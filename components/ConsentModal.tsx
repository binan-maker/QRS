import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  StyleSheet,
  StatusBar,
  Platform,
  NativeScrollEvent,
  NativeSyntheticEvent,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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

  const openPrivacyPolicy = () => {
    router.push("/privacy-policy" as never);
  };

  const openTerms = () => {
    router.push("/terms" as never);
  };

  const s = makeStyles(colors, isDark);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
        translucent={false}
      />
      <View style={s.container}>
        <View style={s.header}>
          <View style={s.shieldWrap}>
            <MaterialCommunityIcons
              name="shield-check"
              size={30}
              color={colors.primary}
            />
          </View>
          <Text style={s.title}>Before You Continue</Text>
          <Text style={s.subtitle}>
            Please read and accept our terms to use QR Guard
          </Text>
        </View>

        <View style={s.scrollContainer}>
          <ScrollView
            ref={scrollRef}
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={true}
            bounces={true}
            alwaysBounceVertical={true}
          >
            <Section
              title="⚠️ BETA SOFTWARE — IMPORTANT NOTICE"
              accent={colors.warning}
              colors={colors}
              isDark={isDark}
            >
              <Para colors={colors}>
                QR Guard is currently a{" "}
                <Bold colors={colors}>beta-stage application</Bold>. It is
                under active development. Features may be incomplete, unstable,
                or change without prior notice. You use this application at
                your own risk.
              </Para>
            </Section>

            <Section title="1. Nature of the Service" colors={colors} isDark={isDark}>
              <Para colors={colors}>
                QR Guard provides QR code scanning, analysis, and generation
                services. Our security analysis is{" "}
                <Bold colors={colors}>advisory and informational only</Bold>.
                It is not a substitute for professional cybersecurity advice.
              </Para>
              <Para colors={colors}>
                <Bold colors={colors}>
                  We cannot and do not guarantee that any QR code is 100% safe
                  or 100% dangerous.
                </Bold>{" "}
                Our analysis uses heuristics, community reports, third-party
                threat intelligence APIs, and pattern matching — all of which
                are subject to error.
              </Para>
              <Para colors={colors}>
                <Bold colors={colors}>False positives may occur:</Bold> A
                legitimate QR code may be flagged as dangerous.{" "}
                <Bold colors={colors}>False negatives may occur:</Bold> A
                malicious QR code may be reported as safe. Always exercise your
                own judgment before scanning any QR code.
              </Para>
            </Section>

            <Section title={'2. No Warranty — "As Is" Disclaimer'} colors={colors} isDark={isDark}>
              <Para colors={colors}>
                THIS APPLICATION IS PROVIDED{" "}
                <Bold colors={colors}>"AS IS" AND "AS AVAILABLE"</Bold> WITHOUT
                ANY WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
                LIMITED TO: WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
                PARTICULAR PURPOSE, ACCURACY, OR UNINTERRUPTED OPERATION.
              </Para>
              <Para colors={colors}>
                QR Guard, its developers, officers, employees, and affiliates
                make{" "}
                <Bold colors={colors}>
                  no representations or guarantees regarding the accuracy,
                  reliability, completeness, or timeliness
                </Bold>{" "}
                of any analysis, verdict, or information provided by the app.
              </Para>
            </Section>

            <Section title="3. Limitation of Liability" colors={colors} isDark={isDark}>
              <Para colors={colors}>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW (INCLUDING
                THE INFORMATION TECHNOLOGY ACT, 2000 AND ITS 2008 AMENDMENT):
              </Para>
              <Para colors={colors}>
                QR Guard and its developers shall{" "}
                <Bold colors={colors}>not be liable</Bold> for any direct,
                indirect, incidental, special, consequential, punitive, or
                exemplary damages, including financial loss, identity theft,
                data loss, business interruption, or any other harm arising
                from your use of or reliance on this application.
              </Para>
              <Para colors={colors}>
                The maximum aggregate liability of QR Guard for any claim shall
                not exceed{" "}
                <Bold colors={colors}>
                  the amount you paid for the app in the preceding 12 months
                  (if any), or ₹0 (zero rupees), whichever is greater
                </Bold>
                .
              </Para>
            </Section>

            <Section title="4. Data We Collect" colors={colors} isDark={isDark}>
              <Para colors={colors}>
                By using this app, you acknowledge and consent to our collection
                of the following data:
              </Para>
              <BulletList
                items={[
                  "Account information: Email address, display name, profile picture, and authentication identifiers.",
                  "Device information: Device type, OS, app version, and unique device identifiers.",
                  "Usage data: Scan history, QR code content you scan or generate, and feature usage patterns.",
                  "QR code content: URLs, payment data, text, contact info, and other embedded data.",
                  "Network data: IP address, approximate location (derived from IP), and network type.",
                  "Camera data: Images processed locally for QR detection — not uploaded unless you share them.",
                  "Community contributions: Reports, comments, and trust votes you submit.",
                ]}
                colors={colors}
              />
            </Section>

            <Section title="5. How We Use Your Data" colors={colors} isDark={isDark}>
              <BulletList
                items={[
                  "To provide, operate, and improve the QR Guard service.",
                  "To perform security analysis on QR codes you scan.",
                  "To maintain your account and scan history.",
                  "To send you relevant notifications (with your permission).",
                  "To detect and prevent abuse, fraud, and security threats.",
                  "To comply with applicable laws and regulations.",
                ]}
                colors={colors}
              />
            </Section>

            <Section
              title="6. AI Training & Data Pattern Analysis — IMPORTANT"
              accent={colors.warning}
              colors={colors}
              isDark={isDark}
            >
              <Para colors={colors}>
                <Bold colors={colors}>
                  BY USING QR GUARD, YOU EXPLICITLY CONSENT TO THE FOLLOWING:
                </Bold>
              </Para>
              <Para colors={colors}>
                Your anonymised scan data, QR code content patterns, and usage
                behaviour may be used to{" "}
                <Bold colors={colors}>
                  train, improve, and refine our AI threat detection models
                </Bold>
                . This includes machine learning models for URL analysis,
                payment fraud detection, and QR code pattern recognition.
              </Para>
              <BulletList
                items={[
                  "Anonymised scan patterns are used to detect new phishing campaigns.",
                  "Community report patterns train our automated classification systems.",
                  "Aggregated, anonymised threat intelligence data may be shared with security research partners.",
                  "Your personal identity is never included in AI training datasets.",
                  "You cannot opt out of this data use while using the scanning feature, as it is core to how the service works.",
                ]}
                colors={colors}
              />
            </Section>

            <Section
              title="7. Advertising & Monetisation"
              accent={colors.warning}
              colors={colors}
              isDark={isDark}
            >
              <Para colors={colors}>
                QR Guard may display in-app advertisements. Aggregated,
                non-personally-identifiable usage data may be used to serve{" "}
                <Bold colors={colors}>contextually relevant advertisements</Bold>{" "}
                within the app.
              </Para>
              <BulletList
                items={[
                  "Device type, approximate location (city/region), and general usage category data may be shared with advertising partners.",
                  "We do NOT share your name, email, specific QR scan content, or payment data with advertisers.",
                  "We do not sell your personally identifiable information to third parties.",
                ]}
                colors={colors}
              />
            </Section>

            <Section title="8. Data Breach & Security Disclaimer" colors={colors} isDark={isDark}>
              <Para colors={colors}>
                <Bold colors={colors}>
                  In the event of a data breach, we cannot guarantee that your
                  data will remain uncompromised.
                </Bold>{" "}
                We will notify affected users and relevant authorities as
                required by applicable law.
              </Para>
              <Para colors={colors}>
                <Bold colors={colors}>
                  QR Guard shall not be held liable for data breaches caused by
                  third-party actors, cyberattacks, or events beyond our
                  reasonable control.
                </Bold>{" "}
                By using this app, you accept this risk.
              </Para>
            </Section>

            <Section title="9. Third-Party Services" colors={colors} isDark={isDark}>
              <Para colors={colors}>
                QR Guard integrates with third-party services including Firebase
                (Google), Google Safe Browsing API, Razorpay, and others. These
                services have their own privacy policies. We are{" "}
                <Bold colors={colors}>not responsible</Bold> for the practices
                of these third parties.
              </Para>
            </Section>

            <Section title="10. User Responsibility & Assumption of Risk" colors={colors} isDark={isDark}>
              <BulletList
                items={[
                  "You use QR Guard voluntarily and at your own risk.",
                  "You are solely responsible for any actions you take based on the app's analysis results.",
                  "You will exercise your own independent judgment when scanning QR codes, especially for financial transactions.",
                  "QR Guard's verdicts (SAFE, CAUTION, DANGEROUS) are risk indicators — not absolute determinations of safety.",
                ]}
                colors={colors}
              />
            </Section>

            <Section title="11. Dispute Resolution & Governing Law" colors={colors} isDark={isDark}>
              <Para colors={colors}>
                These terms are governed by the laws of{" "}
                <Bold colors={colors}>the Republic of India</Bold>. Disputes
                shall first be resolved through good-faith negotiation. If
                unresolved, disputes shall be subject to{" "}
                <Bold colors={colors}>
                  binding arbitration under the Arbitration and Conciliation
                  Act, 1996 of India
                </Bold>
                , with the seat of arbitration in Kerala, India.
              </Para>
              <Para colors={colors}>
                <Bold colors={colors}>
                  You waive any right to participate in a class action lawsuit
                  or class-wide arbitration
                </Bold>{" "}
                against QR Guard. Any claim must be brought on an individual
                basis only.
              </Para>
            </Section>

            <Section title="12. Changes to Terms" colors={colors} isDark={isDark}>
              <Para colors={colors}>
                We may update these terms from time to time. When we do, we
                will update the consent version and require you to re-accept
                before continuing to use the app.
              </Para>
            </Section>

            <Section title="13. Contact Us" colors={colors} isDark={isDark}>
              <Para colors={colors}>
                For privacy concerns, data requests, or legal inquiries:{"\n"}
                <Bold colors={colors}>legal@qrguard.app</Bold>
                {"\n"}
                <Bold colors={colors}>privacy@qrguard.app</Bold>
              </Para>
            </Section>

            <View style={s.policyLinks}>
              <Text style={[s.policyText, { color: colors.textSecondary }]}>
                Read our full policies for complete details:
              </Text>
              <View style={s.policyButtonRow}>
                <Pressable
                  style={[
                    s.policyBtn,
                    {
                      borderColor: colors.primary + "60",
                      backgroundColor: colors.primary + "18",
                    },
                  ]}
                  onPress={openPrivacyPolicy}
                >
                  <Ionicons
                    name="shield-outline"
                    size={14}
                    color={colors.primary}
                  />
                  <Text style={[s.policyBtnText, { color: colors.primary }]}>
                    Privacy Policy
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    s.policyBtn,
                    {
                      borderColor: colors.primary + "60",
                      backgroundColor: colors.primary + "18",
                    },
                  ]}
                  onPress={openTerms}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={14}
                    color={colors.primary}
                  />
                  <Text style={[s.policyBtnText, { color: colors.primary }]}>
                    Terms of Service
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>

          {!scrolledToBottom && (
            <View
              style={[
                s.scrollHint,
                { backgroundColor: isDark ? "#0E1829" : colors.surface },
              ]}
            >
              <Ionicons
                name="chevron-down-circle"
                size={18}
                color={colors.primary}
              />
              <Text style={[s.scrollHintText, { color: colors.textSecondary }]}>
                Scroll to read all terms
              </Text>
            </View>
          )}
        </View>

        <View
          style={[
            s.footer,
            {
              borderTopColor: colors.surfaceBorder,
              backgroundColor: isDark ? "#0A1120" : colors.surface,
            },
          ]}
        >
          <Pressable
            style={s.checkboxRow}
            onPress={() => setChecked((c) => !c)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
          >
            <View
              style={[
                s.checkbox,
                {
                  borderColor: checked ? colors.primary : colors.surfaceBorder,
                  backgroundColor: checked ? colors.primary : "transparent",
                },
              ]}
            >
              {checked && (
                <Ionicons name="checkmark" size={13} color="#fff" />
              )}
            </View>
            <Text style={[s.checkboxLabel, { color: colors.text }]}>
              I have read, understood, and agree to the above terms,
              disclaimers, and QR Guard's{" "}
              <Text
                style={{ color: colors.primary }}
                onPress={openPrivacyPolicy}
              >
                Privacy Policy
              </Text>{" "}
              and{" "}
              <Text style={{ color: colors.primary }} onPress={openTerms}>
                Terms of Service
              </Text>
              .
            </Text>
          </Pressable>

          <Pressable
            style={[
              s.acceptBtn,
              {
                backgroundColor: checked
                  ? colors.primary
                  : isDark
                  ? "#1A2840"
                  : colors.surfaceLight,
                opacity: checked ? 1 : 0.6,
              },
            ]}
            onPress={checked ? handleAccept : undefined}
            disabled={!checked}
            accessibilityLabel="Accept and continue"
          >
            <Ionicons
              name="shield-checkmark"
              size={18}
              color={checked ? "#fff" : colors.textMuted}
            />
            <Text
              style={[
                s.acceptBtnText,
                { color: checked ? "#fff" : colors.textMuted },
              ]}
            >
              I Accept — Continue to App
            </Text>
          </Pressable>

          <Text style={[s.versionNote, { color: colors.textMuted }]}>
            Consent record v{CONSENT_VERSION} · QR Guard Beta
          </Text>
        </View>
      </View>
    </Modal>
  );
}

function Section({
  title,
  accent,
  children,
  colors,
  isDark,
}: {
  title: string;
  accent?: string;
  children: React.ReactNode;
  colors: any;
  isDark: boolean;
}) {
  const titleColor = accent ?? (isDark ? "#7A90B8" : colors.textSecondary);
  return (
    <View style={{ marginBottom: 20 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: titleColor,
          marginBottom: 8,
          letterSpacing: 0.2,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function Para({
  children,
  colors,
}: {
  children: React.ReactNode;
  colors: any;
}) {
  return (
    <Text
      style={{
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}

function Bold({
  children,
  colors,
}: {
  children: React.ReactNode;
  colors: any;
}) {
  return (
    <Text style={{ fontWeight: "700", color: colors.text }}>{children}</Text>
  );
}

function BulletList({ items, colors }: { items: string[]; colors: any }) {
  return (
    <View>
      {items.map((item, i) => (
        <View
          key={i}
          style={{ flexDirection: "row", marginBottom: 6, alignItems: "flex-start" }}
        >
          <Text
            style={{
              fontSize: 14,
              lineHeight: 20,
              marginRight: 8,
              color: colors.primary,
            }}
          >
            •
          </Text>
          <Text
            style={{
              flex: 1,
              fontSize: 13,
              color: colors.textSecondary,
              lineHeight: 20,
            }}
          >
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

function makeStyles(colors: any, isDark: boolean) {
  const bg = isDark ? "#081018" : colors.background;
  const headerBg = isDark ? "#0A1120" : (colors.surface ?? "#F5F7FA");
  const borderColor = isDark
    ? "rgba(75,142,245,0.18)"
    : colors.surfaceBorder ?? "#E0E7EF";

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: bg,
    },
    header: {
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: Platform.OS === "android" ? 20 : 48,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: borderColor,
      backgroundColor: headerBg,
    },
    shieldWrap: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: colors.primary + "1A",
      borderWidth: 1,
      borderColor: colors.primary + "40",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: 4,
    },
    scrollContainer: {
      flex: 1,
      position: "relative",
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 24,
    },
    scrollHint: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
      gap: 6,
      borderTopWidth: 1,
      borderTopColor: borderColor,
    },
    scrollHintText: {
      fontSize: 12,
      fontWeight: "500",
    },
    policyLinks: {
      marginTop: 8,
      marginBottom: 8,
      alignItems: "center",
    },
    policyText: {
      fontSize: 12,
      marginBottom: 10,
    },
    policyButtonRow: {
      flexDirection: "row",
      gap: 10,
    },
    policyBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    policyBtnText: {
      fontSize: 13,
      fontWeight: "600",
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: Platform.OS === "android" ? 20 : 32,
      borderTopWidth: 1,
      gap: 12,
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1,
      flexShrink: 0,
    },
    checkboxLabel: {
      flex: 1,
      fontSize: 13,
      lineHeight: 20,
    },
    acceptBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 15,
      borderRadius: 12,
    },
    acceptBtnText: {
      fontSize: 15,
      fontWeight: "700",
    },
    versionNote: {
      fontSize: 10,
      textAlign: "center",
    },
  });
}
