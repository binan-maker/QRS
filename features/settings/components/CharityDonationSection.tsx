import {
  View, Text, Pressable, ScrollView, Alert, StyleSheet, useWindowDimensions,
} from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import {
  createDonationOrder,
  buildCheckoutUrl,
  fetchMyDonations,
  type DonationRecord,
} from "@/services/donation-service";
import DonateTab from "./DonateTab";
import HistoryTab from "./HistoryTab";

export default function CharityDonationSection() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

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

  const userId = user?.id;
  const loadHistory = useCallback(async () => {
    if (!userId) return;
    setLoadingHistory(true);
    try {
      const data = await fetchMyDonations(userId);
      if (!mountedRef.current) return;
      setDonations(data);
    } catch {}
    if (mountedRef.current) setLoadingHistory(false);
  }, [userId]);

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
        userId: user?.id,
      });
      const checkoutUrl = buildCheckoutUrl({
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: user?.displayName || "",
        email: user?.email || "",
        userId: user?.id || "",
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

return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scroll, { padding: sp(20), paddingBottom: insets.bottom + 32 }]}
    >
      {/* Hero Banner */}
      <LinearGradient
        colors={["#6c63ff", "#a855f7", "#ec4899"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.hero, { borderRadius: sp(24), padding: sp(28), marginBottom: sp(20) }]}
      >
        <Text style={[styles.heroEmoji, { fontSize: rf(40) }]}>🙏</Text>
        <Text style={[styles.heroTitle, { fontSize: rf(22), marginBottom: sp(8) }]}>Support the Creator</Text>
        <Text style={[styles.heroSub, { fontSize: rf(13), lineHeight: rf(21), marginBottom: sp(20) }]}>
          BinRo is built and maintained by an independent developer. Your contribution directly funds server infrastructure, ongoing development, and future improvements.
        </Text>
        <View style={[styles.heroPillRow, { gap: sp(6) }]}>
          {["Independent Developer", "No VC Funding", "Built with care"].map((t) => (
            <View key={t} style={[styles.heroPill, { borderRadius: sp(100), paddingHorizontal: sp(10), paddingVertical: sp(5) }]}>
              <Text style={[styles.heroPillText, { fontSize: rf(11) }]}>{t}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: colors.surfaceBorder, marginBottom: sp(20) }]}>
        <Pressable
          style={[styles.tab, { gap: sp(6), paddingVertical: sp(12) }, tab === "donate" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setTab("donate")}
        >
          <Ionicons name="heart" size={rf(15)} color={tab === "donate" ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabText, { fontSize: rf(13), color: tab === "donate" ? colors.primary : colors.textMuted }]}>
            Donate
          </Text>
        </Pressable>
        {user && (
          <Pressable
            style={[styles.tab, { gap: sp(6), paddingVertical: sp(12) }, tab === "history" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setTab("history")}
          >
            <Ionicons name="receipt-outline" size={rf(15)} color={tab === "history" ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabText, { fontSize: rf(13), color: tab === "history" ? colors.primary : colors.textMuted }]}>
              My Donations
            </Text>
          </Pressable>
        )}
      </View>

      {tab === "donate" && (
        <DonateTab
          selectedAmount={selectedAmount}
          isCustom={isCustom}
          customAmount={customAmount}
          finalAmount={finalAmount}
          loading={loading}
          user={user}
          setSelectedAmount={setSelectedAmount}
          setIsCustom={setIsCustom}
          setCustomAmount={setCustomAmount}
          handleDonate={handleDonate}
        />
      )}

      {tab === "history" && (
        <HistoryTab donations={donations} loadingHistory={loadingHistory} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {},
  hero: { alignItems: "center", overflow: "hidden" },
  heroEmoji: { marginBottom: 10 },
  heroTitle: { fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center" },
  heroSub: { fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.82)", textAlign: "center" },
  heroPillRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  heroPill: { backgroundColor: "rgba(255,255,255,0.18)" },
  heroPillText: { fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.9)" },
  tabRow: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  tabText: { fontFamily: "Inter_600SemiBold" },
});