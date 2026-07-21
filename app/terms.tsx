import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useState, type ReactNode } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/shared/utils/platform";
import ScreenHeader from "@/shared/components/ui/ScreenHeader";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/shared/contexts/ThemeContext";
import type { AppColors } from "@/shared/constants/colors";
import Reanimated from "react-native-reanimated";
import { useHeaderHide } from "@/shared/utils/use-header-hide";

const EFFECTIVE_DATE = "April 8, 2026";
const CONTACT_EMAIL = "ahmedsameerbinan2@gmail.com";
const APP_NAME = "BinRo";

function SectionCard({ title, num, children, colors }: { title: string; num: string; children: React.ReactNode; colors: AppColors }) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionNum, { backgroundColor: colors.primaryDim }]}>
          <Text style={[styles.sectionNumText, { color: colors.primary }]}>{num}</Text>
        </View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Para({ children, colors }: { children: React.ReactNode; colors: AppColors }) {
  return <Text style={[styles.para, { color: colors.textSecondary }]}>{children}</Text>;
}

function Bullet({ text, colors }: { text: string; colors: AppColors }) {
  return (
    <View style={styles.bulletRow}>
      <LinearGradient
        colors={[colors.primary, colors.accent]}
        style={styles.bulletDot}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

function WarnBox({ text, colors }: { text: string; colors: AppColors }) {
  return (
    <View style={[styles.warningBox, { backgroundColor: colors.warningDim, borderColor: colors.warning + "35" }]}>
      <Ionicons name="warning" size={15} color={colors.warning} />
      <Text style={[styles.warningText, { color: colors.warning }]}>{text}</Text>
    </View>
  );
}

export default function TermsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = useTopInset();
  const { headerStyle, setHeight, onScroll } = useHeaderHide();
  const [headerH, setHeaderH] = useState(0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Reanimated.View
        style={[{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: colors.background }, headerStyle]}
        onLayout={(e: any) => { const h = e.nativeEvent.layout.height; if (h > 0) { setHeaderH(h); setHeight(h); } }}
      >
        <View style={{ paddingTop: topInset }}>
          <ScreenHeader title="Terms of Service" />
        </View>
      </Reanimated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.scrollContent, { paddingTop: headerH, paddingBottom: insets.bottom + 40 }]}
      >
        <LinearGradient
          colors={colors.isDark
            ? ["rgba(0,111,255,0.10)", "rgba(0,229,255,0.06)", "rgba(0,111,255,0.02)"]
            : ["rgba(0,111,255,0.06)", "rgba(0,111,255,0.02)", "transparent"]}
          style={[styles.heroBanner, { borderColor: colors.primary + "25" }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <LinearGradient
            colors={[colors.primary, colors.primary + "BB"]}
            style={styles.heroIconWrap}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="document-text" size={30} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Terms of Service</Text>
            <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
              These terms govern your use of {APP_NAME} (Beta). By using the app, you agree to be bound by these terms in full.
            </Text>
            <View style={[styles.dateBadge, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
              <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.dateBadgeText, { color: colors.textMuted }]}>Effective: {EFFECTIVE_DATE}</Text>
            </View>
          </View>
        </LinearGradient>

        <SectionCard title="Acceptance of Terms" num="1" colors={colors}>
          <Para colors={colors}>
            By downloading, installing, accessing, or using {APP_NAME} ("the App", "the Service"), you ("User", "you") unconditionally agree to be bound by these Terms of Service ("Terms"), our Privacy Policy, and any other policies referenced herein.
          </Para>
          <Para colors={colors}>
            If you do not agree to any part of these Terms, you must immediately stop using the App. We reserve the right to modify these Terms at any time without prior notice. Changes become effective when the consent version is updated in-app. Continued use after accepting updated Terms constitutes full agreement.
          </Para>
          <WarnBox text="BinRo is a growing, early-access app. Most things work great, but we're still refining features, so availability and results may occasionally vary as we improve." colors={colors} />
        </SectionCard>

        <SectionCard title="Description of Service" num="2" colors={colors}>
          <Para colors={colors}>{APP_NAME} is a platform for:</Para>
          <Bullet text="QR code scanning via device camera and gallery image upload" colors={colors} />
          <Bullet text="AI-assisted and community-powered QR code safety analysis and scoring" colors={colors} />
          <Bullet text="User-submitted safety reports, community commentary, and trust voting" colors={colors} />
          <Bullet text="Living Shield QR code generation with dynamic, updatable destinations" colors={colors} />
          <Bullet text="Branded individual and business QR code generation" colors={colors} />
          <Bullet text="Threat intelligence database powered by aggregated community scan data" colors={colors} />
          <Para colors={colors}>
            The Service is provided for informational and protective purposes. Nothing in the App constitutes professional cybersecurity, financial, legal, or expert advice.
          </Para>
        </SectionCard>

        <SectionCard title="Service Quality & Warranty" num="3" colors={colors}>
          <View style={[styles.warningBox, { backgroundColor: colors.warningDim, borderColor: colors.warning + "35" }]}>
            <Ionicons name="information-circle" size={16} color={colors.warning} />
            <Text style={[styles.warningText, { color: colors.warning }]}>
              The App is provided on an "as is" and "as available" basis, without guarantees beyond what's described here.
            </Text>
          </View>
          <Para colors={colors}>To keep this clear and fair, we don't guarantee:</Para>
          <Bullet text="Merchantability, fitness for a particular purpose, or non-infringement" colors={colors} />
          <Bullet text="Complete accuracy of every QR code analysis or safety verdict" colors={colors} />
          <Bullet text="Uninterrupted, error-free, or fully secure operation of the App at all times" colors={colors} />
          <Bullet text="Detection of every possible malicious QR code, phishing URL, or fraudulent content" colors={colors} />
          <Bullet text="That a 'Safe' rating means zero risk, or a 'Dangerous' rating is always accurate" colors={colors} />
          <Para colors={colors}>
            BinRo is an informational tool designed to support your decisions — the final call on any QR code is always yours.
          </Para>
        </SectionCard>

        <SectionCard title="Limitation of Liability" num="4" colors={colors}>
          <Para colors={colors}>
            To the extent permitted by the laws of India (including the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023), BinRo and its team are not responsible for:
          </Para>
          <Bullet text="Financial loss, theft, or fraud resulting from acting on any QR code, regardless of the App's stated safety verdict" colors={colors} />
          <Bullet text="Identity theft, data compromise, or device issues arising from a QR code or linked destination" colors={colors} />
          <Bullet text="Loss of business, revenue, profits, data, goodwill, or opportunity" colors={colors} />
          <Bullet text="Decisions made based on a trust score, safety rating, community report, or AI-generated analysis" colors={colors} />
          <Bullet text="Any government fine, regulatory penalty, or civil claim arising from your use of the App" colors={colors} />
          <Bullet text="Indirect, consequential, or incidental damages of any kind" colors={colors} />
          <Para colors={colors}>
            Our total liability for any claim relating to your use of the App is limited to the amount you've paid us, if any, in the preceding 12 months.
          </Para>
        </SectionCard>

        <SectionCard title="Indemnification" num="5" colors={colors}>
          <Para colors={colors}>
            You agree to indemnify, defend, and hold harmless BinRo, its developers, officers, employees, and affiliates from and against any and all claims, damages, liabilities, costs, and expenses (including reasonable legal fees) arising out of or related to:
          </Para>
          <Bullet text="Your use of or reliance on the App or its outputs" colors={colors} />
          <Bullet text="Your violation of these Terms" colors={colors} />
          <Bullet text="Any content, reports, or comments you submit through the App" colors={colors} />
          <Bullet text="Your violation of any applicable law, regulation, or third-party right" colors={colors} />
          <Bullet text="Any dispute between you and any third party in connection with the App" colors={colors} />
        </SectionCard>

        <SectionCard title="Getting Smarter & Keeping the Lights On" num="6" colors={colors}>
          <Para colors={colors}>
            To keep BinRo accurate and free, anonymised usage patterns and community contributions may be used to:
          </Para>
          <Bullet text="Train and improve BinRo's threat detection models and pattern recognition systems" colors={colors} />
          <Bullet text="Build and maintain an anonymised threat intelligence database that may be shared with security partners" colors={colors} />
          <Bullet text="Analyse aggregate behavioural patterns to guide product improvements and new features" colors={colors} />
          <Bullet text="Show relevant in-app ads based on aggregated, non-personally-identifiable usage data" colors={colors} />
          <Bullet text="Share anonymised, aggregated data patterns with advertising partners for ad relevance" colors={colors} />
          <Para colors={colors}>
            We never share your name, email, specific QR code content, or payment data with advertisers. All of the above uses only anonymised, aggregated patterns — nothing tied to you personally. You can opt out of personalised advertising anytime by contacting {CONTACT_EMAIL}.
          </Para>
        </SectionCard>

        <SectionCard title="User Responsibilities" num="7" colors={colors}>
          <Para colors={colors}>You are solely and exclusively responsible for:</Para>
          <Bullet text="All decisions made after scanning a QR code, regardless of the App's verdict" colors={colors} />
          <Bullet text="Verifying the legitimacy of any website, payment request, file download, or content reached via a QR code" colors={colors} />
          <Bullet text="The accuracy, truthfulness, and legality of all reports, comments, and votes you submit" colors={colors} />
          <Bullet text="Maintaining the security of your account credentials" colors={colors} />
          <Bullet text="Any financial transactions you initiate after scanning a QR code" colors={colors} />
          <Bullet text="Any harm caused to yourself or others through your use of or reliance on the App" colors={colors} />
        </SectionCard>

        <SectionCard title="Prohibited Uses" num="8" colors={colors}>
          <Para colors={colors}>You must not use the App to:</Para>
          <Bullet text="Submit false, malicious, defamatory, or fraudulent reports or comments" colors={colors} />
          <Bullet text="Attempt to manipulate trust scores through coordinated, fake, or automated reporting" colors={colors} />
          <Bullet text="Reverse-engineer, decompile, or exploit the App or its backend infrastructure" colors={colors} />
          <Bullet text="Generate QR codes intended to defraud, phish, harm, or deceive recipients" colors={colors} />
          <Bullet text="Harvest, scrape, or collect data from other users" colors={colors} />
          <Bullet text="Interfere with the normal operation of the App or its servers" colors={colors} />
          <Bullet text="Use the App in violation of any applicable law or regulation" colors={colors} />
          <Para colors={colors}>
            Violations may result in immediate account suspension, permanent ban, and/or referral to law enforcement.
          </Para>
        </SectionCard>

        <SectionCard title="Community Content & Reports" num="9" colors={colors}>
          <Para colors={colors}>
            By submitting any report, comment, vote, or other content ("User Content"), you represent and warrant that:
          </Para>
          <Bullet text="Your User Content is truthful and based on your genuine personal experience" colors={colors} />
          <Bullet text="You own or have the right to submit the User Content" colors={colors} />
          <Bullet text="Your User Content does not violate any law or third-party right" colors={colors} />
          <Para colors={colors}>
            You grant BinRo a worldwide, non-exclusive, royalty-free, perpetual licence to use, reproduce, modify, and display your User Content (in anonymised form) for the purposes of operating and improving the Service, including AI training and threat intelligence.
          </Para>
          <Para colors={colors}>
            We reserve the right to remove any User Content that violates these Terms without notice or liability.
          </Para>
        </SectionCard>

        <SectionCard title="Profile Visibility & Friends" num="10" colors={colors}>
          <Para colors={colors}>
            By default, your profile is public and visible to all users worldwide. You may switch to a private account in Privacy Settings at any time.
          </Para>
          <Bullet text="Private accounts: only approved friends see your full profile, QR codes, stats, and activity" colors={colors} />
          <Bullet text="Public data (name, username, profile photo) remains visible regardless of privacy setting" colors={colors} />
          <Bullet text="Anonymous QR report data (trust scores, scan counts) is always public and cannot be made private" colors={colors} />
          <Para colors={colors}>
            You are responsible for managing your own friend list and privacy settings. BinRo is not liable for data exposure resulting from your privacy settings choices.
          </Para>
        </SectionCard>

        <SectionCard title="Living Shield QR Codes" num="11" colors={colors}>
          <Para colors={colors}>
            Owners of Living Shield (business) QR codes are solely and exclusively responsible for all content their QR codes redirect to, including any changes made after initial creation.
          </Para>
          <Para colors={colors}>
            Misuse of Living Shield QR codes to redirect victims to malicious, fraudulent, or harmful destinations constitutes a material breach of these Terms and may be reported to law enforcement. BinRo reserves the right to deactivate any QR code at any time if it is found to be used maliciously.
          </Para>
        </SectionCard>

        <SectionCard title="Governing Law & Dispute Resolution" num="12" colors={colors}>
          <Para colors={colors}>
            These Terms are governed exclusively by the laws of the Republic of India, without regard to conflict of law principles.
          </Para>
          <Para colors={colors}>
            Before initiating any legal proceedings, you agree to first contact us at {CONTACT_EMAIL} and attempt to resolve any dispute in good faith for a period of 30 days.
          </Para>
          <Para colors={colors}>
            If good-faith negotiation fails, disputes shall be resolved by binding arbitration under the Arbitration and Conciliation Act, 1996 of India. The seat and venue of arbitration shall be Kerala, India. The arbitration shall be conducted in English by a sole arbitrator appointed by mutual agreement.
          </Para>
          <Para colors={colors}>
            Claims are handled individually rather than as part of a class action or class-wide arbitration.
          </Para>
          <Para colors={colors}>
            If arbitration isn't permitted under applicable law, courts in Kerala, India will have exclusive jurisdiction over any dispute.
          </Para>
        </SectionCard>

        <SectionCard title="Termination" num="13" colors={colors}>
          <Para colors={colors}>
            We reserve the right to suspend or terminate your account and access to the App at any time, with or without notice, for any violation of these Terms or for any other reason at our sole discretion.
          </Para>
          <Para colors={colors}>
            Upon termination, your licence to use the App ceases immediately. Provisions of these Terms that by their nature should survive termination (including Sections 4, 5, 6, 12) shall survive.
          </Para>
        </SectionCard>

        <SectionCard title="Severability & Entire Agreement" num="14" colors={colors}>
          <Para colors={colors}>
            If any provision of these Terms is found to be invalid or unenforceable under applicable law, that provision shall be modified to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
          </Para>
          <Para colors={colors}>
            These Terms, together with our Privacy Policy and the in-app Consent Agreement, constitute the entire agreement between you and BinRo regarding the Service and supersede all prior agreements.
          </Para>
        </SectionCard>

        <SectionCard title="Supporting BinRo" num="15" colors={colors}>
          <Para colors={colors}>
            If you'd like to support BinRo's development, you can make a small optional contribution through Google Play's secure billing system. By contributing, you agree to the following, in addition to Google Play's Terms of Service.
          </Para>
          <Bullet text="Contributions are entirely voluntary and are offered in a few small amounts." colors={colors} />
          <Bullet text="They're one-time and don't create any subscription or recurring charge." colors={colors} />
          <Bullet text="They don't unlock premium features — BinRo stays free and fully usable for everyone either way." colors={colors} />
          <Bullet text="All transactions are handled securely by Google Play. BinRo never sees or stores your payment details." colors={colors} />
          <Bullet text="Every contribution goes straight back into keeping BinRo running — covering server costs, safety-check APIs, and ongoing development." colors={colors} />
          <Para colors={colors}>
            Refunds for these contributions are handled by Google Play Support, since that's who processes the transaction — just reach out to them directly and they'll take care of it.
          </Para>
          <Para colors={colors}>
            We may adjust or pause this feature from time to time as we keep improving the app.
          </Para>
        </SectionCard>

        <SectionCard title="Contact" num="16" colors={colors}>
          <Para colors={colors}>For legal matters, policy questions, or to report a violation, contact us at:</Para>
          <View style={[styles.contactCard, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" }]}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
            <Text style={[styles.contactEmail, { color: colors.primary }]}>{CONTACT_EMAIL}</Text>
          </View>
          <Para colors={colors}>We aim to respond to all legal enquiries within 5 business days.</Para>
        </SectionCard>

        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>{APP_NAME} — Scan smart. Stay safe. v2.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navTitle: { fontSize: 16, fontFamily: "Inter_700Bold", flex: 1, textAlign: "center" },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  scrollContent: { padding: 16, gap: 10 },
  heroBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 14,
    borderRadius: 20, padding: 16, borderWidth: 1,
  },
  heroIconWrap: {
    width: 48, height: 48, borderRadius: 15,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  heroTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 5 },
  heroSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 8 },
  dateBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1,
    alignSelf: "flex-start",
  },
  dateBadgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  sectionCard: { borderRadius: 16, borderWidth: 1, padding: 14 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 9 },
  sectionNum: { width: 24, height: 24, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  sectionNumText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_700Bold", flex: 1 },
  warningBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 8,
  },
  warningText: { fontSize: 11, fontFamily: "Inter_600SemiBold", flex: 1, lineHeight: 16 },
  para: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 5 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 9, marginBottom: 5 },
  bulletDot: { width: 4, height: 4, borderRadius: 2, marginTop: 7, flexShrink: 0 },
  bulletText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  contactCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 12, padding: 12, marginVertical: 8, borderWidth: 1,
  },
  contactEmail: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 14 },
  footerText: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
