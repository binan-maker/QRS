import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Linking,
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
  const { colors } = useTheme();
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

  const openPrivacyPolicy = () => {
    router.push("/privacy-policy" as never);
  };

  const openTerms = () => {
    router.push("/terms" as never);
  };

  const s = makeStyles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.header}>
            <View style={s.shieldWrap}>
              <MaterialCommunityIcons
                name="shield-check"
                size={32}
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
              showsVerticalScrollIndicator
            >
              <Section title="⚠️ BETA SOFTWARE — IMPORTANT NOTICE" accent={colors.warning}>
                <Para>
                  QR Guard is currently a <Bold>beta-stage application</Bold>.
                  It is under active development. Features may be incomplete,
                  unstable, or change without prior notice. You use this
                  application at your own risk.
                </Para>
              </Section>

              <Section title="1. Nature of the Service">
                <Para>
                  QR Guard provides QR code scanning, analysis, and generation
                  services. Our security analysis is{" "}
                  <Bold>advisory and informational only</Bold>. It is not a
                  substitute for professional cybersecurity advice.
                </Para>
                <Para>
                  <Bold>
                    We cannot and do not guarantee that any QR code is 100%
                    safe or 100% dangerous.
                  </Bold>{" "}
                  Our analysis uses heuristics, community reports, third-party
                  threat intelligence APIs, and pattern matching — all of which
                  are subject to error.
                </Para>
                <Para>
                  <Bold>False positives may occur:</Bold> A legitimate QR code
                  (including from reputable external sources, businesses, or
                  government services) may be flagged as dangerous when it is
                  actually safe. <Bold>False negatives may occur:</Bold> A
                  malicious QR code may be reported as safe. You should always
                  exercise your own judgment before scanning any QR code.
                </Para>
              </Section>

              <Section title={'2. No Warranty — "As Is" Disclaimer'}>
                <Para>
                  THIS APPLICATION IS PROVIDED{" "}
                  <Bold>"AS IS" AND "AS AVAILABLE"</Bold> WITHOUT ANY WARRANTY
                  OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
                  TO: WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
                  PURPOSE, ACCURACY, NON-INFRINGEMENT, OR UNINTERRUPTED
                  OPERATION.
                </Para>
                <Para>
                  QR Guard, its developers, officers, employees, and
                  affiliates make{" "}
                  <Bold>
                    no representations or guarantees regarding the accuracy,
                    reliability, completeness, or timeliness
                  </Bold>{" "}
                  of any analysis, verdict, or information provided by the app.
                </Para>
              </Section>

              <Section title="3. Limitation of Liability">
                <Para>
                  TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW (INCLUDING
                  THE INFORMATION TECHNOLOGY ACT, 2000 AND THE INFORMATION
                  TECHNOLOGY (AMENDMENT) ACT, 2008 OF INDIA):
                </Para>
                <Para>
                  QR Guard and its developers shall{" "}
                  <Bold>not be liable</Bold> for any direct, indirect,
                  incidental, special, consequential, punitive, or exemplary
                  damages, including but not limited to: financial loss,
                  identity theft, data loss, business interruption, or any
                  other harm arising from your use of or reliance on this
                  application or its analysis results.
                </Para>
                <Para>
                  If you scan a QR code that our app deems "safe" and it turns
                  out to be malicious, or if you avoid a QR code that we
                  flagged as "dangerous" and it was actually safe,{" "}
                  <Bold>QR Guard bears no liability</Bold> for any resulting
                  harm or loss.
                </Para>
                <Para>
                  The maximum aggregate liability of QR Guard for any claim
                  arising out of your use of the app shall not exceed{" "}
                  <Bold>the amount you paid for the app in the preceding
                  12 months (if any), or ₹0 (zero rupees), whichever is
                  greater</Bold>.
                </Para>
              </Section>

              <Section title="4. Data We Collect">
                <Para>By using this app, you acknowledge and consent to our
                  collection of the following data:</Para>
                <BulletList items={[
                  "Account information: Email address, display name, profile picture, and authentication identifiers (Google ID if using Google Sign-In).",
                  "Device information: Device type, operating system, app version, and unique device identifiers.",
                  "Usage data: Scan history, QR code content you scan or generate, interaction logs, and feature usage patterns.",
                  "QR code content: URLs, payment data, text, contact info, and other data embedded in QR codes you scan or upload.",
                  "Network data: IP address, approximate location (derived from IP), and network type.",
                  "Camera data: Images processed locally for QR code detection. Images are not uploaded to our servers unless you explicitly share them.",
                  "Community contributions: Reports, comments, and trust votes you submit.",
                  "Device location: Only if you explicitly grant location permission.",
                ]} colors={colors} />
              </Section>

              <Section title="5. How We Use Your Data">
                <BulletList items={[
                  "To provide, operate, and improve the QR Guard service.",
                  "To perform security analysis on QR codes you scan.",
                  "To maintain your account and scan history.",
                  "To send you relevant notifications (with your permission).",
                  "To detect and prevent abuse, fraud, and security threats.",
                  "To comply with applicable laws and regulations.",
                  "For analytics and aggregate reporting to improve the service.",
                ]} colors={colors} />
              </Section>

              <Section title="6. AI Training & Data Pattern Analysis — IMPORTANT" accent="#F59E0B">
                <Para>
                  <Bold>BY USING QR GUARD, YOU EXPLICITLY CONSENT TO THE FOLLOWING:</Bold>
                </Para>
                <Para>
                  Your anonymised scan data, QR code content patterns, community reports, and usage behaviour may be used to{" "}
                  <Bold>train, improve, and refine our AI threat detection models</Bold>. This includes machine learning models for URL analysis, payment fraud detection, and QR code pattern recognition.
                </Para>
                <Para>
                  QR code content scanned through the app (URLs, domain patterns, payment data structures) is analysed and stored in anonymised form in our{" "}
                  <Bold>threat intelligence database</Bold>. This database is continuously updated from all user scans to improve detection accuracy.
                </Para>
                <BulletList items={[
                  "Anonymised scan patterns are used to detect new phishing campaigns and fraud patterns across our user base.",
                  "Community report patterns (safe/scam/fake/spam distributions) train our automated classification systems.",
                  "Aggregated, anonymised threat intelligence data may be shared with or licensed to security research partners.",
                  "Your personal identity is never included in AI training datasets — only anonymised pattern data.",
                  "You cannot opt out of this data use while continuing to use the scanning feature, as it is core to how the service works.",
                ]} colors={colors} />
              </Section>

              <Section title="7. Advertising & Monetisation" accent="#F59E0B">
                <Para>
                  <Bold>BY USING QR GUARD, YOU EXPLICITLY CONSENT TO THE FOLLOWING:</Bold>
                </Para>
                <Para>
                  QR Guard may display in-app advertisements. Aggregated, non-personally-identifiable usage data and behavioural patterns may be used to serve{" "}
                  <Bold>contextually relevant advertisements</Bold> within the app.
                </Para>
                <BulletList items={[
                  "Device type, approximate location (city/region level from IP), and general usage category data may be shared with advertising partners for ad relevance scoring.",
                  "We do NOT share your name, email, specific QR scan content, or payment data with advertisers.",
                  "You may opt out of personalised advertising by contacting legal@qrguard.app. Note: opting out eliminates personalised ads only — non-personalised ads may still appear.",
                  "We do not sell your personally identifiable information to third parties for commercial purposes.",
                ]} colors={colors} />
              </Section>

              <Section title="8. Data Breach & Security Disclaimer">
                <Para>
                  <Bold>We take data security seriously</Bold> and implement
                  industry-standard technical and organisational measures to
                  protect your personal information. However, no system is
                  completely secure.
                </Para>
                <Para>
                  <Bold>
                    In the event of a data breach, we cannot and do not
                    guarantee that your data will remain uncompromised.
                  </Bold>{" "}
                  We will notify affected users and relevant authorities as
                  required under applicable law (including the Digital Personal
                  Data Protection Act, 2023 of India, the GDPR where
                  applicable, and any other relevant data protection laws).
                </Para>
                <Para>
                  You expressly acknowledge and agree that:{" "}
                  <Bold>
                    QR Guard shall not be held liable for data breaches caused
                    by third-party actors, cyberattacks, infrastructure
                    failures, or events beyond our reasonable control.
                  </Bold>{" "}
                  Any regulatory penalties, government fines, or civil
                  liabilities arising from such events shall not be passed on
                  to or recoverable from QR Guard by you or any third party, to
                  the fullest extent permitted by law.
                </Para>
                <Para>
                  By using this app, you accept this risk and waive any claims
                  against QR Guard for losses arising out of security incidents
                  not caused by our gross negligence or wilful misconduct.
                </Para>
              </Section>

              <Section title="9. Third-Party Services">
                <Para>
                  QR Guard integrates with third-party services including but
                  not limited to: Firebase (Google), Google Safe Browsing API,
                  Razorpay, and others. These services have their own privacy
                  policies and terms of service. We are{" "}
                  <Bold>not responsible</Bold> for the practices of these third
                  parties.
                </Para>
                <Para>
                  Third-party QR codes (from external websites, businesses,
                  apps, or individuals) are analysed on a best-effort basis.
                  Our verdicts on such codes may be incorrect. We do not
                  endorse, verify, or take responsibility for any external QR
                  code content.
                </Para>
              </Section>

              <Section title="10. User Responsibility & Assumption of Risk">
                <Para>
                  You expressly understand and agree that:
                </Para>
                <BulletList items={[
                  "You use QR Guard voluntarily and at your own risk.",
                  "You are solely responsible for any actions you take based on the app's analysis results.",
                  "You will not hold QR Guard responsible for any financial loss, identity theft, data compromise, or other harm resulting from scanning, not scanning, or acting on a QR code verdict.",
                  "You will exercise your own independent judgment when scanning QR codes, especially for financial transactions.",
                  "QR Guard's verdicts (SAFE, CAUTION, DANGEROUS) are risk indicators — not absolute determinations of safety.",
                ]} colors={colors} />
              </Section>

              <Section title="11. Dispute Resolution & Governing Law">
                <Para>
                  These terms are governed by the laws of{" "}
                  <Bold>the Republic of India</Bold>. Any disputes arising from
                  your use of QR Guard shall first be attempted to be resolved
                  through good-faith negotiation. If unresolved, disputes shall
                  be subject to{" "}
                  <Bold>
                    binding arbitration under the Arbitration and Conciliation
                    Act, 1996 of India
                  </Bold>
                  , before a single arbitrator appointed by mutual agreement.
                  The seat of arbitration shall be Kerala, India.
                </Para>
                <Para>
                  <Bold>
                    You waive any right to participate in a class action
                    lawsuit or class-wide arbitration
                  </Bold>{" "}
                  against QR Guard. Any claim must be brought on an individual
                  basis only.
                </Para>
                <Para>
                  If arbitration is not possible, you agree that the courts of
                  competent jurisdiction in Kerala, India shall have exclusive
                  jurisdiction over any dispute.
                </Para>
              </Section>

              <Section title="10. Changes to Terms">
                <Para>
                  We may update these terms from time to time. When we do, we
                  will update the consent version and require you to re-accept
                  before continuing to use the app. Continued use after
                  acceptance of updated terms constitutes agreement to the
                  revised terms.
                </Para>
              </Section>

              <Section title="11. Contact Us">
                <Para>
                  For privacy concerns, data requests, or legal inquiries,
                  contact us at:{"\n"}
                  <Bold>legal@qrguard.app</Bold>
                  {"\n"}
                  <Bold>privacy@qrguard.app</Bold>
                </Para>
              </Section>

              <View style={s.policyLinks}>
                <Text style={[s.policyText, { color: colors.textSecondary }]}>
                  Read our full policies for complete details:
                </Text>
                <View style={s.policyButtonRow}>
                  <Pressable
                    style={[s.policyBtn, { borderColor: colors.primary + "60", backgroundColor: colors.primary + "14" }]}
                    onPress={openPrivacyPolicy}
                  >
                    <Ionicons name="shield-outline" size={14} color={colors.primary} />
                    <Text style={[s.policyBtnText, { color: colors.primary }]}>
                      Privacy Policy
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[s.policyBtn, { borderColor: colors.primary + "60", backgroundColor: colors.primary + "14" }]}
                    onPress={openTerms}
                  >
                    <Ionicons name="document-text-outline" size={14} color={colors.primary} />
                    <Text style={[s.policyBtnText, { color: colors.primary }]}>
                      Terms of Service
                    </Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>

            {!scrolledToBottom && (
              <View style={[s.scrollHint, { backgroundColor: colors.surface }]}>
                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                <Text style={[s.scrollHintText, { color: colors.textMuted }]}>
                  Scroll to read all terms
                </Text>
              </View>
            )}
          </View>

          <View style={[s.footer, { borderTopColor: colors.surfaceBorder, backgroundColor: colors.surface }]}>
            <Pressable
              style={s.checkboxRow}
              onPress={() => setChecked((c) => !c)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
            >
              <View style={[
                s.checkbox,
                {
                  borderColor: checked ? colors.primary : colors.surfaceBorder,
                  backgroundColor: checked ? colors.primary : "transparent",
                },
              ]}>
                {checked && (
                  <Ionicons name="checkmark" size={13} color="#fff" />
                )}
              </View>
              <Text style={[s.checkboxLabel, { color: colors.text }]}>
                I have read, understood, and agree to the above terms, disclaimers, and QR Guard's{" "}
                <Text style={{ color: colors.primary }} onPress={openPrivacyPolicy}>
                  Privacy Policy
                </Text>
                {" "}and{" "}
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
                  backgroundColor: checked ? colors.primary : colors.surfaceLight,
                  opacity: checked ? 1 : 0.55,
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
      </View>
    </Modal>
  );
}

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={sectionStyles.wrap}>
      <Text style={[sectionStyles.title, accent ? { color: accent } : {}]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return <Text style={sectionStyles.para}>{children}</Text>;
}

