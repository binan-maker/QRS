import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, TextInput, useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { PRESET_AMOUNTS, AMOUNT_LABELS, formatAmount } from "./charity-donation-utils";

interface Props {
  selectedAmount: number;
  isCustom: boolean;
  customAmount: string;
  finalAmount: number;
  loading: boolean;
  user: any;
  setSelectedAmount: (v: number) => void;
  setIsCustom: (v: boolean) => void;
  setCustomAmount: (v: string) => void;
  handleDonate: () => void;
}

export default function DonateTab({
  selectedAmount, isCustom, customAmount, finalAmount, loading,
  user, setSelectedAmount, setIsCustom, setCustomAmount, handleDonate,
}: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const s = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (n: number) => Math.round(n * s);
  const sp = (n: number) => Math.round(n * s);

  return (
    <>
      {/* Preset Amounts */}
      <View style={{ marginBottom: sp(20) }}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted, fontSize: rf(11), marginBottom: sp(12) }]}>
          SELECT AMOUNT
        </Text>
        <View style={[styles.presetGrid, { gap: sp(10), marginBottom: sp(10) }]}>
          {PRESET_AMOUNTS.map((amt) => {
            const isSelected = !isCustom && selectedAmount === amt;
            const isFullWidth = amt === 100000;
            return (
              <Pressable
                key={amt}
                onPress={() => { setSelectedAmount(amt); setIsCustom(false); setCustomAmount(""); }}
                style={({ pressed }) => [
                  styles.presetBtn,
                  { borderRadius: sp(18), padding: sp(16) },
                  isFullWidth && { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: sp(14) },
                  { borderColor: isSelected ? colors.primary : colors.surfaceBorder, backgroundColor: isSelected ? colors.primaryDim : colors.surface, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                {isSelected && (
                  <LinearGradient
                    colors={["#6c63ff22", "#a855f722"]}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  />
                )}
                <Text style={[styles.presetAmt, { color: isSelected ? colors.primary : colors.text, fontSize: rf(20) }]}>
                  {formatAmount(amt)}
                </Text>
                <Text style={[styles.presetLabel, { color: isSelected ? colors.primary : colors.textMuted, fontSize: rf(11) }]}>
                  {AMOUNT_LABELS[amt]}
                </Text>
                {isSelected && <View style={[styles.selectedDot, { backgroundColor: colors.primary, top: sp(10), right: sp(10), width: sp(8), height: sp(8), borderRadius: sp(4) }]} />}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => { setIsCustom(true); setCustomAmount(""); }}
          style={[styles.customAmtRow, { borderRadius: sp(16), padding: sp(14), borderColor: isCustom ? colors.primary : colors.surfaceBorder, backgroundColor: isCustom ? colors.primaryDim : colors.surface }]}
        >
          <View style={[styles.customIcon, { width: sp(36), height: sp(36), borderRadius: sp(12), backgroundColor: isCustom ? colors.primaryDim : colors.surfaceLight, alignItems: "center", justifyContent: "center" }]}>
            <Ionicons name="pencil-outline" size={rf(16)} color={isCustom ? colors.primary : colors.textMuted} />
          </View>
          {isCustom ? (
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
              <Text style={[{ fontSize: rf(20), fontFamily: "Inter_700Bold", color: colors.primary, marginRight: 4 }]}>₹</Text>
              <TextInput
                style={[{ flex: 1, fontSize: rf(20), fontFamily: "Inter_700Bold", color: colors.primary, padding: 0 }]}
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
            <Text style={[{ flex: 1, fontSize: rf(14), fontFamily: "Inter_500Medium", color: colors.textSecondary }]}>
              Custom Amount
            </Text>
          )}
          {isCustom && <Ionicons name="checkmark-circle" size={rf(20)} color={colors.primary} />}
        </Pressable>
      </View>

      {/* Where it goes */}
      <View style={{ marginBottom: sp(20) }}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted, fontSize: rf(11), marginBottom: sp(12) }]}>
          WHERE YOUR MONEY GOES
        </Text>
        <View style={[styles.impactCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, borderRadius: sp(18) }]}>
          {[
            { icon: "server-outline", text: "Server hosting & infrastructure costs" },
            { icon: "code-slash-outline", text: "Development time & ongoing maintenance" },
            { icon: "bulb-outline", text: "New security features & threat detection" },
            { icon: "shield-checkmark-outline", text: "Keeping QR Guard independent & trustworthy" },
          ].map((item, i) => (
            <View key={i} style={[styles.impactRow, { gap: sp(12), padding: sp(14) }, i < 3 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.surfaceBorder }]}>
              <View style={[{ width: sp(34), height: sp(34), borderRadius: sp(10), alignItems: "center", justifyContent: "center", backgroundColor: colors.primaryDim }]}>
                <Ionicons name={item.icon as any} size={rf(16)} color={colors.primary} />
              </View>
              <Text style={[{ flex: 1, fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.textSecondary }]}>{item.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Donate Button */}
      <View style={{ marginBottom: sp(20) }}>
        {!user && (
          <View style={[styles.loginNotice, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, borderRadius: sp(12), padding: sp(12), marginBottom: sp(14) }]}>
            <Ionicons name="information-circle-outline" size={rf(18)} color={colors.textMuted} />
            <Text style={[{ flex: 1, fontSize: rf(12), fontFamily: "Inter_400Regular", color: colors.textMuted }]}>
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
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.donateBtn, { borderRadius: sp(18), paddingVertical: sp(18) }]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="heart" size={rf(20)} color="#fff" />
                <Text style={[{ fontSize: rf(16), fontFamily: "Inter_700Bold", color: "#fff" }]}>
                  Donate {finalAmount >= 1 ? `₹${finalAmount.toLocaleString("en-IN")}` : ""}
                </Text>
              </>
            )}
          </LinearGradient>
        </Pressable>

        <View style={[styles.secureRow, { gap: sp(6), marginTop: sp(12) }]}>
          <Ionicons name="lock-closed-outline" size={rf(13)} color={colors.textMuted} />
          <Text style={[{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: colors.textMuted }]}>
            100% secure · Powered by Razorpay
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { fontFamily: "Inter_700Bold", letterSpacing: 1.4, textTransform: "uppercase" },
  presetGrid: { flexDirection: "row", flexWrap: "wrap" },
  presetBtn: { width: "47.5%", alignItems: "center", position: "relative", overflow: "hidden", borderWidth: 1.5 },
  presetAmt: { fontFamily: "Inter_700Bold", marginBottom: 2 },
  presetLabel: { fontFamily: "Inter_500Medium" },
  selectedDot: { position: "absolute" },
  customAmtRow: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5 },
  customIcon: {},
  impactCard: { borderWidth: 1, overflow: "hidden" },
  impactRow: { flexDirection: "row", alignItems: "center" },
  loginNotice: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1 },
  donateBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  secureRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
