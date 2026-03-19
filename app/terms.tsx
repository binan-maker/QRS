import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

const EFFECTIVE_DATE = "March 19, 2026";
const CONTACT_EMAIL = "legal@qrguard.app";
const APP_NAME = "QR Guard";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return <Text style={styles.para}>{children}</Text>;
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.navTitle}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        <View style={styles.heroBanner}>
          <View style={styles.heroIcon}>
            <Ionicons name="document-text" size={32} color={Colors.dark.primary} />
          </View>
          <Text style={styles.heroTitle}>Terms of Service</Text>
          <Text style={styles.heroSub}>
            Please read these terms carefully before using {APP_NAME}. By using the app, you agree to be bound by these terms.
          </Text>
          <Text style={styles.effectiveDate}>Effective date: {EFFECTIVE_DATE}</Text>
        </View>

        <Section title="1. Acceptance of Terms">
          <Para>
            By downloading, installing, or using {APP_NAME} ("the App", "the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you must not use the App. These Terms constitute a legally binding agreement between you ("User", "you") and the operators of {APP_NAME} ("we", "us", "our").
          </Para>
          <Para>
            We reserve the right to modify these Terms at any time. Continued use of the App after changes are posted constitutes your acceptance of the revised Terms.
          </Para>
        </Section>

        <Section title="2. Description of Service">
          <Para>
            {APP_NAME} is a QR code scanning, analysis, and generation tool designed to help users identify potentially malicious, fraudulent, or suspicious QR codes. The App provides:
          </Para>
          <Bullet text="QR code scanning via device camera" />
          <Bullet text="QR code content analysis and safety scoring based on community data" />
          <Bullet text="User-submitted safety reports and community commentary" />
          <Bullet text="Living Shield QR code generation with dynamic destinations" />
          <Bullet text="Community trust scores derived from aggregated user reports" />
        </Section>

        <Section title="3. Disclaimer of Warranties — Read Carefully">
          <Para>
            THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT ANY WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, OR NON-INFRINGEMENT.
          </Para>
          <Para>
            WE DO NOT GUARANTEE THAT:
          </Para>
          <Bullet text="Any QR code marked as 'Safe' is actually safe. Trust scores reflect community opinion, not verified fact." />
          <Bullet text="Any QR code marked as 'Dangerous' or 'Scam' is actually fraudulent. Reports may be incorrect." />
          <Bullet text="The App will detect all malicious QR codes, phishing URLs, or fraudulent payment requests." />
          <Bullet text="The App will be free from errors, bugs, interruptions, or security vulnerabilities." />
          <Bullet text="Content in user comments is accurate, truthful, or safe." />
          <Para>
            QR GUARD IS AN INFORMATIONAL TOOL ONLY. ALL SCANNING DECISIONS ARE MADE SOLELY BY YOU. WE ACCEPT NO RESPONSIBILITY WHATSOEVER FOR ANY ACTION YOU TAKE — OR FAIL TO TAKE — BASED ON INFORMATION PROVIDED BY THIS APP.
          </Para>
        </Section>

        <Section title="4. Limitation of Liability">
          <Para>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL WE, OUR DIRECTORS, EMPLOYEES, AFFILIATES, PARTNERS, OR SERVICE PROVIDERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO:
          </Para>
          <Bullet text="Financial loss from following a QR code to a fraudulent payment or phishing site" />
          <Bullet text="Data breach, identity theft, or device compromise resulting from scanning a QR code" />
          <Bullet text="Loss of business, profits, revenue, data, or goodwill" />
          <Bullet text="Personal injury or property damage arising from use of the App" />
          <Bullet text="Reliance on any trust score, safety rating, or community report in the App" />
          <Bullet text="Damages arising from service outages, data loss, or App malfunction" />
          <Para>
            OUR TOTAL AGGREGATE LIABILITY TO YOU FOR ANY CLAIM ARISING OUT OF OR RELATED TO THESE TERMS OR THE APP SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR USD $10.00, WHICHEVER IS LESS.
          </Para>
          <Para>
            SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN WARRANTIES OR LIABILITY. IN SUCH JURISDICTIONS, OUR LIABILITY IS LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW.
          </Para>
        </Section>

        <Section title="5. No Professional Advice">
          <Para>
            Nothing in this App constitutes financial, legal, cybersecurity, or professional advice of any kind. Trust scores and safety ratings are community-driven opinions and must not be treated as expert assessments. Always exercise independent judgment and consult qualified professionals when in doubt about a QR code's legitimacy — especially before making any financial transaction.
          </Para>
        </Section>

        <Section title="6. User Responsibilities">
          <Para>
            You are solely responsible for:
          </Para>
          <Bullet text="All decisions made after scanning a QR code, regardless of what the App displays" />
          <Bullet text="Verifying the legitimacy of any website, payment request, or content reached via a QR code" />
          <Bullet text="Ensuring you have permission to scan QR codes on private or restricted premises" />
          <Bullet text="The accuracy and legality of any reports, comments, or content you submit" />
          <Bullet text="Keeping your account credentials secure" />
          <Bullet text="Any harm caused to others by false or misleading reports you submit" />
        </Section>

        <Section title="7. Community Content & Reports">
          <Para>
            Users may submit reports, comments, and safety ratings ("User Content"). By submitting User Content, you:
          </Para>
          <Bullet text="Represent that it is truthful, accurate, and based on genuine experience" />
          <Bullet text="Grant us a worldwide, royalty-free licence to display, aggregate, and use it to power trust scores" />
          <Bullet text="Agree not to submit defamatory, false, harassing, or malicious reports" />
          <Para>
            We do not endorse, verify, or guarantee the accuracy of any User Content. We reserve the right to remove any content that violates these Terms or applicable law. You acknowledge that we are not liable for any User Content submitted by other users.
          </Para>
        </Section>

        <Section title="8. Prohibited Uses">
          <Para>You must not use the App to:</Para>
          <Bullet text="Submit false, malicious, or defamatory reports about QR codes or businesses" />
          <Bullet text="Harass, threaten, or harm other users" />
          <Bullet text="Attempt to manipulate trust scores through coordinated fake reporting" />
          <Bullet text="Reverse-engineer, decompile, or exploit the App or its infrastructure" />
          <Bullet text="Use the App for any unlawful purpose or in violation of any applicable law" />
          <Bullet text="Impersonate any person or entity or misrepresent your affiliation" />
          <Bullet text="Generate QR codes intended to defraud, phish, or harm recipients" />
        </Section>

        <Section title="9. Living Shield QR Codes">
          <Para>
            Owners of Living Shield QR codes are solely responsible for all content their QR codes redirect to at any point in time, including after destination changes. We provide the redirect infrastructure only. We accept no liability for harm caused by the destination content of any user-generated QR code, including phishing, fraud, malware, or offensive material.
          </Para>
          <Para>
            Misuse of Living Shield QR codes to redirect victims to malicious destinations is a violation of these Terms and may be reported to law enforcement.
          </Para>
        </Section>

        <Section title="10. Third-Party Links and Services">
          <Para>
            QR codes you scan may lead to third-party websites, apps, or services that are entirely outside our control. We have no responsibility for the content, privacy practices, security, or legality of any third-party destination. Accessing third-party content is entirely at your own risk.
          </Para>
        </Section>

        <Section title="11. Account Termination">
          <Para>
            We reserve the right to suspend or terminate your account at any time, without notice, if we determine that you have violated these Terms or engaged in conduct harmful to other users, third parties, or the App's integrity. You may delete your account at any time from Settings.
          </Para>
        </Section>

        <Section title="12. Indemnification">
          <Para>
            You agree to indemnify, defend, and hold harmless us and our affiliates, officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, costs, or expenses (including reasonable legal fees) arising from: (a) your use of the App; (b) your violation of these Terms; (c) your User Content; or (d) your violation of any third-party rights.
          </Para>
        </Section>

        <Section title="13. Governing Law & Dispute Resolution">
          <Para>
            These Terms shall be governed by and construed in accordance with applicable law. Any dispute arising from these Terms or your use of the App shall first be attempted to be resolved through good-faith negotiation. If unresolved within 30 days, disputes shall be submitted to binding arbitration, and you waive any right to participate in a class-action lawsuit.
          </Para>
        </Section>

        <Section title="14. Severability">
          <Para>
            If any provision of these Terms is found to be invalid or unenforceable by a court of competent jurisdiction, the remaining provisions shall continue in full force and effect. The invalid provision shall be modified to the minimum extent necessary to make it enforceable.
          </Para>
        </Section>

        <Section title="15. Contact">
          <Para>
            For legal matters, questions about these Terms, or to report a violation, contact us at:
          </Para>
          <View style={styles.contactCard}>
            <Ionicons name="mail-outline" size={20} color={Colors.dark.primary} />
            <Text style={styles.contactEmail}>{CONTACT_EMAIL}</Text>
          </View>
          <Para>
            We aim to respond to all legal enquiries within 5 business days.
          </Para>
        </Section>

        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={20} color={Colors.dark.primary} />
          <Text style={styles.footerText}>
            {APP_NAME} — Scan smart. Stay safe.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  navBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder,
  },
  navTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.dark.text, flex: 1, textAlign: "center" },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.dark.surface, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  scrollContent: { padding: 20 },
  heroBanner: {
    alignItems: "center", backgroundColor: Colors.dark.surface,
    borderRadius: 20, padding: 24, marginBottom: 24,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  heroIcon: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: Colors.dark.primaryDim, alignItems: "center", justifyContent: "center",
    marginBottom: 14, borderWidth: 2, borderColor: Colors.dark.primary + "40",
  },
  heroTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.dark.text, marginBottom: 8, textAlign: "center" },
  heroSub: {
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary,
    textAlign: "center", lineHeight: 20, marginBottom: 12,
  },
  effectiveDate: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted },
  section: {
    backgroundColor: Colors.dark.surface, borderRadius: 16, padding: 18,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  sectionTitle: {
    fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.dark.primary,
    marginBottom: 10,
  },
  para: {
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary,
    lineHeight: 22, marginBottom: 8,
  },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 6 },
  bulletDot: {
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: Colors.dark.primary, marginTop: 8, flexShrink: 0,
  },
  bulletText: {
    flex: 1, fontSize: 14, fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary, lineHeight: 21,
  },
  contactCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.dark.primaryDim, borderRadius: 12, padding: 14,
    marginVertical: 10, borderWidth: 1, borderColor: Colors.dark.primary + "30",
  },
  contactEmail: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },
  footer: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, padding: 20, marginTop: 8,
  },
  footerText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted },
});
