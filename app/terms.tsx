import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import type { AppColors } from "@/constants/colors";

const EFFECTIVE_DATE = "March 26, 2026";
const CONTACT_EMAIL = "legal@qrguard.app";
const APP_NAME = "QR Guard";

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

export default function TermsScreen() {
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
        <Text style={[styles.navTitle, { color: colors.text }]}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Hero */}
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
              Please read carefully before using {APP_NAME}. By using the app, you agree to these terms.
            </Text>
            <View style={[styles.dateBadge, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
              <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.dateBadgeText, { color: colors.textMuted }]}>Effective: {EFFECTIVE_DATE}</Text>
            </View>
          </View>
        </LinearGradient>

        <SectionCard title="Acceptance of Terms" num="1" colors={colors}>
          <Para colors={colors}>
            By downloading, installing, or using {APP_NAME} ("the App"), you agree to be bound by these Terms. If you do not agree, you must not use the App. We reserve the right to modify these Terms at any time. Continued use after changes constitutes acceptance.
          </Para>
        </SectionCard>

        <SectionCard title="Description of Service" num="2" colors={colors}>
          <Para colors={colors}>{APP_NAME} provides:</Para>
          <Bullet text="QR code scanning via device camera" colors={colors} />
          <Bullet text="QR code content analysis and safety scoring based on community data" colors={colors} />
          <Bullet text="User-submitted safety reports and community commentary" colors={colors} />
          <Bullet text="Living Shield QR code generation with dynamic destinations" colors={colors} />
          <Bullet text="Community trust scores derived from aggregated user reports" colors={colors} />
        </SectionCard>

        <SectionCard title="Disclaimer of Warranties — Read Carefully" num="3" colors={colors}>
          <View style={[styles.warningBox, { backgroundColor: colors.warningDim, borderColor: colors.warning + "35" }]}>
            <Ionicons name="warning" size={16} color={colors.warning} />
            <Text style={[styles.warningText, { color: colors.warning }]}>
              THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.
            </Text>
          </View>
          <Para colors={colors}>We do not guarantee that:</Para>
          <Bullet text="Any QR code marked as 'Safe' is actually safe. Trust scores reflect community opinion, not verified fact." colors={colors} />
          <Bullet text="Any QR code marked as 'Dangerous' is actually fraudulent. Reports may be incorrect." colors={colors} />
          <Bullet text="The App will detect all malicious QR codes, phishing URLs, or fraudulent payment requests." colors={colors} />
          <Bullet text="The App will be free from errors, bugs, interruptions, or security vulnerabilities." colors={colors} />
          <Para colors={colors}>QR GUARD IS AN INFORMATIONAL TOOL ONLY. ALL SCANNING DECISIONS ARE MADE SOLELY BY YOU.</Para>
        </SectionCard>

        <SectionCard title="Limitation of Liability" num="4" colors={colors}>
          <Para colors={colors}>To the maximum extent permitted by law, we are not liable for:</Para>
          <Bullet text="Financial loss from following a QR code to a fraudulent payment or phishing site" colors={colors} />
          <Bullet text="Data breach, identity theft, or device compromise from scanning a QR code" colors={colors} />
          <Bullet text="Loss of business, profits, revenue, data, or goodwill" colors={colors} />
          <Bullet text="Reliance on any trust score, safety rating, or community report" colors={colors} />
          <Para colors={colors}>
            Our total liability shall not exceed the amount you paid in the preceding 12 months, or USD $10.00, whichever is less.
          </Para>
        </SectionCard>

        <SectionCard title="No Professional Advice" num="5" colors={colors}>
          <Para colors={colors}>
            Nothing in this App constitutes financial, legal, cybersecurity, or professional advice. Trust scores are community-driven opinions and must not be treated as expert assessments. Always exercise independent judgment before making any financial transaction.
          </Para>
        </SectionCard>

        <SectionCard title="User Responsibilities" num="6" colors={colors}>
          <Para colors={colors}>You are solely responsible for:</Para>
          <Bullet text="All decisions made after scanning a QR code, regardless of what the App displays" colors={colors} />
          <Bullet text="Verifying the legitimacy of any website, payment request, or content reached via a QR code" colors={colors} />
          <Bullet text="The accuracy and legality of any reports, comments, or content you submit" colors={colors} />
          <Bullet text="Keeping your account credentials secure" colors={colors} />
        </SectionCard>

        <SectionCard title="Community Content & Reports" num="7" colors={colors}>
          <Para colors={colors}>By submitting reports or comments, you represent that they are truthful and based on genuine experience. We reserve the right to remove any content that violates these Terms.</Para>
        </SectionCard>

        <SectionCard title="Prohibited Uses" num="8" colors={colors}>
          <Para colors={colors}>You must not use the App to:</Para>
          <Bullet text="Submit false, malicious, or defamatory reports" colors={colors} />
          <Bullet text="Attempt to manipulate trust scores through coordinated fake reporting" colors={colors} />
          <Bullet text="Reverse-engineer or exploit the App or its infrastructure" colors={colors} />
          <Bullet text="Generate QR codes intended to defraud, phish, or harm recipients" colors={colors} />
        </SectionCard>

        <SectionCard title="Profile Visibility & Friends" num="9" colors={colors}>
          <Para colors={colors}>
            By default, your profile is public and visible to all users worldwide. You may switch your account to private at any time in Privacy Settings. When set to private:
          </Para>
          <Bullet text="Only approved friends can view your full profile, QR codes, stats, and activity" colors={colors} />
          <Bullet text="All other users will only see your name, username, and profile photo" colors={colors} />
          <Bullet text="Friends always see your full profile regardless of privacy setting" colors={colors} />
          <Para colors={colors}>
            You may remove a friend at any time using the Unfriend button on their profile. Removing a friend revokes their access to private profile content immediately. You are responsible for managing your own friend list and privacy settings.
          </Para>
        </SectionCard>

        <SectionCard title="Living Shield QR Codes" num="10" colors={colors}>
          <Para colors={colors}>
            Owners are solely responsible for all content their QR codes redirect to, including after destination changes. Misuse to redirect victims to malicious destinations violates these Terms and may be reported to law enforcement.
          </Para>
        </SectionCard>

        <SectionCard title="Contact" num="11" colors={colors}>
          <Para colors={colors}>For legal matters or to report a violation, contact us at:</Para>
          <View style={[styles.contactCard, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" }]}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
            <Text style={[styles.contactEmail, { color: colors.primary }]}>{CONTACT_EMAIL}</Text>
          </View>
          <Para colors={colors}>We aim to respond to all legal enquiries within 5 business days.</Para>
        </SectionCard>

        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>{APP_NAME} — Scan smart. Stay safe.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navTitle: { fontSize: 18, fontFamily: "Inter_700Bold", flex: 1, textAlign: "center" },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  scrollContent: { padding: 18, gap: 12 },

  heroBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 16,
    borderRadius: 24, padding: 22, borderWidth: 1,
  },
  heroIconWrap: {
    width: 58, height: 58, borderRadius: 20,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  heroTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 6 },
  heroSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 10 },
  dateBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1,
    alignSelf: "flex-start",
  },
  dateBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  sectionCard: {
    borderRadius: 22, borderWidth: 1, padding: 18,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  sectionNum: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  sectionNumText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", flex: 1 },
  warningBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 10,
  },
  warningText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1, lineHeight: 18 },
  para: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 8 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 7 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 8, flexShrink: 0 },
  bulletText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  contactCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, padding: 14, marginVertical: 10, borderWidth: 1,
  },
  contactEmail: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  footerText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
