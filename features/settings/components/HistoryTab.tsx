import {
  View, Text, StyleSheet, ActivityIndicator, useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { formatDate } from "./charity-donation-utils";

interface DonationRecord {
  id: string;
  amount?: number;
  donorName?: string;
  paidAt?: any;
  paymentId?: string;
}

interface Props {
  donations: DonationRecord[];
  loadingHistory: boolean;
}

export default function HistoryTab({ donations, loadingHistory }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const s = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (n: number) => Math.round(n * s);
  const sp = (n: number) => Math.round(n * s);

  if (loadingHistory) {
    return (
      <View style={[styles.center, { paddingVertical: sp(40) }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[{ fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 12 }]}>
          Loading your donations…
        </Text>
      </View>
    );
  }

  if (donations.length === 0) {
    return (
      <View style={[styles.center, { paddingVertical: sp(40) }]}>
        <LinearGradient
          colors={[colors.primaryDim, colors.accentDim]}
          style={[styles.emptyIcon, { width: sp(72), height: sp(72), borderRadius: sp(36), marginBottom: sp(16) }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <Ionicons name="heart-outline" size={rf(32)} color={colors.primary} />
        </LinearGradient>
        <Text style={[{ fontSize: rf(17), fontFamily: "Inter_700Bold", marginBottom: sp(8), color: colors.text }]}>
          No donations yet
        </Text>
        <Text style={[{ fontSize: rf(13), fontFamily: "Inter_400Regular", textAlign: "center", color: colors.textMuted }]}>
          Your charity donations will appear here.
        </Text>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.historyStats, { gap: sp(12), marginBottom: sp(20) }]}>
        <LinearGradient
          colors={["#6c63ff22", "#a855f722"]}
          style={[styles.historyStatCard, { borderRadius: sp(16), borderWidth: 1, padding: sp(16), gap: sp(4), borderColor: colors.primary + "40" }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <Ionicons name="heart" size={rf(20)} color={colors.primary} />
          <Text style={[{ fontSize: rf(18), fontFamily: "Inter_700Bold", color: colors.primary }]}>{donations.length}</Text>
          <Text style={[{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted }]}>Donations</Text>
        </LinearGradient>
        <LinearGradient
          colors={["#10b98122", "#34d39922"]}
          style={[styles.historyStatCard, { borderRadius: sp(16), borderWidth: 1, padding: sp(16), gap: sp(4), borderColor: "#10b981" + "40" }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <Ionicons name="cash-outline" size={rf(20)} color="#10b981" />
          <Text style={[{ fontSize: rf(18), fontFamily: "Inter_700Bold", color: "#10b981" }]}>
            ₹{donations.reduce((s, d) => s + (d.amount || 0), 0).toLocaleString("en-IN")}
          </Text>
          <Text style={[{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted }]}>Total Given</Text>
        </LinearGradient>
      </View>

      <Text style={[{ fontSize: rf(11), fontFamily: "Inter_700Bold", color: colors.textMuted, letterSpacing: 1.4, marginBottom: sp(10), textTransform: "uppercase" }]}>
        DONATION HISTORY
      </Text>
      {donations.map((d, i) => (
        <View
          key={d.id}
          style={[
            styles.donationCard,
            { borderRadius: sp(16), borderWidth: 1, padding: sp(14), backgroundColor: colors.surface, borderColor: colors.surfaceBorder, marginBottom: i < donations.length - 1 ? sp(10) : 0 },
          ]}
        >
          <LinearGradient
            colors={["#6c63ff", "#a855f7"]}
            style={[styles.donationAmtBadge, { borderRadius: sp(12), paddingHorizontal: sp(12), paddingVertical: sp(8), minWidth: sp(70) }]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Text style={[{ fontSize: rf(15), fontFamily: "Inter_700Bold", color: "#fff" }]}>
              ₹{(d.amount || 0).toLocaleString("en-IN")}
            </Text>
          </LinearGradient>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", marginBottom: 2, color: colors.text }]} numberOfLines={1}>
              {d.donorName || "Anonymous"}
            </Text>
            <Text style={[{ fontSize: rf(11), fontFamily: "Inter_400Regular", marginBottom: 1, color: colors.textMuted }]}>
              {formatDate(d.paidAt)}
            </Text>
            {d.paymentId && (
              <Text style={[{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted }]} numberOfLines={1}>
                {d.paymentId}
              </Text>
            )}
          </View>
          <View style={[{ flexDirection: "row", alignItems: "center", gap: 4, borderRadius: sp(8), borderWidth: 1, paddingHorizontal: sp(8), paddingVertical: sp(4), backgroundColor: "#10b98120", borderColor: "#10b98140" }]}>
            <Ionicons name="checkmark-circle" size={rf(13)} color="#10b981" />
            <Text style={[{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", color: "#10b981" }]}>Paid</Text>
          </View>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  emptyIcon: { alignItems: "center", justifyContent: "center" },
  historyStats: { flexDirection: "row" },
  historyStatCard: { flex: 1, alignItems: "center" },
  donationCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  donationAmtBadge: { alignItems: "center", justifyContent: "center" },
});
