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

function ScoreBand({
  color, bgStart, bgEnd, label, range, description, icon,
}: { color: string; bgStart: string; bgEnd: string; label: string; range: string; description: string; icon: string }) {
  const { colors } = useTheme();
  return (
    <LinearGradient
      colors={[bgStart, bgEnd]}
      style={[styles.scoreBand, { borderColor: color + "35" }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <View style={[styles.scoreBandIcon, { backgroundColor: color + "25" }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={[styles.scoreBandLabel, { color }]}>{label}</Text>
          <View style={[styles.rangeTag, { backgroundColor: color + "22", borderColor: color + "40" }]}>
            <Text style={[styles.rangeTagText, { color }]}>{range}</Text>
          </View>
        </View>
        <Text style={[styles.scoreBandDesc, { color: colors.textSecondary }]}>{description}</Text>
      </View>
    </LinearGradient>
  );
}

function FactorRow({ icon, title, desc, index }: { icon: string; title: string; desc: string; index: number }) {
  const { colors } = useTheme();
  const accentColors = [colors.primary, colors.accent, colors.safe, colors.warning, colors.danger];
  const accent = accentColors[index % accentColors.length];
  return (
    <View style={[styles.factorRow, { borderColor: colors.surfaceBorder }]}>
      <View style={[styles.factorNum, { backgroundColor: accent + "18" }]}>
        <Text style={[styles.factorNumText, { color: accent }]}>{index + 1}</Text>
      </View>
      <View style={[styles.factorIcon, { backgroundColor: accent + "15" }]}>
        <Ionicons name={icon as any} size={19} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.factorTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.factorDesc, { color: colors.textSecondary }]}>{desc}</Text>
      </View>
    </View>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      <View style={styles.sectionCardHeader}>
        {icon && (
          <View style={[styles.sectionCardIcon, { backgroundColor: colors.primaryDim }]}>
            <Ionicons name={icon as any} size={16} color={colors.primary} />
          </View>
        )}
        <Text style={[styles.sectionCardTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return <Text style={[styles.para, { color: colors.textSecondary }]}>{children}</Text>;
}

function Bullet({ text }: { text: string }) {
  const { colors } = useTheme();
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

function WarnBox({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.warnBox, { backgroundColor: colors.warningDim, borderColor: colors.warning + "35" }]}>
      <Ionicons name="warning" size={14} color={colors.warning} />
      <Text style={[styles.warnText, { color: colors.warning }]}>{text}</Text>
    </View>
  );
}

export default function TrustScoresScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
      <View style={[styles.bgAccent, {
        backgroundColor: colors.isDark ? "rgba(0,229,255,0.04)" : "rgba(0,111,255,0.04)",
      }]} />

      <View style={[styles.navBar, { borderBottomColor: colors.surfaceBorder }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Trust Scores</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        <LinearGradient
          colors={colors.isDark
            ? ["rgba(0,229,255,0.10)", "rgba(176,96,255,0.06)", "rgba(0,111,255,0.04)"]
            : ["rgba(0,111,255,0.06)", "rgba(124,58,237,0.04)", "rgba(0,111,255,0.02)"]}
          style={[styles.heroBanner, { borderColor: colors.primary + "25" }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            style={styles.heroIcon}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="shield-checkmark" size={32} color="#fff" />
          </LinearGradient>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Community Safety Scores</Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
            Trust scores harness collective wisdom from real users to give you a safety signal — before you interact with any QR code.
          </Text>
          <View style={[styles.heroBadge, { backgroundColor: colors.warningDim, borderColor: colors.warning + "30" }]}>
            <Ionicons name="warning" size={13} color={colors.warning} />
            <Text style={[styles.heroBadgeText, { color: colors.warning }]}>Advisory only — not a guarantee of safety</Text>
          </View>
        </LinearGradient>

        <SectionCard title="⚠️ Critical Disclaimer — Read First" icon="warning-outline">
          <WarnBox text="TRUST SCORES ARE COMMUNITY OPINIONS, NOT VERIFIED FACTS. A 'SAFE' VERDICT DOES NOT GUARANTEE THE QR CODE IS ACTUALLY SAFE." />
          <Para>
            Trust scores are generated from aggregated community reports, heuristic analysis, and scan patterns. They are advisory signals — not authoritative determinations of safety.
          </Para>
          <Para>
            False positives occur regularly: legitimate QR codes from reputable businesses, government services, banks, and external sources may be incorrectly flagged as dangerous. False negatives also occur: a genuinely malicious QR code may receive a safe rating if it has not yet been reported.
          </Para>
          <Para>
            QR Guard accepts no liability for any harm caused by acting on, or failing to act on, any trust score displayed in this app. You must always exercise your own independent judgment.
          </Para>
        </SectionCard>

        <SectionCard title="What Is a Trust Score?" icon="help-circle-outline">
          <Para>Every QR code scanned through QR Guard can receive a Trust Score — a number from 0 to 100 reflecting community safety ratings. It is a real-time safety signal built by people who have encountered that QR code in the real world.</Para>
          <Para>Trust scores combine community reports, scan patterns, and owner verification into a single indicator. The more people interact with a QR code, the more data the score has to work with — but more data does not mean more accuracy.</Para>
          <Para>An unrated code (no data yet) is neither safe nor unsafe — it is unknown. Always apply extra caution to unrated codes.</Para>
        </SectionCard>

        <SectionCard title="Score Bands at a Glance" icon="bar-chart-outline">
          <ScoreBand
            color={colors.safe}
            bgStart={colors.safeDim}
            bgEnd={"transparent"}
            label="Safe"
            range="70 – 100"
            description="Community consensus suggests this code is trustworthy. Does NOT mean it is definitely safe — exercise your own judgment."
            icon="shield-checkmark"
          />
          <ScoreBand
            color={colors.warning}
            bgStart={colors.warningDim}
            bgEnd={"transparent"}
            label="Caution"
            range="35 – 69"
            description="Mixed or limited community signals. Read comments carefully before acting. Avoid sharing sensitive data."
            icon="warning"
          />
          <ScoreBand
            color={colors.danger}
            bgStart={colors.dangerDim}
            bgEnd={"transparent"}
            label="Dangerous"
            range="0 – 34"
            description="Multiple users flagged this code as harmful. Does NOT guarantee it is malicious — false reports can occur. Do not click links without verifying manually."
            icon="skull"
          />
          <WarnBox text="A 'Safe' score cannot and does not guarantee protection from harm. A 'Dangerous' score may be a false positive. Always verify independently." />
        </SectionCard>

        <SectionCard title="How Scores Are Calculated" icon="calculator-outline">
          <Para>Trust scores are computed from several weighted inputs that update in real time as new reports arrive:</Para>
          <FactorRow index={0} icon="people-outline" title="Community Reports" desc="Reports are weighted by account standing. Established accounts with clean histories carry more weight. However, no weighting system is fraud-proof." />
          <FactorRow index={1} icon="repeat-outline" title="Scan Velocity" desc="A sudden spike in scans combined with negative reports is a potential fraud signal. Velocity data is collected across all users and contributes to our AI threat model." />
          <FactorRow index={2} icon="business-outline" title="Owner Verification" desc="QR codes from verified business accounts receive a baseline trust boost. Verification means accountability — not safety." />
          <FactorRow index={3} icon="chatbubbles-outline" title="Comment Sentiment" desc="Codes attracting detailed negative comments from multiple users are scored more conservatively. Comment analysis uses heuristics, not manual review." />
          <FactorRow index={4} icon="time-outline" title="Age & History" desc="Codes with long, clean histories receive greater baseline trust. Sudden behaviour changes or destination updates trigger a score review." />
          <FactorRow index={5} icon="sparkles-outline" title="AI Pattern Analysis" desc="Heuristic AI models analyse URL structure, domain age, payment data, and known threat patterns. AI analysis has known limitations and may produce incorrect results." />
        </SectionCard>

        <SectionCard title="How Your Scan Data Is Used" icon="analytics-outline">
          <WarnBox text="When you scan a QR code through QR Guard, anonymised data from that scan contributes to our community database and AI training systems." />
          <Bullet text="The QR code content (URL, payment data, text) is analysed and logged in anonymised form to our threat intelligence database." />
          <Bullet text="Scan frequency data (how often a code is scanned app-wide) is used to calculate scan velocity signals." />
          <Bullet text="Aggregated, anonymised scan patterns are used to train and improve our AI threat detection models." />
          <Bullet text="Your individual scan history is stored in your account but is not publicly visible unless you choose to share it." />
          <Bullet text="Anonymous scan pattern data may be shared with or licensed to security research partners in aggregate form." />
          <Para>This data collection is a core part of how QR Guard works and cannot be opted out of while using the scanning feature. By scanning a QR code through QR Guard, you consent to this use of your scan data.</Para>
        </SectionCard>

        <SectionCard title="Report Types Explained" icon="flag-outline">
          <Para>When you report a QR code, choose from four categories — each affects the trust score differently:</Para>
          <Bullet text="Safe — Positive signal. You verified the destination and it was legitimate. Even safe reports can be wrong." />
          <Bullet text="Scam — Strong negative. The code leads to fraudulent activity designed to steal money or data." />
          <Bullet text="Fake — Negative. The code impersonates a legitimate brand, business, or service." />
          <Bullet text="Spam — Mild negative. Unwanted, unsolicited promotional content with no genuine value." />
          <Para>Consistently accurate reporters build credibility over time. False reports are flagged by our AI and penalised. However, our false report detection is not perfect and may make errors.</Para>
        </SectionCard>

        <SectionCard title="Unrated QR Codes" icon="help-outline">
          <Para>When a QR code has never been scanned through QR Guard before, it is labelled Unrated. This is not the same as Safe — it simply means the community has not assessed it yet.</Para>
          <Para>Treat unrated codes with significant caution: verify the URL manually, look for spelling errors or lookalike domains, and never enter credentials on a site reached through an unrated QR code.</Para>
        </SectionCard>

        <SectionCard title="Verified & Branded QR Codes" icon="checkmark-shield-outline">
          <Para>Businesses can create branded QR codes through QR Guard's generator. These display a verified owner panel with the creator's name and a unique identifier.</Para>
          <Para>Verification means the code was created through QR Guard by an accountable user. It does NOT mean QR Guard endorses or vouches for the code owner's business, products, or services. Verified codes can be misused — always verify the business independently for important transactions.</Para>
        </SectionCard>

        <SectionCard title="Limitations & Known Issues" icon="alert-circle-outline">
          <WarnBox text="QR Guard's safety analysis has known limitations. Understanding them helps you stay safe." />
          <Bullet text="New or rare QR codes have no community data — scores start at zero and take time to become meaningful." />
          <Bullet text="Coordinated false reporting campaigns can temporarily manipulate scores before detection." />
          <Bullet text="QR codes from reputable external sources (banks, government, large brands) may be incorrectly flagged as dangerous." />
          <Bullet text="The app cannot scan QR codes embedded in secure PDFs, certain image formats, or very low-resolution images." />
          <Bullet text="AI analysis models may produce incorrect results for QR codes from regions or industries with limited training data." />
          <Bullet text="Internet connectivity is required for community trust data — offline mode shows only local heuristic results." />
          <Para>QR Guard is a beta product under active development. These limitations are known and actively being worked on. Always treat the app as one tool in your security decision-making, not the only one.</Para>
        </SectionCard>

        <LinearGradient
          colors={[colors.primary + "18", colors.accent + "0A"]}
          style={[styles.ctaBanner, { borderColor: colors.primary + "30" }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[styles.ctaIconWrap, { backgroundColor: colors.primary + "20" }]}>
            <Ionicons name="megaphone" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.ctaTitle, { color: colors.primary }]}>Your Reports Build the Safety Net</Text>
            <Text style={[styles.ctaSub, { color: colors.textSecondary }]}>
              Every accurate report you submit helps protect the next person. Every scan contributes to our AI safety models. Together, we make QR codes safer for everyone.
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>QR Guard — Safety powered by community · Beta v2.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgAccent: { position: "absolute", top: -100, right: -100, width: 300, height: 300, borderRadius: 150 },
  navBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navTitle: { fontSize: 16, fontFamily: "Inter_700Bold", flex: 1, textAlign: "center" },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  scrollContent: { padding: 16, gap: 10 },
  heroBanner: {
    alignItems: "center", borderRadius: 20, padding: 20,
    borderWidth: 1, gap: 10,
  },
  heroIcon: {
    width: 60, height: 60, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  heroTitle: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.2 },
  heroSub: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  heroBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  sectionCard: {
    borderRadius: 16, borderWidth: 1, padding: 14, gap: 3,
  },
  sectionCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionCardIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  sectionCardTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  para: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 6 },
  warnBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 8,
  },
  warnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1, lineHeight: 17 },
  scoreBand: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1,
  },
  scoreBandIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  scoreBandLabel: { fontSize: 13, fontFamily: "Inter_700Bold" },
  rangeTag: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1 },
  rangeTagText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  scoreBandDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  factorRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    paddingVertical: 10, borderBottomWidth: 1,
  },
  factorNum: { width: 22, height: 22, borderRadius: 7, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  factorNumText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  factorIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  factorTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  factorDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 9, marginBottom: 6 },
  bulletDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 8, flexShrink: 0 },
  bulletText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  ctaBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 18, padding: 16, borderWidth: 1,
  },
  ctaIconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  ctaTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 3 },
  ctaSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 14 },
  footerText: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
