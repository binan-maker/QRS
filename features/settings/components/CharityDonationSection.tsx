import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  createDonationOrder,
  buildCheckoutUrl,
  fetchMyDonations,
  type DonationRecord,
} from "@/lib/services/donation-service";

const PRESET_AMOUNTS = [500, 2000, 10000, 50000, 100000];

const AMOUNT_LABELS: Record<number, string> = {
  500: "Contributor",
  2000: "Supporter",
  10000: "Patron",
  50000: "Benefactor",
  100000: "Founding Donor",
};

function formatAmount(amount: number): string {
  if (amount >= 100000) return `₹1L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
  return `₹${amount}`;
}

function formatDate(ts: any): string {
  try {
    const d: Date = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function CharityDonationSection() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const s = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (n: number) => Math.round(n * s);
  const sp = (n: number) => Math.round(n * s);

  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [tab, setTab] = useState<"donate" | "history">("donate");

  const finalAmount = isCustom
    ? Math.max(1, parseInt(customAmount || "0", 10) || 0)
    : selectedAmount;

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setLoadingHistory(true);
    const data = await fetchMyDonations(user.uid);
    setDonations(data);
    setLoadingHistory(false);
  }, [user]);

  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab, loadHistory]);

  async function handleDonate() {
    if (finalAmount < 1) {
      Alert.alert("Invalid Amount", "Please enter a valid donation amount.");
      return;
    }
    setLoading(true);
    try {
      const order = await createDonationOrder({
        amount: finalAmount,
        donorName: user?.displayName || "Anonymous",
        donorEmail: user?.email || "",
        userId: user?.uid,
      });

      const checkoutUrl = buildCheckoutUrl({
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: user?.displayName || "",
        email: user?.email || "",
        userId: user?.uid || "",
      });

      const result = await WebBrowser.openBrowserAsync(checkoutUrl, {
        toolbarColor: "#6c63ff",
        controlsColor: "#ffffff",
        showTitle: true,
      });

      if (result.type === "opened" || result.type === "dismiss" || result.type === "cancel") {
        if (tab === "history") loadHistory();
      }
    } catch (err: any) {
      Alert.alert(
        "Payment Error",
        err?.message === "Payment service not configured"
          ? "Razorpay is not yet configured. Please add your API keys."
          : err?.message || "Unable to start payment. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const styles = makeStyles(colors, s, rf, sp);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
    >
      {/* ── Hero Banner ── */}
      <LinearGradient
        colors={["#6c63ff", "#a855f7", "#ec4899"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroEmoji}>🙏</Text>
        <Text style={styles.heroTitle}>Support the Creator</Text>
        <Text style={styles.heroSub}>
          QR Guard is built and maintained by an independent developer. Your contribution directly funds server infrastructure, ongoing development, and future improvements.
        </Text>
        <View style={[styles.heroPillRowSmall]}>
          {["Independent Developer", "No VC Funding", "Built with care"].map((t) => (
            <View key={t} style={styles.heroPillSmall}>
              <Text style={styles.heroPillSmallText}>{t}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* ── Tabs ── */}
      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tab, tab === "donate" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setTab("donate")}
        >
          <Ionicons name="heart" size={rf(15)} color={tab === "donate" ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabText, { color: tab === "donate" ? colors.primary : colors.textMuted }]}>
            Donate
          </Text>
        </Pressable>
        {user && (
          <Pressable
            style={[styles.tab, tab === "history" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setTab("history")}
          >
            <Ionicons name="receipt-outline" size={rf(15)} color={tab === "history" ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabText, { color: tab === "history" ? colors.primary : colors.textMuted }]}>
              My Donations
            </Text>
          </Pressable>
        )}
      </View>

      {tab === "donate" && (
        <>
          {/* ── Preset Amounts ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SELECT AMOUNT</Text>
            <View style={styles.presetGrid}>
              {PRESET_AMOUNTS.map((amt) => {
                const isSelected = !isCustom && selectedAmount === amt;
                const isFullWidth = amt === 100000;
                return (
                  <Pressable
                    key={amt}
                    onPress={() => { setSelectedAmount(amt); setIsCustom(false); setCustomAmount(""); }}
                    style={({ pressed }) => [
                      styles.presetBtn,
                      isFullWidth && { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: sp(14) },
                      {
                        borderColor: isSelected ? colors.primary : colors.surfaceBorder,
                        backgroundColor: isSelected ? colors.primaryDim : colors.surface,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    {isSelected && (
                      <LinearGradient
                        colors={["#6c63ff22", "#a855f722"]}
                        style={StyleSheet.absoluteFillObject}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                    )}
                    <Text style={[styles.presetAmt, { color: isSelected ? colors.primary : colors.text }]}>
                      {formatAmount(amt)}
                    </Text>
                    <Text style={[styles.presetLabel, { color: isSelected ? colors.primary : colors.textMuted }]}>
                      {AMOUNT_LABELS[amt]}
                    </Text>
                    {isSelected && (
                      <View style={[styles.selectedDot, { backgroundColor: colors.primary }]} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Custom Amount */}
            <Pressable
              onPress={() => { setIsCustom(true); setCustomAmount(""); }}
              style={[
                styles.customAmtRow,
                {
                  borderColor: isCustom ? colors.primary : colors.surfaceBorder,
                  backgroundColor: isCustom ? colors.primaryDim : colors.surface,
                },
              ]}
            >
              <View style={[styles.customIcon, { backgroundColor: isCustom ? colors.primaryDim : colors.surfaceLight }]}>
                <Ionicons name="pencil-outline" size={rf(16)} color={isCustom ? colors.primary : colors.textMuted} />
              </View>
              {isCustom ? (
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
                  <Text style={[styles.rupeeSign, { color: colors.primary }]}>₹</Text>
                  <TextInput
                    style={[styles.customInput, { color: colors.primary }]}
                    value={customAmount}
                    onChangeText={(t) => setCustomAmount(t.replace(/[^0-9]/g, ""))}
                    placeholder="Enter amount"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    autoFocus
                    maxLength={7}
                  />
                </View>
              ) : (
                <Text style={[styles.customAmtText, { color: colors.textSecondary }]}>
                  Custom Amount
                </Text>
              )}
              {isCustom && (
                <Ionicons name="checkmark-circle" size={rf(20)} color={colors.primary} />
              )}
            </Pressable>
          </View>

          {/* ── Where it goes ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>WHERE YOUR MONEY GOES</Text>
            <View style={[styles.impactCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              {[
                { icon: "server-outline", text: "Server hosting & infrastructure costs" },
                { icon: "code-slash-outline", text: "Development time & ongoing maintenance" },
                { icon: "bulb-outline", text: "New security features & threat detection" },
                { icon: "shield-checkmark-outline", text: "Keeping QR Guard independent & trustworthy" },
              ].map((item, i) => (
                <View key={i} style={[styles.impactRow, i < 3 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.surfaceBorder }]}>
                  <View style={[styles.impactIcon, { backgroundColor: colors.primaryDim }]}>
                    <Ionicons name={item.icon as any} size={rf(16)} color={colors.primary} />
                  </View>
                  <Text style={[styles.impactText, { color: colors.textSecondary }]}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Donate Button ── */}
          <View style={styles.section}>
            {!user && (
              <View style={[styles.loginNotice, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <Ionicons name="information-circle-outline" size={rf(18)} color={colors.textMuted} />
                <Text style={[styles.loginNoticeText, { color: colors.textMuted }]}>
                  Sign in to track your donations in history.
                </Text>
              </View>
            )}

            <Pressable
              onPress={handleDonate}
              disabled={loading || finalAmount < 1}
              style={({ pressed }) => [{ opacity: pressed || loading || finalAmount < 1 ? 0.7 : 1 }]}
            >
              <LinearGradient
                colors={["#6c63ff", "#a855f7"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.donateBtn}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="heart" size={rf(20)} color="#fff" />
                    <Text style={styles.donateBtnText}>
                      Donate {finalAmount >= 1 ? `₹${finalAmount.toLocaleString("en-IN")}` : ""}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <View style={styles.secureRow}>
              <Ionicons name="lock-closed-outline" size={rf(13)} color={colors.textMuted} />
              <Text style={[styles.secureText, { color: colors.textMuted }]}>
                100% secure · Powered by Razorpay
              </Text>
            </View>
          </View>
        </>
      )}

      {tab === "history" && (
        <View style={styles.section}>
          {loadingHistory ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.emptyText, { color: colors.textMuted, marginTop: 12 }]}>
                Loading your donations…
              </Text>
            </View>
          ) : donations.length === 0 ? (
            <View style={styles.center}>
              <LinearGradient
                colors={[colors.primaryDim, colors.accentDim]}
                style={styles.emptyIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="heart-outline" size={rf(32)} color={colors.primary} />
              </LinearGradient>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No donations yet</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Your charity donations will appear here.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.historyStats}>
                <LinearGradient
                  colors={["#6c63ff22", "#a855f722"]}
                  style={[styles.historyStatCard, { borderColor: colors.primary + "40" }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="heart" size={rf(20)} color={colors.primary} />
                  <Text style={[styles.historyStatNum, { color: colors.primary }]}>
                    {donations.length}
                  </Text>
                  <Text style={[styles.historyStatLabel, { color: colors.textMuted }]}>Donations</Text>
                </LinearGradient>
                <LinearGradient
                  colors={["#10b98122", "#34d39922"]}
                  style={[styles.historyStatCard, { borderColor: "#10b981" + "40" }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="cash-outline" size={rf(20)} color="#10b981" />
                  <Text style={[styles.historyStatNum, { color: "#10b981" }]}>
                    ₹{donations.reduce((s, d) => s + (d.amount || 0), 0).toLocaleString("en-IN")}
                  </Text>
                  <Text style={[styles.historyStatLabel, { color: colors.textMuted }]}>Total Given</Text>
                </LinearGradient>
              </View>

              <Text style={[styles.sectionLabel, { marginBottom: sp(10) }]}>DONATION HISTORY</Text>
              {donations.map((d, i) => (
                <View
                  key={d.id}
                  style={[
                    styles.donationCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.surfaceBorder,
                      marginBottom: i < donations.length - 1 ? sp(10) : 0,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={["#6c63ff", "#a855f7"]}
                    style={styles.donationAmtBadge}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.donationAmtText}>
                      ₹{(d.amount || 0).toLocaleString("en-IN")}
                    </Text>
                  </LinearGradient>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.donationName, { color: colors.text }]} numberOfLines={1}>
                      {d.donorName || "Anonymous"}
                    </Text>
                    <Text style={[styles.donationDate, { color: colors.textMuted }]}>
                      {formatDate(d.paidAt)}
                    </Text>
                    {d.paymentId && (
                      <Text style={[styles.donationId, { color: colors.textMuted }]} numberOfLines={1}>
                        {d.paymentId}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.successBadge, { backgroundColor: "#10b98120", borderColor: "#10b98140" }]}>
                    <Ionicons name="checkmark-circle" size={rf(13)} color="#10b981" />
                    <Text style={[styles.successBadgeText, { color: "#10b981" }]}>Paid</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function makeStyles(c: any, s: number, rf: (n: number) => number, sp: (n: number) => number) {
  return StyleSheet.create({
    scroll: { padding: sp(20) },
    hero: {
      borderRadius: sp(24),
      padding: sp(28),
      alignItems: "center",
      marginBottom: sp(20),
      overflow: "hidden",
    },
    heroEmoji: { fontSize: rf(40), marginBottom: sp(10) },
    heroTitle: { fontSize: rf(22), fontFamily: "Inter_700Bold", color: "#fff", marginBottom: sp(8), textAlign: "center" },
    heroSub: { fontSize: rf(13), fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.82)", textAlign: "center", lineHeight: rf(21), marginBottom: sp(20) },
    heroPillRowSmall: { flexDirection: "row", flexWrap: "wrap", gap: sp(6), justifyContent: "center" },
    heroPillSmall: { backgroundColor: "rgba(255,255,255,0.18)", borderRadius: sp(100), paddingHorizontal: sp(10), paddingVertical: sp(5) },
    heroPillSmallText: { fontSize: rf(11), fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.9)" },
    tabRow: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.surfaceBorder, marginBottom: sp(20) },
    tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: sp(6), paddingVertical: sp(12) },
    tabText: { fontSize: rf(13), fontFamily: "Inter_600SemiBold" },
    section: { marginBottom: sp(20) },
    sectionLabel: { fontSize: rf(11), fontFamily: "Inter_700Bold", color: c.textMuted, letterSpacing: 1.4, marginBottom: sp(12), textTransform: "uppercase" },
    presetGrid: { flexDirection: "row", flexWrap: "wrap", gap: sp(10), marginBottom: sp(10) },
    presetBtn: {
      width: "47.5%", borderRadius: sp(18), borderWidth: 1.5, padding: sp(16),
      alignItems: "center", position: "relative", overflow: "hidden",
    },
    presetAmt: { fontSize: rf(20), fontFamily: "Inter_700Bold", marginBottom: 2 },
    presetLabel: { fontSize: rf(11), fontFamily: "Inter_500Medium" },
    selectedDot: { position: "absolute", top: sp(10), right: sp(10), width: sp(8), height: sp(8), borderRadius: sp(4) },
    customAmtRow: {
      flexDirection: "row", alignItems: "center", gap: sp(12),
      borderRadius: sp(16), borderWidth: 1.5, padding: sp(14), marginTop: 0,
    },
    customIcon: { width: sp(36), height: sp(36), borderRadius: sp(12), alignItems: "center", justifyContent: "center" },
    customAmtText: { flex: 1, fontSize: rf(14), fontFamily: "Inter_500Medium" },
    rupeeSign: { fontSize: rf(20), fontFamily: "Inter_700Bold", marginRight: 4 },
    customInput: { flex: 1, fontSize: rf(20), fontFamily: "Inter_700Bold", padding: 0 },
    impactCard: { borderRadius: sp(18), borderWidth: 1, overflow: "hidden" },
    impactRow: { flexDirection: "row", alignItems: "center", gap: sp(12), padding: sp(14) },
    impactIcon: { width: sp(34), height: sp(34), borderRadius: sp(10), alignItems: "center", justifyContent: "center" },
    impactText: { flex: 1, fontSize: rf(13), fontFamily: "Inter_400Regular" },
    loginNotice: { flexDirection: "row", alignItems: "center", gap: sp(8), borderRadius: sp(12), borderWidth: 1, padding: sp(12), marginBottom: sp(14) },
    loginNoticeText: { flex: 1, fontSize: rf(12), fontFamily: "Inter_400Regular" },
    donateBtn: { borderRadius: sp(18), flexDirection: "row", alignItems: "center", justifyContent: "center", gap: sp(8), paddingVertical: sp(18) },
    donateBtnText: { fontSize: rf(16), fontFamily: "Inter_700Bold", color: "#fff" },
    secureRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: sp(6), marginTop: sp(12) },
    secureText: { fontSize: rf(12), fontFamily: "Inter_400Regular" },
    center: { alignItems: "center", justifyContent: "center", paddingVertical: sp(40) },
    emptyIcon: { width: sp(72), height: sp(72), borderRadius: sp(36), alignItems: "center", justifyContent: "center", marginBottom: sp(16) },
    emptyTitle: { fontSize: rf(17), fontFamily: "Inter_700Bold", marginBottom: sp(8) },
    emptyText: { fontSize: rf(13), fontFamily: "Inter_400Regular", textAlign: "center" },
    historyStats: { flexDirection: "row", gap: sp(12), marginBottom: sp(20) },
    historyStatCard: { flex: 1, borderRadius: sp(16), borderWidth: 1, alignItems: "center", padding: sp(16), gap: sp(4) },
    historyStatNum: { fontSize: rf(18), fontFamily: "Inter_700Bold" },
    historyStatLabel: { fontSize: rf(11), fontFamily: "Inter_400Regular" },
    donationCard: { flexDirection: "row", alignItems: "center", gap: sp(12), borderRadius: sp(16), borderWidth: 1, padding: sp(14) },
    donationAmtBadge: { borderRadius: sp(12), paddingHorizontal: sp(12), paddingVertical: sp(8), alignItems: "center", justifyContent: "center", minWidth: sp(70) },
    donationAmtText: { fontSize: rf(15), fontFamily: "Inter_700Bold", color: "#fff" },
    donationName: { fontSize: rf(13), fontFamily: "Inter_600SemiBold", marginBottom: 2 },
    donationDate: { fontSize: rf(11), fontFamily: "Inter_400Regular", marginBottom: 1 },
    donationId: { fontSize: rf(10), fontFamily: "Inter_400Regular" },
    successBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: sp(8), borderWidth: 1, paddingHorizontal: sp(8), paddingVertical: sp(4) },
    successBadgeText: { fontSize: rf(11), fontFamily: "Inter_600SemiBold" },
  });
}
