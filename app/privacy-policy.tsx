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
import { useTheme } from "@/contexts/ThemeContext";
import type { AppColors } from "@/constants/colors";

const EFFECTIVE_DATE = "March 16, 2026";
const CONTACT_EMAIL = "privacy@qrguard.app";

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: AppColors }) {
  return (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>{title}</Text>
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
      <View style={[styles.bulletDot, { backgroundColor: colors.primary }]} />
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
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        <View style={[styles.heroBanner, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}>
            <Ionicons name="lock-closed" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Your Privacy Matters</Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
            We built QR Guard to protect you — and that commitment extends to how we handle your personal information.
          </Text>
          <Text style={[styles.effectiveDate, { color: colors.textMuted }]}>Effective date: {EFFECTIVE_DATE}</Text>
        </View>

        <Section title="1. Who We Are" colors={colors}>
          <Para colors={colors}>
            QR Guard ("we", "our", or "us") is a mobile application designed to help you scan, evaluate, and manage QR codes safely. We are committed to protecting your privacy and handling your data with transparency and respect.
          </Para>
        </Section>

        <Section title="2. What Information We Collect" colors={colors}>
          <Para colors={colors}>We collect only what is necessary to provide you with a safe and functional experience:</Para>
          <Text style={[styles.subhead, { color: colors.textSecondary }]}>Account Information</Text>
          <Bullet text="Email address and display name (when you create an account)" colors={colors} />
          <Bullet text="Profile photo (optional, uploaded by you)" colors={colors} />
          <Bullet text="Authentication tokens managed securely by Firebase Auth" colors={colors} />
          <Text style={[styles.subhead, { color: colors.textSecondary }]}>Usage Data</Text>
          <Bullet text="QR codes you scan (content stored locally on your device by default)" colors={colors} />
          <Bullet text="Reports and comments you submit on QR codes" colors={colors} />
          <Bullet text="QR codes you generate or bookmark as favourites" colors={colors} />
          <Bullet text="Accounts you follow and follower relationships" colors={colors} />
          <Text style={[styles.subhead, { color: colors.textSecondary }]}>Device & Technical Data</Text>
          <Bullet text="Device platform (iOS or Android) for compatibility purposes" colors={colors} />
          <Bullet text="Error logs to help us diagnose and fix crashes" colors={colors} />
          <Para colors={colors}>
            We do not collect your physical location, contact list, microphone audio, or any information beyond what is listed above.
          </Para>
        </Section>

        <Section title="3. How We Use Your Information" colors={colors}>
          <Para colors={colors}>Your data is used exclusively to provide and improve QR Guard:</Para>
          <Bullet text="Authenticate your account and keep it secure" colors={colors} />
          <Bullet text="Sync your scan history, favourites, and QR codes across devices" colors={colors} />
          <Bullet text="Power community trust scores through aggregated, anonymised reports" colors={colors} />
          <Bullet text="Send in-app notifications when QR codes you follow receive new activity" colors={colors} />
          <Bullet text="Respond to feedback you voluntarily submit" colors={colors} />
          <Bullet text="Detect abuse, spam, and fraudulent QR codes" colors={colors} />
          <Para colors={colors}>
            We do not sell, rent, or share your personal information with third-party advertisers — ever.
          </Para>
        </Section>

        <Section title="4. Firebase & Data Storage" colors={colors}>
          <Para colors={colors}>
            QR Guard uses Google Firebase for its backend infrastructure. Your data is stored in Firebase Firestore (structured data), Firebase Realtime Database (live notifications), and Firebase Auth (identity and authentication). Firebase is compliant with GDPR, SOC 2, and ISO 27001 standards.
          </Para>
          <Para colors={colors}>
            Scan history that you choose not to sync is stored exclusively on your device using encrypted local storage and never leaves your phone.
          </Para>
        </Section>

        <Section title="5. Data Retention" colors={colors}>
          <Para colors={colors}>
            We retain your data for as long as your account is active. If you delete your account, your personal data — including your profile, comments, and generated QR codes — is permanently removed from our servers within 30 days.
          </Para>
          <Para colors={colors}>
            Anonymised, aggregated data (such as total scan counts on a QR code) may be retained to preserve community trust scores even after account deletion, since this data no longer identifies you.
          </Para>
        </Section>

        <Section title="6. Sharing & Disclosure" colors={colors}>
          <Para colors={colors}>We do not sell your data. We may share limited information only in these circumstances:</Para>
          <Bullet text="With Firebase/Google as our infrastructure provider (governed by their privacy policy)" colors={colors} />
          <Bullet text="When required by law, court order, or to protect public safety" colors={colors} />
          <Bullet text="If QR Guard is acquired, your data would be transferred only under equivalent privacy protections" colors={colors} />
        </Section>

        <Section title="7. Your Rights" colors={colors}>
          <Para colors={colors}>You have meaningful control over your data at all times:</Para>
          <Bullet text="Access — view all data we hold about you through your profile" colors={colors} />
          <Bullet text="Correction — update your name and profile photo in app settings" colors={colors} />
          <Bullet text="Deletion — permanently delete your account and all associated data from Account Management" colors={colors} />
          <Bullet text="Export — contact us to request a copy of your data" colors={colors} />
          <Bullet text="Opt-out — disable account sync and keep all data local only" colors={colors} />
          <Para colors={colors}>
            To exercise any of these rights, email us at {CONTACT_EMAIL} or use the Delete Account option in the app.
          </Para>
        </Section>

        <Section title="8. Children's Privacy" colors={colors}>
          <Para colors={colors}>
            QR Guard is not directed at children under the age of 13. We do not knowingly collect personal information from children. If you believe a child has created an account, please contact us immediately and we will delete it promptly.
          </Para>
        </Section>

        <Section title="9. Security" colors={colors}>
          <Para colors={colors}>
            We take security seriously. All data transmitted between your device and our servers is encrypted using TLS. Firebase Auth uses industry-standard OAuth 2.0 and secure token management. We conduct periodic security reviews and follow responsible disclosure practices.
          </Para>
          <Para colors={colors}>
            That said, no system is 100% immune to risk. We encourage you to use a strong password and to sign out of shared devices.
          </Para>
        </Section>

        <Section title="10. Third-Party Links" colors={colors}>
          <Para colors={colors}>
            QR codes you scan may contain links to third-party websites or services. QR Guard has no control over those sites and is not responsible for their privacy practices. Always review the destination before clicking links found in QR codes — it is one of the core reasons QR Guard exists.
          </Para>
        </Section>

        <Section title="11. Changes to This Policy" colors={colors}>
          <Para colors={colors}>
            We may update this Privacy Policy from time to time. When we make significant changes, we will notify you through the app. The effective date at the top of this page always reflects the most recent version. Your continued use of QR Guard after changes are published constitutes acceptance of the updated policy.
          </Para>
        </Section>

        <Section title="12. Contact Us" colors={colors}>
          <Para colors={colors}>
            Questions, concerns, or requests about your privacy? We'd love to hear from you. You can reach our privacy team at:
          </Para>
          <View style={[styles.contactCard, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" }]}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
            <Text style={[styles.contactEmail, { color: colors.primary }]}>{CONTACT_EMAIL}</Text>
          </View>
          <Para colors={colors}>
            We aim to respond to all privacy-related enquiries within 5 business days.
          </Para>
        </Section>

        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            QR Guard — Scan smart. Stay safe. Stay private.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  navTitle: { fontSize: 18, fontFamily: "Inter_700Bold", flex: 1, textAlign: "center" },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },
  scrollContent: { padding: 20 },
  heroBanner: {
    alignItems: "center",
    borderRadius: 20, padding: 24, marginBottom: 24,
    borderWidth: 1,
  },
  heroIcon: {
    width: 68, height: 68, borderRadius: 34,
    alignItems: "center", justifyContent: "center",
    marginBottom: 14, borderWidth: 2,
  },
  heroTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 8, textAlign: "center" },
  heroSub: {
    fontSize: 14, fontFamily: "Inter_400Regular",
    textAlign: "center", lineHeight: 20, marginBottom: 12,
  },
  effectiveDate: { fontSize: 12, fontFamily: "Inter_500Medium" },
  section: {
    borderRadius: 16, padding: 18,
    marginBottom: 12, borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16, fontFamily: "Inter_700Bold",
    marginBottom: 10,
  },
  subhead: {
    fontSize: 13, fontFamily: "Inter_600SemiBold",
    marginTop: 12, marginBottom: 6,
  },
  para: {
    fontSize: 14, fontFamily: "Inter_400Regular",
    lineHeight: 22, marginBottom: 8,
  },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 6 },
  bulletDot: {
    width: 5, height: 5, borderRadius: 2.5,
    marginTop: 8, flexShrink: 0,
  },
  bulletText: {
    flex: 1, fontSize: 14, fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  contactCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 12, padding: 14,
    marginVertical: 10, borderWidth: 1,
  },
  contactEmail: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  footer: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, padding: 20, marginTop: 8,
  },
  footerText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
