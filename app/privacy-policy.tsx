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

const EFFECTIVE_DATE = "March 26, 2026";
const CONTACT_EMAIL = "privacy@qrguard.app";

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
        {/* Hero */}
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
            <Text style={[styles.heroTitle, { color: colors.text }]}>Your Privacy Matters</Text>
            <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
              We built QR Guard to protect you — that commitment extends to how we handle your personal information.
            </Text>
            <View style={[styles.dateBadge, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
              <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.dateBadgeText, { color: colors.textMuted }]}>Effective: {EFFECTIVE_DATE}</Text>
            </View>
          </View>
        </LinearGradient>

        <SectionCard title="Who We Are" num="1" icon="shield-outline" colors={colors}>
          <Para colors={colors}>
            QR Guard is a mobile application designed to help you scan, evaluate, and manage QR codes safely. We are committed to protecting your privacy and handling your data with transparency and respect.
          </Para>
        </SectionCard>

        <SectionCard title="What We Collect" num="2" icon="layers-outline" colors={colors}>
          <Para colors={colors}>We collect only what is necessary to provide a safe, functional experience:</Para>
          <SubHead text="Account Information" colors={colors} />
          <Bullet text="Email address and display name (when you create an account)" colors={colors} />
          <Bullet text="Profile photo (optional, uploaded by you)" colors={colors} />
          <Bullet text="Authentication tokens managed securely by Firebase Auth" colors={colors} />
          <SubHead text="Usage Data" colors={colors} />
          <Bullet text="QR codes you scan (content stored locally on your device by default)" colors={colors} />
          <Bullet text="Reports and comments you submit on QR codes" colors={colors} />
          <Bullet text="QR codes you generate or bookmark as favourites" colors={colors} />
          <SubHead text="Device & Technical Data" colors={colors} />
          <Bullet text="Device platform (iOS or Android) for compatibility purposes" colors={colors} />
          <Bullet text="Error logs to help diagnose and fix crashes" colors={colors} />
          <Para colors={colors}>We do not collect your physical location, contact list, or microphone audio.</Para>
        </SectionCard>

        <SectionCard title="How We Use Your Information" num="3" icon="settings-outline" colors={colors}>
          <Para colors={colors}>Your data is used exclusively to provide and improve QR Guard:</Para>
          <Bullet text="Authenticate your account and keep it secure" colors={colors} />
          <Bullet text="Sync your scan history, favourites, and QR codes across devices" colors={colors} />
          <Bullet text="Power community trust scores through aggregated, anonymised reports" colors={colors} />
          <Bullet text="Send in-app notifications when QR codes you follow receive new activity" colors={colors} />
          <Bullet text="Detect abuse, spam, and fraudulent QR codes" colors={colors} />
          <Para colors={colors}>We do not sell, rent, or share your personal information with third-party advertisers — ever.</Para>
        </SectionCard>

        <SectionCard title="Firebase & Data Storage" num="4" icon="server-outline" colors={colors}>
          <Para colors={colors}>
            QR Guard uses Google Firebase for backend infrastructure. Your data is stored in Firebase Firestore, Realtime Database, and Firebase Auth. Firebase is compliant with GDPR, SOC 2, and ISO 27001 standards.
          </Para>
          <Para colors={colors}>
            Scan history you choose not to sync stays exclusively on your device using encrypted local storage and never leaves your phone.
          </Para>
        </SectionCard>

        <SectionCard title="Data Retention" num="5" icon="time-outline" colors={colors}>
          <Para colors={colors}>
            We retain your data for as long as your account is active. If you delete your account, your personal data is permanently removed from our servers within 30 days. Anonymised aggregate data may be retained to preserve community trust scores.
          </Para>
        </SectionCard>

        <SectionCard title="Sharing & Disclosure" num="6" icon="share-outline" colors={colors}>
          <Para colors={colors}>We do not sell your data. We may share limited information only:</Para>
          <Bullet text="With Firebase/Google as our infrastructure provider" colors={colors} />
          <Bullet text="When required by law, court order, or to protect public safety" colors={colors} />
          <Bullet text="If QR Guard is acquired, under equivalent privacy protections" colors={colors} />
        </SectionCard>

        <SectionCard title="Your Rights" num="7" icon="person-outline" colors={colors}>
          <Para colors={colors}>You have meaningful control over your data at all times:</Para>
          <Bullet text="Access — view all data we hold about you through your profile" colors={colors} />
          <Bullet text="Correction — update your name and profile photo in app settings" colors={colors} />
          <Bullet text="Deletion — permanently delete your account from Account Management" colors={colors} />
          <Bullet text="Export — contact us to request a copy of your data" colors={colors} />
        </SectionCard>

        <SectionCard title="Profile Privacy Controls" num="8" icon="shield-half-outline" colors={colors}>
          <Para colors={colors}>
            You have full control over who can view your profile and activity on QR Guard:
          </Para>
          <SubHead text="Public Account (Default)" colors={colors} />
          <Bullet text="Your profile, QR codes, stats, and activity are visible to all QR Guard users worldwide" colors={colors} />
          <Bullet text="This is the default setting — no action is needed to keep your profile public" colors={colors} />
          <SubHead text="Private Account" colors={colors} />
          <Bullet text="Only friends you approve can see your full profile, QR codes, stats, and activity" colors={colors} />
          <Bullet text="Everyone else will only see your name, username, and profile photo" colors={colors} />
          <Bullet text="You can switch between public and private at any time in Privacy Settings" colors={colors} />
          <SubHead text="Friends System" colors={colors} />
          <Bullet text="Friends are added via mutual request — both parties must agree" colors={colors} />
          <Bullet text="You can remove a friend at any time from their profile page" colors={colors} />
          <Bullet text="Friends always have full access to your profile, even if your account is private" colors={colors} />
          <Para colors={colors}>
            These controls apply only to your QR Guard profile. They do not affect how QR code data (reports, trust scores) is shared with the community, which remains anonymised.
          </Para>
        </SectionCard>

        <SectionCard title="Security" num="9" icon="lock-closed-outline" colors={colors}>
          <Para colors={colors}>
            All data transmitted between your device and our servers is encrypted using TLS. Firebase Auth uses industry-standard OAuth 2.0 and secure token management. No system is 100% immune — we encourage strong passwords and signing out of shared devices.
          </Para>
        </SectionCard>

        <SectionCard title="Contact Us" num="10" icon="mail-outline" colors={colors}>
          <Para colors={colors}>Questions or requests about your privacy? Reach our privacy team at:</Para>
          <View style={[styles.contactCard, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" }]}>
            <View style={[styles.contactIconWrap, { backgroundColor: colors.primary + "22" }]}>
              <Ionicons name="mail-outline" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.contactEmail, { color: colors.primary }]}>{CONTACT_EMAIL}</Text>
          </View>
          <Para colors={colors}>We aim to respond to all privacy-related enquiries within 5 business days.</Para>
        </SectionCard>

        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>QR Guard — Scan smart. Stay safe. Stay private.</Text>
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

  sectionCard: { borderRadius: 22, borderWidth: 1, padding: 18 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionNum: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  sectionNumText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  sectionIcon: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", flex: 1 },
  subhead: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 10, marginBottom: 6 },
  para: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 8 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 7 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 8, flexShrink: 0 },
  bulletText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  contactCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, padding: 14, marginVertical: 10, borderWidth: 1,
  },
  contactIconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  contactEmail: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  footerText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