function Bold({ children }: { children: React.ReactNode }) {
  return <Text style={sectionStyles.bold}>{children}</Text>;
}

function BulletList({ items, colors }: { items: string[]; colors: any }) {
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={sectionStyles.bulletRow}>
          <Text style={[sectionStyles.bullet, { color: colors.primary }]}>•</Text>
          <Text style={sectionStyles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrap: {
    marginBottom: 20,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8899BB",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  para: {
    fontSize: 13,
    color: "#BCC8DC",
    lineHeight: 20,
    marginBottom: 8,
  },
  bold: {
    fontWeight: "700",
    color: "#D8E4F2",
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 6,
    alignItems: "flex-start",
  },
  bullet: {
    fontSize: 14,
    lineHeight: 20,
    marginRight: 8,
    marginTop: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: "#BCC8DC",
    lineHeight: 20,
  },
});

function makeStyles(colors: any) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.88)",
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
    },
    card: {
      width: "100%",
      maxWidth: 520,
      maxHeight: "92%",
      borderRadius: 20,
      overflow: "hidden",
      backgroundColor: "#0E1829",
      borderWidth: 1,
      borderColor: "rgba(75,142,245,0.25)",
      shadowColor: colors.primary,
      shadowOpacity: 0.3,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 0 },
      elevation: 20,
    },
    header: {
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(75,142,245,0.15)",
      backgroundColor: "#0A1120",
    },
    shieldWrap: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: "rgba(75,142,245,0.12)",
      borderWidth: 1,
      borderColor: "rgba(75,142,245,0.3)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      color: "#E8F0FF",
      textAlign: "center",
    },
    subtitle: {
      fontSize: 13,
      color: "#7A90B0",
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
      paddingBottom: 8,
    },
    scrollHint: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 6,
      gap: 4,
    },
    scrollHintText: {
      fontSize: 11,
    },
    policyLinks: {
      marginTop: 8,
      marginBottom: 16,
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
      padding: 16,
      borderTopWidth: 1,
      gap: 12,
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 5,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1,
      flexShrink: 0,
    },
    checkboxLabel: {
      flex: 1,
      fontSize: 13,
      lineHeight: 19,
    },
    acceptBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
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
