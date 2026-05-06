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
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import type { AppColors } from "@/constants/colors";

const EFFECTIVE_DATE = "April 8, 2026";
const CONTACT_EMAIL = "privacy@qrguard.app";
const LEGAL_EMAIL = "legal@qrguard.app";

function SectionCard({ title, num, icon, children, colors }: { title: string; num: string; icon?: string; children: React.ReactNode; colors: AppColors }) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionNum, { backgroundColor: colors.primaryDim }]}>
          <Text style={[styles.sectionNumText, { color: colors.primary }]}>{num}</Text>
        </View>
        {icon && (
          <View style={[styles.sectionIcon, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons name={icon as any} size={15} color={colors.textSecondary} />
          </View>
        )}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function WarningBox({ text, colors }: { text: string; colors: AppColors }) {
  return (
    <View style={[styles.warningBox, { backgroundColor: colors.warningDim, borderColor: colors.warning + "35" }]}>
      <Ionicons name="warning" size={15} color={colors.warning} />
      <Text style={[styles.warningText, { color: colors.warning }]}>{text}</Text>
    </View>
  );
}

function Para({ children, colors }: { children: React.ReactNode; colors: AppColors }) {
  return <Text style={[styles.para, { color: colors.textSecondary }]}>{children}</Text>;
}

function SubHead({ text, colors }: { text: string; colors: AppColors }) {
  return <Text style={[styles.subhead, { color: colors.text }]}>{text}</Text>;
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

export default function PrivacyPolicyScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.surfaceBorder }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        <LinearGradient
          colors={colors.isDark
            ? ["rgba(0,214,143,0.10)", "rgba(0,166,126,0.05)", "transparent"]
            : ["rgba(0,166,126,0.07)", "rgba(0,166,126,0.03)", "transparent"]}
          style={[styles.heroBanner, { borderColor: colors.safe + "30" }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <LinearGradient
            colors={[colors.safe, colors.safe + "BB"]}
            style={styles.heroIconWrap}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="lock-closed" size={28} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Privacy Policy</Text>
            <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
              QR Guard (Beta) — understand how your data is collected, used, and protected.
            </Text>
            <View style={[styles.dateBadge, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
              <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.dateBadgeText, { color: colors.textMuted }]}>Effective: {EFFECTIVE_DATE}</Text>
            </View>
          </View>
        </LinearGradient>

        <SectionCard title="Who We Are" num="1" icon="shield-outline" colors={colors}>
          <Para colors={colors}>
            QR Guard is a beta-stage mobile application designed to help users scan, analyse, generate, and manage QR codes. We are a private software project operating under the laws of India. This policy applies to all users of QR Guard on Android, iOS, and web platforms.
          </Para>
          <WarningBox text="QR Guard is a BETA product. Features, data handling practices, and policies may change. You will be required to re-accept updated terms when material changes are made." colors={colors} />
        </SectionCard>

        <SectionCard title="Data We Collect" num="2" icon="layers-outline" colors={colors}>
          <Para colors={colors}>By using QR Guard, you agree we collect the following categories of information:</Para>

          <SubHead text="Account & Identity Data" colors={colors} />
          <Bullet text="Email address, display name, profile photo (if uploaded)" colors={colors} />
          <Bullet text="Google account ID and authentication tokens (if using Google Sign-In)" colors={colors} />
          <Bullet text="Password hash (never stored in plaintext) for email accounts" colors={colors} />

          <SubHead text="QR Code & Scan Data" colors={colors} />
          <Bullet text="Full content of every QR code you scan: URLs, payment details (UPI VPA, amount, merchant), contact info, Wi-Fi credentials, plain text, location data embedded in codes" colors={colors} />
          <Bullet text="Timestamp, device platform, and app version at time of each scan" colors={colors} />
          <Bullet text="QR codes you generate, their destinations, and scan counts" colors={colors} />
          <Bullet text="Community reports, votes, and comments you submit on any QR code" colors={colors} />

          <SubHead text="Usage & Behavioural Data" colors={colors} />
          <Bullet text="In-app navigation patterns, feature usage frequency, and session duration" colors={colors} />
          <Bullet text="Scan velocity data (how often a particular QR code is scanned across all users)" colors={colors} />
          <Bullet text="Search queries entered within the app" colors={colors} />
          <Bullet text="Friend connections, follows, and social interactions" colors={colors} />

          <SubHead text="Device & Network Data" colors={colors} />
          <Bullet text="Device type, OS version, screen resolution, and app version" colors={colors} />
          <Bullet text="IP address and approximate geographic location derived from IP" colors={colors} />
          <Bullet text="Network type (Wi-Fi or mobile data)" colors={colors} />
          <Bullet text="Crash logs and error reports for debugging" colors={colors} />

          <SubHead text="Camera & Media Data" colors={colors} />
          <Bullet text="Camera frames are processed locally on your device for QR detection. Images are NOT uploaded to our servers unless you explicitly upload a gallery image for scanning." colors={colors} />
        </SectionCard>

        <SectionCard title="How We Use Your Data" num="3" icon="settings-outline" colors={colors}>
          <Para colors={colors}>Your data is used for the following purposes. By using QR Guard, you consent to all of these uses:</Para>

          <SubHead text="Core Service Delivery" colors={colors} />
          <Bullet text="Authenticate your account, maintain sessions, and secure your profile" colors={colors} />
          <Bullet text="Perform QR code safety analysis using heuristics, blacklists, and community data" colors={colors} />
          <Bullet text="Sync scan history, favourites, and generated QR codes across your devices" colors={colors} />
          <Bullet text="Power community trust scores from aggregated, weighted user reports" colors={colors} />
          <Bullet text="Send in-app notifications about QR codes you follow or report activity" colors={colors} />

          <SubHead text="AI Model Training & Improvement" colors={colors} />
          <WarningBox text="YOUR DATA MAY BE USED TO TRAIN AI MODELS. Read this section carefully." colors={colors} />
          <Bullet text="Aggregated, anonymised QR code scan data and safety reports are used to train and improve our machine learning threat detection models." colors={colors} />
          <Bullet text="URL patterns, domain characteristics, and payment data structures from scanned QR codes contribute to our pattern recognition database for identifying new threats." colors={colors} />
          <Bullet text="Community report patterns (which codes users flag as safe/scam/fake/spam) are used to improve automated classification accuracy." colors={colors} />
          <Bullet text="Your usage behaviour patterns are analysed to improve the app's user experience and feature prioritisation." colors={colors} />
          <Bullet text="We may use anonymised scan data to build and license threat intelligence datasets. Your personal identity is never included in such datasets." colors={colors} />

          <SubHead text="Advertising & Monetisation" colors={colors} />
          <WarningBox text="YOUR DATA MAY BE USED FOR ADVERTISING PURPOSES. Read this section carefully." colors={colors} />
          <Bullet text="Aggregated, non-personally-identifiable usage data and behavioural patterns may be used to display contextually relevant in-app advertisements." colors={colors} />
          <Bullet text="Device type, approximate location (city/region level), and general usage category data may be shared with advertising partners to serve relevant ads." colors={colors} />
          <Bullet text="We do not share your name, email address, specific QR scan content, or payment data with advertisers." colors={colors} />
          <Bullet text="You may opt out of personalised advertising by contacting us at {LEGAL_EMAIL}. Note: opting out does not eliminate all ads, only personalised ones." colors={colors} />

          <SubHead text="Security, Legal & Compliance" colors={colors} />
          <Bullet text="Detect and prevent abuse, fraud, spam, and coordinated trust score manipulation" colors={colors} />
          <Bullet text="Comply with applicable Indian law, government orders, and court directives" colors={colors} />
          <Bullet text="Respond to law enforcement requests as required by applicable law" colors={colors} />
        </SectionCard>

        <SectionCard title="Data Pattern Analysis & Database Use" num="4" icon="analytics-outline" colors={colors}>
          <Para colors={colors}>
            QR Guard maintains a continuously updated threat intelligence database derived from community scan data and reports. This database powers our real-time QR code safety analysis.
          </Para>
          <Bullet text="Scan patterns across our entire user base are analysed to detect emerging fraud campaigns, phishing waves, and new malicious QR code formats." colors={colors} />
          <Bullet text="Payment QR codes (UPI, BharatQR, etc.) are analysed in aggregate for unusual merchant patterns that may indicate fraud." colors={colors} />
          <Bullet text="URL and domain patterns from scanned QR codes are added to our threat pattern database and may be shared with our threat intelligence partners in anonymised form." colors={colors} />
          <Bullet text="Community report data is used to build statistical models that weight reporter credibility and detect coordinated abuse." colors={colors} />
          <Para colors={colors}>
            All pattern analysis databases use anonymised and aggregated data. We do not build databases that link specific QR code content to individual users.
          </Para>
        </SectionCard>

        <SectionCard title="Firebase & Third-Party Infrastructure" num="5" icon="server-outline" colors={colors}>
          <Para colors={colors}>
            QR Guard uses Google Firebase for backend infrastructure. Your data is stored in Firebase Firestore, Firebase Realtime Database, and Firebase Auth. Firebase is compliant with GDPR, SOC 2, and ISO 27001.
          </Para>
          <Para colors={colors}>
            We also use: Google Safe Browsing API (URL threat checking), Razorpay (donation processing), and third-party analytics and crash reporting tools. These services have their own privacy policies which govern their use of data they receive.
          </Para>
          <Para colors={colors}>
            We are not responsible for the data practices of these third-party providers. Links to their privacy policies are available on request.
          </Para>
        </SectionCard>

        <SectionCard title="Data Retention" num="6" icon="time-outline" colors={colors}>
          <Bullet text="Account data is retained while your account is active." colors={colors} />
          <Bullet text="Upon account deletion, personally identifiable data is removed from active databases within 30 days." colors={colors} />
          <Bullet text="Anonymised, aggregated data (scan counts, threat patterns, trust scores) may be retained indefinitely as part of our threat intelligence database." colors={colors} />
          <Bullet text="Backup copies may be retained for up to 90 days post-deletion for disaster recovery purposes." colors={colors} />
          <Bullet text="Data submitted as community reports may persist in anonymised form even after account deletion." colors={colors} />
        </SectionCard>

        <SectionCard title="Data Sharing & Disclosure" num="7" icon="share-outline" colors={colors}>
          <Para colors={colors}>We may share data in the following circumstances:</Para>
          <Bullet text="With Google Firebase as our primary infrastructure and authentication provider." colors={colors} />
          <Bullet text="With advertising partners: aggregated, non-personally-identifiable usage data only." colors={colors} />
          <Bullet text="With AI/ML partners: anonymised scan patterns and threat data for model improvement." colors={colors} />
          <Bullet text="With threat intelligence sharing networks: anonymised URL/domain/QR threat patterns." colors={colors} />
          <Bullet text="When required by law, court order, government directive, or to protect public safety." colors={colors} />
          <Bullet text="In the event of acquisition or merger, under equivalent privacy protections." colors={colors} />
          <Para colors={colors}>
            We never sell your name, email address, phone number, specific QR scan content, payment data, or any directly personally identifiable information to third parties for commercial purposes.
          </Para>
        </SectionCard>

        <SectionCard title="Government & Law Enforcement Requests" num="8" icon="business-outline" colors={colors}>
          <Para colors={colors}>
            QR Guard operates under Indian law. We comply with lawful government and law enforcement requests for user data, including those made under the Information Technology Act, 2000, the Digital Personal Data Protection Act, 2023, and applicable court orders.
          </Para>
          <Para colors={colors}>
            Where legally permitted to do so, we will notify affected users of such requests. We review all government data requests for legal validity before complying.
          </Para>
          <Para colors={colors}>
            We do not provide government agencies with backdoor access to our systems or databases. All data access requires valid legal process.
          </Para>
        </SectionCard>

        <SectionCard title="Data Security & Breach Policy" num="9" icon="lock-closed-outline" colors={colors}>
          <Para colors={colors}>
            All data in transit between your device and our servers is encrypted using TLS 1.2+. Firebase Auth uses industry-standard OAuth 2.0 and secure token management. Data at rest is encrypted using AES-256 where Firebase infrastructure supports it.
          </Para>
          <WarningBox text="No system is 100% secure. Data breaches can and do happen to any service. By using QR Guard, you acknowledge and accept this risk." colors={colors} />
          <Para colors={colors}>
            In the event of a data breach that affects your personal data, we will: (1) notify you by email or in-app notification as soon as practicable; (2) notify relevant authorities as required under applicable law; (3) take immediate steps to contain and remediate the breach.
          </Para>
          <Para colors={colors}>
            QR Guard's liability for data breaches caused by third-party actors, cyberattacks, or events beyond our reasonable control is expressly limited to the extent permitted by applicable law.
          </Para>
        </SectionCard>

        <SectionCard title="Profile Privacy Controls" num="10" icon="shield-half-outline" colors={colors}>
          <SubHead text="Public Account (Default)" colors={colors} />
          <Bullet text="Your profile, QR codes, stats, and activity are visible to all QR Guard users worldwide." colors={colors} />
          <SubHead text="Private Account" colors={colors} />
          <Bullet text="Only approved friends can see your full profile, QR codes, and activity." colors={colors} />
          <Bullet text="Other users see only your name, username, and profile photo." colors={colors} />
          <SubHead text="Friends System" colors={colors} />
          <Bullet text="Friends are added via mutual consent. Both parties must agree." colors={colors} />
          <Bullet text="You can remove a friend at any time. Removal immediately revokes profile access." colors={colors} />
        </SectionCard>

        <SectionCard title="Your Rights" num="11" icon="person-outline" colors={colors}>
          <Para colors={colors}>Under applicable Indian and international data protection law, you have the following rights:</Para>
          <Bullet text="Access — request a copy of all personal data we hold about you." colors={colors} />
          <Bullet text="Correction — update your name, email, or profile photo in-app or by contacting us." colors={colors} />
          <Bullet text="Deletion — permanently delete your account via Account Management. Personal data removed within 30 days." colors={colors} />
          <Bullet text="Portability — request your data in a machine-readable format." colors={colors} />
          <Bullet text="Withdraw consent for personalised advertising — email us at {LEGAL_EMAIL}." colors={colors} />
          <Bullet text="Lodge a complaint with the relevant data protection authority in your jurisdiction." colors={colors} />
          <Para colors={colors}>
            Note: Some data rights may be limited where data has been anonymised and incorporated into community or AI datasets, as anonymised data cannot be attributed to a specific individual.
          </Para>
        </SectionCard>

        <SectionCard title="Children's Privacy" num="12" icon="happy-outline" colors={colors}>
          <Para colors={colors}>
            QR Guard is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal data without parental consent, contact us immediately at {CONTACT_EMAIL} and we will delete the data.
          </Para>
        </SectionCard>

        <SectionCard title="Changes to This Policy" num="13" icon="refresh-outline" colors={colors}>
          <Para colors={colors}>
            We may update this Privacy Policy from time to time. When we make material changes, we will increment the consent version in the app, and all users will be required to re-accept before continuing to use QR Guard. Continued use of the app after accepting the updated policy constitutes your agreement to the revised terms.
          </Para>
          <Para colors={colors}>
            We recommend reviewing this policy periodically. The effective date at the top of this page reflects the most recent revision.
          </Para>
        </SectionCard>

        <SectionCard title="Contact Us" num="14" icon="mail-outline" colors={colors}>
          <Para colors={colors}>For privacy questions, data access requests, or to exercise your rights, contact us:</Para>
          <View style={[styles.contactCard, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" }]}>
            <View style={[styles.contactIconWrap, { backgroundColor: colors.primary + "22" }]}>
              <Ionicons name="mail-outline" size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.contactEmail, { color: colors.primary }]}>{CONTACT_EMAIL}</Text>
              <Text style={[styles.contactEmail, { color: colors.primary }]}>{LEGAL_EMAIL}</Text>
            </View>
          </View>
          <Para colors={colors}>We aim to respond to all privacy-related enquiries within 5 business days.</Para>
        </SectionCard>

        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>QR Guard — Scan smart. Stay safe. Stay private. v2.0</Text>
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
  sectionIcon: { width: 22, height: 22, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_700Bold", flex: 1 },
  subhead: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 8, marginBottom: 4 },
  para: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 6 },
  warningBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 8,
  },
  warningText: { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1, lineHeight: 17 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 9, marginBottom: 5 },
  bulletDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 8, flexShrink: 0 },
  bulletText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  contactCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 12, padding: 12, marginVertical: 8, borderWidth: 1,
  },
  contactIconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  contactEmail: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 14 },
  footerText: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
