import {
  View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions,
} from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import DonateTab from "./DonateTab";

export default function CharityDonationSection() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();

  const s = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (n: number) => Math.round(n * s);
  const sp = (n: number) => Math.round(n * s);

  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  const finalAmount = isCustom
    ? Math.max(1, parseInt(customAmount || "0", 10) || 0)
    : selectedAmount;

  function handleDonate() {
    // Payments are handled via Google Play Billing / Apple In-App Purchases.
    router.push("/donation");
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

      <DonateTab
        selectedAmount={selectedAmount}
        isCustom={isCustom}
        customAmount={customAmount}
        finalAmount={finalAmount}
        loading={false}
        user={user}
        setSelectedAmount={setSelectedAmount}
        setIsCustom={setIsCustom}
        setCustomAmount={setCustomAmount}
        handleDonate={handleDonate}
      />
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
});
