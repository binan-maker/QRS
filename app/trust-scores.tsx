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

function ScoreBand({
  color,
  bg,
  border,
  label,
  range,
  description,
  icon,
}: {
  color: string;
  bg: string;
  border: string;
  label: string;
  range: string;
  description: string;
  icon: string;
}) {
  return (
    <View style={[styles.scoreBand, { backgroundColor: bg, borderColor: border }]}>
      <View style={[styles.scoreBandIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <Text style={[styles.scoreBandLabel, { color }]}>{label}</Text>
          <View style={[styles.rangeTag, { backgroundColor: color + "20" }]}>
            <Text style={[styles.rangeTagText, { color }]}>{range}</Text>
          </View>
        </View>
        <Text style={styles.scoreBandDesc}>{description}</Text>
      </View>
    </View>
  );
}

function FactorCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <View style={styles.factorCard}>
      <View style={styles.factorIcon}>
        <Ionicons name={icon as any} size={20} color={Colors.dark.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.factorTitle}>{title}</Text>
        <Text style={styles.factorDesc}>{desc}</Text>
      </View>
    </View>
  );
}

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

export default function TrustScoresScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.navTitle}>Trust Scores</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        <View style={styles.heroBanner}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={32} color={Colors.dark.primary} />
          </View>
          <Text style={styles.heroTitle}>The Power of Community Safety</Text>
          <Text style={styles.heroSub}>
            Trust scores harness the collective wisdom of real users to tell you whether a QR code is safe before you interact with it.
          </Text>
        </View>

        <Section title="What Is a Trust Score?">
          <Para>
            Every QR code scanned through QR Guard can receive a Trust Score — a number from 0 to 100 that reflects how the community rates it. Think of it as a real-time safety reputation, built by people like you who have already encountered that QR code in the real world.
          </Para>
          <Para>
            Rather than relying on a single automated system, trust scores combine community reports, scan patterns, and owner verification into a single, easy-to-read signal. The more people interact with a QR code, the more accurate its score becomes.
          </Para>
        </Section>

        <Section title="Score Bands at a Glance">
          <ScoreBand
            color={Colors.dark.safe}
            bg={Colors.dark.safeDim}
            border={Colors.dark.safe + "40"}
            label="Safe"
            range="70 – 100"
            description="The community strongly considers this QR code trustworthy. It has received predominantly positive reports or comes from a verified owner."
            icon="shield-checkmark"
          />
          <ScoreBand
            color={Colors.dark.warning}
            bg={Colors.dark.warningDim || "#7C3A0015"}
            border={Colors.dark.warning + "40"}
            label="Caution"
            range="35 – 69"
            description="Mixed signals. Some users reported concerns. Proceed carefully, read the comments, and avoid sharing sensitive information."
            icon="warning"
          />
          <ScoreBand
            color={Colors.dark.danger}
            bg={Colors.dark.dangerDim}
            border={Colors.dark.danger + "40"}
            label="Dangerous"
            range="0 – 34"
            description="Multiple users have flagged this QR code as harmful, fraudulent, or malicious. Do not click any links. Report it if you encounter it in public."
            icon="skull"
          />
        </Section>

        <Section title="How the Score Is Calculated">
          <Para>
            Trust scores are computed from several weighted inputs that update in real time as new reports arrive:
          </Para>
          <FactorCard
            icon="people-outline"
            title="Community Reports"
            desc="When users report a QR code as Safe, Scam, Fake, or Spam, each report is weighted by the reporter's account standing. Reports from established accounts with clean histories carry more weight than brand-new accounts."
          />
          <FactorCard
            icon="repeat-outline"
            title="Scan Velocity"
            desc="A sudden spike in scans — especially combined with a surge of negative reports — is a strong fraud signal. QR Guard monitors scan velocity to detect coordinated phishing attacks early."
          />
          <FactorCard
            icon="business-outline"
            title="Owner Verification"
            desc="QR codes created by verified business or individual accounts receive a baseline trust boost. Verified owners have accepted our terms and are accountable for what their codes do."
          />
          <FactorCard
            icon="chatbubbles-outline"
            title="Comment Sentiment"
            desc="The community conversation matters. QR codes that attract detailed, concerned comments from multiple users are scored more conservatively until the situation becomes clearer."
          />
          <FactorCard
            icon="time-outline"
            title="Age & History"
            desc="Newly created QR codes start as unrated. Codes with long, clean histories are given greater trust. A sudden change in behaviour after a clean record can trigger a score review."
          />
        </Section>

        <Section title="Report Types Explained">
          <Para>When you report a QR code, you choose from four categories. Each affects the trust score differently:</Para>
          <Bullet text="Safe — Positive signal. You scanned it, checked the destination, and it was legitimate." />
          <Bullet text="Scam — Strong negative signal. The QR code leads to fraudulent activity designed to steal money or data." />
          <Bullet text="Fake — Negative signal. The QR code impersonates a legitimate brand, business, or service." />
          <Bullet text="Spam — Mild negative signal. Unwanted, unsolicited promotional content with no genuine value." />
          <Para>
            Consistently accurate reporters are rewarded with higher reporting credibility over time. Gaming the system with false reports is detected and penalised.
          </Para>
        </Section>

        <Section title="Unrated QR Codes">
          <Para>
            When a QR code has never been scanned through QR Guard before, it is labelled Unrated. This is not the same as Safe — it simply means the community has not yet assessed it.
          </Para>
          <Para>
            Treat unrated codes with caution: check the URL before visiting, look for misspellings in domain names, and never enter credentials on a site you reached through an unrated QR code.
          </Para>
        </Section>

        <Section title="Verified & Branded QR Codes">
          <Para>
            Businesses and individuals can create branded QR codes through QR Guard's generator. These codes display a verified owner panel with the creator's name, logo, and a unique identifier — making them far harder to counterfeit.
          </Para>
          <Para>
            If you see a branded QR code claiming to be from a company you know, the verification badge means the code was genuinely created through QR Guard by an accountable owner. Counterfeit QR codes cannot replicate this badge.
          </Para>
        </Section>

        <Section title="Why Trust Scores Work">
          <Para>
            The psychology behind trust scores is rooted in the principle of collective intelligence — the same reason online reviews, Wikipedia, and open-source software thrive. No single automated system is as nuanced as the combined judgment of thousands of real people who have physically encountered a QR code.
          </Para>
          <Para>
            Fraudsters can trick a single scanner. They cannot trick a community. Every report you submit makes QR Guard smarter and safer for everyone — including people who will scan the same code weeks after you do.
          </Para>
        </Section>

        <View style={styles.ctaBanner}>
          <Ionicons name="megaphone-outline" size={22} color={Colors.dark.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.ctaTitle}>Your Reports Matter</Text>
            <Text style={styles.ctaSub}>
              Every report you submit helps protect the next person who scans that code. Even a single "Safe" report helps build confidence in legitimate QR codes.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={18} color={Colors.dark.primary} />
          <Text style={styles.footerText}>QR Guard — Safety powered by community</Text>
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
    borderRadius: 20, padding: 24, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  heroIcon: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: Colors.dark.primaryDim, alignItems: "center", justifyContent: "center",
    marginBottom: 14, borderWidth: 2, borderColor: Colors.dark.primary + "40",
  },
  heroTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.dark.text, marginBottom: 8, textAlign: "center" },
  heroSub: {
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary,
    textAlign: "center", lineHeight: 21,
  },
  section: {
    backgroundColor: Colors.dark.surface, borderRadius: 16, padding: 18,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  sectionTitle: {
    fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.dark.text,
    marginBottom: 12,
  },
  para: {
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary,
    lineHeight: 22, marginBottom: 10,
  },
  scoreBand: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1,
  },
  scoreBandIcon: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  scoreBandLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  rangeTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  rangeTagText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  scoreBandDesc: {
    fontSize: 13, fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary, lineHeight: 19,
  },
  factorCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    marginBottom: 14, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder,
  },
  factorIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.dark.primaryDim, alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  factorTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.text, marginBottom: 3 },
  factorDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, lineHeight: 19 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  bulletDot: {
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: Colors.dark.primary, marginTop: 8, flexShrink: 0,
  },
  bulletText: {
    flex: 1, fontSize: 14, fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary, lineHeight: 21,
  },
  ctaBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 14,
    backgroundColor: Colors.dark.primaryDim, borderRadius: 16, padding: 18, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.dark.primary + "30",
  },
  ctaTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.dark.primary, marginBottom: 4 },
  ctaSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, lineHeight: 19 },
  footer: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, padding: 20, marginTop: 4,
  },
  footerText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted },
});
