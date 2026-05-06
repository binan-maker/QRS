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

function StepCard({ number, icon, title, desc, tips, totalSteps = 6 }: { number: number; icon: string; title: string; desc: string; tips?: string[]; totalSteps?: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stepCard}>
      <View style={styles.stepLeft}>
        <View style={[styles.stepNumber, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "60" }]}>
          <Text style={[styles.stepNumberText, { color: colors.primary }]}>{number}</Text>
        </View>
        {number < totalSteps && <View style={[styles.stepLine, { backgroundColor: colors.surfaceBorder }]} />}
      </View>
      <View style={styles.stepRight}>
        <View style={styles.stepIconRow}>
          <View style={[styles.stepIconWrap, { backgroundColor: colors.primaryDim }]}>
            <Ionicons name={icon as any} size={20} color={colors.primary} />
          </View>
          <Text style={[styles.stepTitle, { color: colors.text }]}>{title}</Text>
        </View>
        <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{desc}</Text>
        {tips && tips.length > 0 && (
          <View style={[styles.tipsBox, { backgroundColor: colors.background, borderColor: colors.surfaceBorder }]}>
            {tips.map((t, i) => (
              <View key={i} style={styles.tipRow}>
                <Ionicons name="bulb-outline" size={12} color={colors.warning} />
                <Text style={[styles.tipText, { color: colors.textMuted }]}>{t}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.featureCard, { backgroundColor: colors.background, borderColor: colors.surfaceBorder }]}>
      <View style={[styles.featureIcon, { backgroundColor: colors.primaryDim }]}>
        <Ionicons name={icon as any} size={22} color={colors.primary} />
      </View>
      <Text style={[styles.featureTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.featureDesc, { color: colors.textMuted }]}>{desc}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return <Text style={[styles.para, { color: colors.textSecondary }]}>{children}</Text>;
}

function WarnBox({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.warnBox, { backgroundColor: colors.warningDim, borderColor: colors.warning + "35" }]}>
      <Ionicons name="warning" size={14} color={colors.warning} />
      <Text style={[styles.warnText, { color: colors.warning }]}>{text}</Text>
    </View>
  );
}

