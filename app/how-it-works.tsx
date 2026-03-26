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

function StepCard({ number, icon, title, desc, tips }: { number: number; icon: string; title: string; desc: string; tips?: string[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stepCard}>
      <View style={styles.stepLeft}>
        <View style={[styles.stepNumber, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "60" }]}>
          <Text style={[styles.stepNumberText, { color: colors.primary }]}>{number}</Text>
        </View>
        {number < 6 && <View style={[styles.stepLine, { backgroundColor: colors.surfaceBorder }]} />}
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
        </View>

        <Section title="Scanning a QR Code — Step by Step">
          <StepCard number={1} icon="camera-outline" title="Open the Scanner" desc="Tap the Scanner tab (centre of the bottom bar) to open the live camera scanner. Point your camera at any QR code and it will be detected automatically — no button press needed." tips={["Ensure good lighting for the fastest detection.", "Hold your phone steady about 15–30 cm from the code."]} />
          <StepCard number={2} icon="image-outline" title="Or Choose from Gallery" desc="Already have a screenshot of a QR code? Tap the gallery icon in the scanner to pick an image from your camera roll. QR Guard will extract and decode the QR code from the photo." />
          <StepCard number={3} icon="document-text-outline" title="View the QR Content" desc="After scanning, QR Guard instantly shows you what the QR code contains — a URL, plain text, payment details, contact information, and more — before you click or act on anything." tips={["Always read the destination URL carefully before opening it.", "Watch for lookalike domains (e.g. 'paypa1.com' vs 'paypal.com')."]} />
          <StepCard number={4} icon="shield-checkmark-outline" title="Check the Trust Score" desc="See the community trust score at a glance. A green Safe badge means the community considers this QR code legitimate. Yellow Caution means mixed signals. Red Dangerous means stay away." />
          <StepCard number={5} icon="chatbubbles-outline" title="Read Community Comments" desc="Scroll down to read what other users have said about this QR code. Real experiences from real people — someone may have already encountered the same code and flagged a problem." />
          <StepCard number={6} icon="flag-outline" title="Report What You Find" desc="Encountered this QR code in the real world? Report it as Safe, Scam, Fake, or Spam to help protect others. Sign in to report — this ensures accountability and prevents abuse." tips={["Your reports directly update the trust score in real time.", "Even a 'Safe' report helps build confidence in legitimate codes."]} />
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
        </Section>

        <Section title="Account Features">
          <Para>You can use the scanner without an account — but signing in unlocks the full power of QR Guard:</Para>
          <View style={styles.featureGrid}>
            <FeatureCard icon="cloud-outline" title="Sync History" desc="Your scan history is saved to your account and available on any device." />
            <FeatureCard icon="flag-outline" title="Report QR Codes" desc="Help protect the community by submitting trusted reports." />
            <FeatureCard icon="chatbubble-outline" title="Comment" desc="Share your experience and warn others about suspicious codes." />
            <FeatureCard icon="star-outline" title="Favourites" desc="Save QR codes you want to revisit or monitor over time." />
            <FeatureCard icon="notifications-outline" title="Follow QR Codes" desc="Get notified when a code you follow receives new reports or comments." />
            <FeatureCard icon="qr-code-outline" title="Generate QR Codes" desc="Create branded individual or business QR codes with trust built in." />
          </View>
        </Section>

        <Section title="Generating Your Own QR Codes">
          <Para>QR Guard lets you create QR codes that carry your identity — giving scanners immediate confidence in your code before they even open the link.</Para>
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
                <Text style={[styles.genDesc, { color: colors.textSecondary }]}>Upload your business logo, enter your business name, and generate a verified business QR code that displays your branding on the detail page.</Text>
              </View>
            </View>
          </View>
          <Para>Every generated QR code has a unique ID, a live scan counter, a comments section, and can be deactivated or updated at any time from your My QR Codes page.</Para>
        </Section>

        <Section title="Protecting Yourself — Quick Rules">
          <Para>Even with QR Guard, good habits matter. Follow these simple rules every time:</Para>
          {[
            "Never scan QR codes placed over existing legitimate codes — fraudsters do this to hijack payments.",
            "Check the URL bar of any website before entering a password or card number.",
            "If a QR code urgently demands action (pay now, claim prize), slow down — that urgency is a manipulation tactic.",
            "Treat unrated QR codes like you would a message from an unknown number.",
            "When in doubt, type the URL manually instead of following the QR code link.",
          ].map((rule, i) => (
            <View key={i} style={styles.ruleRow}>
              <View style={[styles.ruleNum, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}>
                <Text style={[styles.ruleNumText, { color: colors.primary }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.ruleText, { color: colors.textSecondary }]}>{rule}</Text>
            </View>
          ))}
        </Section>

        <View style={[styles.ctaBanner, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" }]}>
          <Ionicons name="people-outline" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.ctaTitle, { color: colors.primary }]}>You Are the Safety Net</Text>
            <Text style={[styles.ctaSub, { color: colors.textSecondary }]}>
              Every scan, report, and comment you make helps protect the next person who encounters the same QR code. QR Guard gets smarter — and safer — with every user.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>QR Guard — Scan smart. Stay safe.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  navTitle: { fontSize: 18, fontFamily: "Inter_700Bold", flex: 1, textAlign: "center" },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  scrollContent: { padding: 20 },
  heroBanner: { alignItems: "center", borderRadius: 20, padding: 24, marginBottom: 16, borderWidth: 1 },
  heroIcon: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", marginBottom: 14, borderWidth: 2 },
  heroTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 8, textAlign: "center" },
  heroSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  section: { borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 14 },
  para: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 10 },
  stepCard: { flexDirection: "row", gap: 14, marginBottom: 0 },
  stepLeft: { alignItems: "center", width: 28 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  stepNumberText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  stepLine: { width: 2, flex: 1, marginVertical: 6 },
  stepRight: { flex: 1, paddingBottom: 20 },
  stepIconRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  stepIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  stepTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  stepDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  tipsBox: { marginTop: 10, borderRadius: 10, padding: 10, gap: 6, borderWidth: 1 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  tipText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  typeChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  typeChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  featureGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  featureCard: { width: "47%", borderRadius: 14, padding: 14, gap: 8, borderWidth: 1 },
  featureIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  featureTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  featureDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  genCard: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 10 },
  genRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  genIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  genLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  genDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  ruleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  ruleNum: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0, borderWidth: 1 },
  ruleNumText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  ruleText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  ctaBanner: { flexDirection: "row", alignItems: "flex-start", gap: 14, borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1 },
  ctaTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 4 },
  ctaSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 20, marginTop: 4 },
  footerText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