export default function HowItWorksScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.surfaceBorder }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>How It Works</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
        <View style={[styles.heroBanner, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}>
            <Ionicons name="scan" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>QR Guard in a Nutshell</Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
            A community-powered safety layer for the QR codes you encounter every day — on menus, flyers, packages, adverts, and everywhere in between.
          </Text>
          <View style={[styles.warnBox, { backgroundColor: colors.warningDim, borderColor: colors.warning + "35", marginTop: 6 }]}>
            <Ionicons name="warning" size={13} color={colors.warning} />
            <Text style={[styles.warnText, { color: colors.warning }]}>Beta software — results are advisory only. Always exercise independent judgment.</Text>
          </View>
        </View>

        <Section title="Important: What QR Guard Can and Cannot Do">
          <WarnBox text="QR Guard is an informational tool only. It CANNOT guarantee that a QR code is safe or dangerous. Trust scores reflect community opinion, not expert verification." />
          <Para>QR Guard can help you:</Para>
          {[
            "See what a QR code contains before you act on it",
            "Check if the community has previously flagged a QR code as suspicious",
            "Read real user reports and comments about a QR code",
            "Report a QR code to warn others in the community",
            "Generate your own branded, identifiable QR codes",
          ].map((t, i) => (
            <View key={i} style={styles.ruleRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.safe} />
              <Text style={[styles.ruleText, { color: colors.textSecondary }]}>{t}</Text>
            </View>
          ))}
          <Para>QR Guard cannot:</Para>
          {[
            "Guarantee that any QR code is 100% safe or dangerous",
            "Prevent you from visiting a malicious website if you choose to",
            "Recover money or data lost from fraudulent QR code transactions",
            "Replace manual verification, security software, or professional cybersecurity advice",
            "Prevent false positives — legitimate codes from banks, government, or businesses may be flagged",
          ].map((t, i) => (
            <View key={i} style={styles.ruleRow}>
              <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
              <Text style={[styles.ruleText, { color: colors.textSecondary }]}>{t}</Text>
            </View>
          ))}
        </Section>

        <Section title="Scanning a QR Code — Step by Step">
          <StepCard number={1} totalSteps={6} icon="camera-outline" title="Open the Scanner" desc="Tap the Scanner tab (centre of the bottom bar) to open the live camera scanner. Point your camera at any QR code and it will be detected automatically — no button press needed." tips={["Ensure good lighting for the fastest detection.", "Hold your phone steady about 15–30 cm from the code."]} />
          <StepCard number={2} totalSteps={6} icon="image-outline" title="Or Choose from Gallery" desc="Already have a screenshot of a QR code? Tap the gallery icon in the scanner to pick an image from your camera roll. QR Guard will extract and decode the QR code from the photo." />
          <StepCard number={3} totalSteps={6} icon="document-text-outline" title="View the QR Content" desc="After scanning, QR Guard instantly shows you what the QR code contains — a URL, plain text, payment details, contact information, and more — before you click or act on anything." tips={["Always read the destination URL carefully before opening it.", "Watch for lookalike domains (e.g. 'paypa1.com' vs 'paypal.com').", "When in doubt, do not proceed."]} />
          <StepCard number={4} totalSteps={6} icon="shield-checkmark-outline" title="Check the Trust Score" desc="See the community trust score at a glance. Green Safe suggests legitimacy. Yellow Caution means mixed signals. Red Dangerous means many users flagged it. NONE of these verdicts are guarantees." tips={["A Safe verdict does not mean the code is definitely safe.", "A Dangerous verdict may be a false positive — verify independently if important."]} />
          <StepCard number={5} totalSteps={6} icon="chatbubbles-outline" title="Read Community Comments" desc="Scroll down to read what other users have said about this QR code. Real experiences from real people — someone may have already encountered the same code and flagged a problem. Comments are user-submitted and are not verified." />
          <StepCard number={6} totalSteps={6} icon="flag-outline" title="Report What You Find" desc="Encountered this QR code in the real world? Report it as Safe, Scam, Fake, or Spam to help protect others. Sign in to report — this ensures accountability and prevents abuse." tips={["Your reports directly update the trust score.", "Even a 'Safe' report helps build confidence in legitimate codes.", "Only report based on your genuine personal experience."]} />
        </Section>

        <Section title="How Your Data Is Used When You Scan">
          <WarnBox text="Every QR code scan through QR Guard contributes to our community database. Understand what happens to your data." />
          <Para>When you scan any QR code through QR Guard, the following happens automatically:</Para>
          {[
            "The QR code content is decoded on your device and analysed against our threat database.",
            "An anonymised record of the scan (QR content type, URL structure, timestamp) is logged to our community threat intelligence database.",
            "Scan frequency data across all users is aggregated to calculate real-time scan velocity signals.",
            "Anonymised scan patterns are used to train and improve our AI threat detection models.",
            "If you are signed in, the scan is saved to your personal scan history (visible only to you).",
            "If the QR code already has community reports, those reports are fetched and displayed to you.",
          ].map((t, i) => (
            <View key={i} style={styles.ruleRow}>
              <View style={[styles.ruleNum, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}>
                <Text style={[styles.ruleNumText, { color: colors.primary }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.ruleText, { color: colors.textSecondary }]}>{t}</Text>
            </View>
          ))}
          <Para>This data contribution is a core part of how QR Guard works. By scanning, you consent to your anonymised scan data being used for community safety and AI improvement. Full details are in our Privacy Policy.</Para>
        </Section>

        <Section title="Understanding QR Code Types">
          <Para>QR Guard automatically detects and labels the type of content inside every QR code:</Para>
          <View style={styles.typeGrid}>
            {[
              { icon: "link-outline", label: "URL / Website", color: colors.primary },
              { icon: "card-outline", label: "Payment", color: colors.warning },
              { icon: "person-outline", label: "Contact (vCard)", color: colors.safe },
              { icon: "mail-outline", label: "Email", color: "#A78BFA" },
              { icon: "call-outline", label: "Phone Number", color: "#34D399" },
              { icon: "wifi-outline", label: "Wi-Fi Credentials", color: "#60A5FA" },
              { icon: "location-outline", label: "Map Location", color: "#F87171" },
              { icon: "document-text-outline", label: "Plain Text", color: colors.textMuted },
            ].map((t) => (
              <View key={t.label} style={[styles.typeChip, { borderColor: t.color + "30", backgroundColor: t.color + "10" }]}>
                <Ionicons name={t.icon as any} size={16} color={t.color} />
                <Text style={[styles.typeChipText, { color: t.color }]}>{t.label}</Text>
              </View>
            ))}
          </View>
          <WarnBox text="Payment QR codes (UPI, BharatQR) carry extra risk. ALWAYS verify the merchant name and VPA directly in your banking app before confirming any payment. QR Guard cannot protect you from payment fraud after you approve a transaction." />
        </Section>

        <Section title="Account Features">
          <Para>You can use the scanner without an account — but signing in unlocks the full power of QR Guard:</Para>
          <View style={styles.featureGrid}>
            <FeatureCard icon="cloud-outline" title="Sync History" desc="Your scan history is saved and available on any device." />
            <FeatureCard icon="flag-outline" title="Report QR Codes" desc="Help protect the community by submitting trusted reports." />
            <FeatureCard icon="chatbubble-outline" title="Comment" desc="Share your experience and warn others about suspicious codes." />
            <FeatureCard icon="star-outline" title="Favourites" desc="Save QR codes you want to revisit or monitor over time." />
            <FeatureCard icon="notifications-outline" title="Follow QR Codes" desc="Get notified when a code you follow receives new activity." />
            <FeatureCard icon="qr-code-outline" title="Generate QR Codes" desc="Create branded QR codes with trust built in from the start." />
          </View>
          <Para>By creating an account, you agree that your account data, usage patterns, and community contributions may be used for AI model improvement and advertising purposes as described in our Privacy Policy and Terms of Service.</Para>
        </Section>

        <Section title="Generating Your Own QR Codes">
          <Para>QR Guard lets you create QR codes that carry your identity — giving scanners confidence in your code before they even open the link.</Para>
          <View style={[styles.genCard, { backgroundColor: colors.background, borderColor: colors.surfaceBorder }]}>
            <View style={styles.genRow}>
              <View style={[styles.genIcon, { backgroundColor: colors.primaryDim }]}>
                <Ionicons name="person-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.genLabel, { color: colors.primary }]}>Individual QR Code</Text>
                <Text style={[styles.genDesc, { color: colors.textSecondary }]}>A branded code tied to your personal QR Guard profile. Perfect for sharing your portfolio, social links, or contact details.</Text>
              </View>
            </View>
            <View style={[styles.genRow, { borderTopWidth: 1, borderTopColor: colors.surfaceBorder, paddingTop: 14, marginTop: 4 }]}>
              <View style={[styles.genIcon, { backgroundColor: "#FBBF2415" }]}>
                <Ionicons name="storefront-outline" size={18} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.genLabel, { color: colors.warning }]}>Business QR Code</Text>
                <Text style={[styles.genDesc, { color: colors.textSecondary }]}>Upload your business logo, enter your business name, and generate a verified business QR code. Includes live scan counter, comments, and destination update capability.</Text>
              </View>
            </View>
          </View>
          <WarnBox text="You are solely responsible for all content your QR codes direct to, including any destinations you set after creation. Misuse to redirect users to fraudulent or harmful content violates our Terms and may result in account termination and law enforcement referral." />
        </Section>

        <Section title="Protecting Yourself — Critical Rules">
          <Para>Even with QR Guard, good security habits are essential. Follow these rules every time:</Para>
          {[
            "Never scan QR codes placed over existing legitimate codes — fraudsters do this to hijack payments.",
            "Check the URL bar of any website before entering a password, OTP, or card number.",
            "If a QR code urgently demands action (pay now, claim prize, verify account), slow down — urgency is a manipulation tactic.",
            "Treat unrated QR codes like a message from an unknown number — approach with maximum caution.",
            "When in doubt, type the URL manually into your browser instead of following the QR code link.",
            "For any payment QR code, verify the merchant name and UPI VPA in your banking app before approving.",
            "QR Guard verdicts are advisory — for high-stakes transactions, always verify independently.",
          ].map((rule, i) => (
            <View key={i} style={styles.ruleRow}>
              <View style={[styles.ruleNum, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}>
                <Text style={[styles.ruleNumText, { color: colors.primary }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.ruleText, { color: colors.textSecondary }]}>{rule}</Text>
            </View>
          ))}
        </Section>

        <Section title="Notices for Government, Public Sector & Institutional Users">
          <WarnBox text="READ CAREFULLY IF YOU ARE A GOVERNMENT EMPLOYEE, PUBLIC OFFICIAL, OR USING QR GUARD IN AN OFFICIAL CAPACITY." />
          <Para>
            QR Guard is a beta-stage consumer application. It is NOT certified for, designed for, or approved for use as part of any official government, law enforcement, military, intelligence, banking, healthcare, or critical infrastructure operation.
          </Para>
          <Para>
            By using QR Guard in any official capacity, you acknowledge and agree:
          </Para>
          {[
            "QR Guard's safety verdicts are community-sourced opinions and are NOT authoritative determinations suitable for use in official decision-making, investigations, enforcement actions, or procurement processes.",
            "QR Guard accepts no liability for any government action, official decision, enforcement outcome, regulatory penalty, or institutional harm resulting from reliance on any QR Guard output.",
            "You are solely responsible for validating any QR code through official, certified channels before using such information for official purposes.",
            "QR Guard makes no representations about compliance with government data handling, classified information, security clearance, or official procurement requirements.",
            "Government data processed through QR Guard is subject to the same data handling practices as all other user data, including potential use for AI training and threat intelligence, as described in the Privacy Policy.",
          ].map((t, i) => (
            <View key={i} style={styles.ruleRow}>
              <View style={[styles.ruleNum, { backgroundColor: colors.dangerDim, borderColor: colors.danger + "40" }]}>
                <Text style={[styles.ruleNumText, { color: colors.danger }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.ruleText, { color: colors.textSecondary }]}>{t}</Text>
            </View>
          ))}
        </Section>

        <View style={[styles.ctaBanner, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" }]}>
          <Ionicons name="people-outline" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.ctaTitle, { color: colors.primary }]}>You Are the Safety Net</Text>
            <Text style={[styles.ctaSub, { color: colors.textSecondary }]}>
              Every scan, report, and comment you make helps protect the next person who encounters the same QR code — and improves our AI models for everyone. QR Guard gets smarter and safer with every user.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>QR Guard — Scan smart. Stay safe. Beta v2.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  navTitle: { fontSize: 16, fontFamily: "Inter_700Bold", flex: 1, textAlign: "center" },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  scrollContent: { padding: 16 },
  heroBanner: { alignItems: "center", borderRadius: 18, padding: 18, marginBottom: 12, borderWidth: 1 },
  heroIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 12, borderWidth: 2 },
  heroTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 6, textAlign: "center" },
  heroSub: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  section: { borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1 },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 12 },
  para: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 8 },
  warnBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 8,
  },
  warnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1, lineHeight: 17 },
  stepCard: { flexDirection: "row", gap: 12, marginBottom: 0 },
  stepLeft: { alignItems: "center", width: 26 },
  stepNumber: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  stepNumberText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  stepLine: { width: 2, flex: 1, marginVertical: 5 },
  stepRight: { flex: 1, paddingBottom: 16 },
  stepIconRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 5 },
  stepIconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  stepTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  stepDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  tipsBox: { marginTop: 8, borderRadius: 9, padding: 9, gap: 5, borderWidth: 1 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  tipText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 4 },
  typeChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9, borderWidth: 1 },
  typeChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  featureGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  featureCard: { width: "47%", borderRadius: 13, padding: 12, gap: 7, borderWidth: 1 },
  featureIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  featureTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  featureDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  genCard: { borderRadius: 13, padding: 12, borderWidth: 1, marginBottom: 8 },
  genRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  genIcon: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  genLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  genDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  ruleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 9 },
  ruleNum: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0, borderWidth: 1 },
  ruleNumText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  ruleText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  ctaBanner: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1 },
  ctaTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 3 },
  ctaSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, padding: 16, marginTop: 4 },
  footerText: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
