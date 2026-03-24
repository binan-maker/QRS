import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "@/lib/haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import SkeletonBox from "@/components/ui/SkeletonBox";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToUserGeneratedQrs,
  type GeneratedQrItem,
} from "@/lib/firestore-service";

function SkeletonQrCard() {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.surfaceBorder, padding: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 14 }}>
      <SkeletonBox width={72} height={72} borderRadius={14} />
      <View style={{ flex: 1, gap: 10 }}>
        <SkeletonBox width="45%" height={10} />
        <SkeletonBox width="80%" height={14} />
        <SkeletonBox width="60%" height={10} />
      </View>
    </View>
  );
}

type Filter = "all" | "individual" | "business";

function formatDate(iso: string) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return iso; }
}

const FILTERS: { key: Filter; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "layers-outline" },
  { key: "individual", label: "Individual", icon: "person-outline" },
  { key: "business", label: "Business", icon: "storefront-outline" },
];

export default function MyQrCodesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBarHeight = 62 + insets.bottom + 8;

  const [qrCodes, setQrCodes] = useState<GeneratedQrItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    if (!hasLoadedRef.current) setLoading(true);
    if (unsubscribeRef.current) { unsubscribeRef.current(); unsubscribeRef.current = null; }
    const unsub = subscribeToUserGeneratedQrs(user.id, (items) => {
      setQrCodes(items);
      setLoading(false);
      setRefreshing(false);
      hasLoadedRef.current = true;
    });
    unsubscribeRef.current = unsub;
    return () => { if (unsubscribeRef.current) { unsubscribeRef.current(); unsubscribeRef.current = null; } };
  }, [user?.id]);

  function handleRefresh() { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); }

  const filtered = qrCodes.filter((qr) => {
    if (filter === "individual") return qr.qrType === "individual";
    if (filter === "business") return qr.qrType === "business";
    return true;
  });

  function renderItem({ item, index }: { item: GeneratedQrItem; index: number }) {
    const isBusiness = item.qrType === "business";

    return (
      <Animated.View entering={FadeInDown.duration(380).delay(index * 50).springify()}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/my-qr/${item.docId}` as any); }}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.985 : 1 }],
            }
          ]}
        >
          <View style={[styles.qrWrap, { backgroundColor: item.bgColor || (colors.isDark ? "#F8FAFC" : "#F0F4FF") }]}>
            <QRCode
              value={item.content || "https://qrguard.app"}
              size={68}
              color={item.fgColor || "#0A0E17"}
              backgroundColor={item.bgColor || "#F8FAFC"}
              quietZone={4}
              ecl="L"
            />
          </View>

          <View style={styles.cardInfo}>
            <View style={styles.cardTopRow}>
              {isBusiness ? (
                <LinearGradient colors={["#F59E0B", "#F97316"]} style={styles.typePill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name="storefront" size={9} color="#fff" />
                  <Text style={styles.typePillTextWhite}>Business</Text>
                </LinearGradient>
              ) : (
                <LinearGradient colors={colors.isDark ? ["#00E5FF", "#006FFF"] : ["#006FFF", "#0047CC"]} style={styles.typePill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name="person" size={9} color="#fff" />
                  <Text style={styles.typePillTextWhite}>Individual</Text>
                </LinearGradient>
              )}
              {!item.isActive && (
                <View style={[styles.inactivePill, { backgroundColor: colors.dangerDim, borderColor: colors.danger + "40" }]}>
                  <Text style={[styles.inactivePillText, { color: colors.danger }]}>Inactive</Text>
                </View>
              )}
            </View>
            {item.businessName ? (
              <Text style={[styles.businessName, { color: colors.text }]} numberOfLines={1}>{item.businessName}</Text>
            ) : null}
            <Text style={[styles.contentText, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.content.length > 50 ? item.content.slice(0, 50) + "…" : item.content}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="scan-outline" size={11} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textMuted }]}>{item.scanCount} scans</Text>
              </View>
              <View style={styles.metaSep} />
              <View style={styles.metaItem}>
                <Ionicons name="chatbubble-outline" size={11} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textMuted }]}>{item.commentCount}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.chevronWrap, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  const NavBar = () => (
    <View style={[styles.navBar, { paddingTop: topInset + 6 }]}>
      <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
      <View style={styles.navCenter}>
        <Text style={[styles.navTitle, { color: colors.text }]}>My QR Codes</Text>
        {qrCodes.length > 0 && (
          <View style={[styles.countPill, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" }]}>
            <Text style={[styles.countPillText, { color: colors.primary }]}>{qrCodes.length}</Text>
          </View>
        )}
      </View>
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/qr-generator"); }}
        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
      >
        <LinearGradient
          colors={colors.isDark ? ["#00E5FF", "#006FFF"] : ["#006FFF", "#0047CC"]}
          style={styles.createBtn}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.createBtnText}>New</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NavBar />
        <View style={styles.center}>
          <LinearGradient colors={colors.isDark ? ["#00E5FF", "#006FFF"] : ["#006FFF", "#0047CC"]} style={styles.emptyIconWrap} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <MaterialCommunityIcons name="qrcode-plus" size={36} color="#fff" />
          </LinearGradient>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Sign in required</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Sign in to manage your generated QR codes</Text>
          <Pressable onPress={() => router.push("/(auth)/login")} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
            <LinearGradient colors={colors.isDark ? ["#00E5FF", "#006FFF"] : ["#006FFF", "#0047CC"]} style={styles.signInBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.signInBtnText}>Sign In</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar />

      <View style={[styles.filterRow]}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => { setFilter(f.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[
              styles.filterBtn,
              { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
              filter === f.key && { backgroundColor: colors.primaryDim, borderColor: colors.primary + "50" },
            ]}
          >
            <Ionicons name={f.icon as any} size={13} color={filter === f.key ? colors.primary : colors.textMuted} />
            <Text style={[styles.filterBtnText, { color: filter === f.key ? colors.primary : colors.textMuted }]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading && qrCodes.length === 0 ? (
        <View style={{ padding: 20 }}>
          <SkeletonQrCard /><SkeletonQrCard /><SkeletonQrCard />
        </View>
      ) : filtered.length === 0 ? (
        <Animated.View entering={FadeIn.duration(400)} style={styles.center}>
          <LinearGradient colors={colors.isDark ? ["#00E5FF", "#006FFF"] : ["#006FFF", "#0047CC"]} style={styles.emptyIconWrap} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <MaterialCommunityIcons name="qrcode-plus" size={36} color="#fff" />
          </LinearGradient>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {filter === "business" ? "No business codes" : filter === "individual" ? "No individual codes" : "No QR codes yet"}
          </Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Head to the generator and create your first QR code
          </Text>
          <Pressable onPress={() => router.push("/(tabs)/qr-generator")} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
            <LinearGradient colors={colors.isDark ? ["#00E5FF", "#006FFF"] : ["#006FFF", "#0047CC"]} style={styles.signInBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.signInBtnText}>Create QR Code</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.docId}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 20 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            <Text style={[styles.countText, { color: colors.textMuted }]}>
              {filtered.length} {filtered.length === 1 ? "code" : "codes"}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12,
  },
  navCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  navTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  countPill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  countPillText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  createBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
  filterBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  list: { paddingHorizontal: 20, paddingTop: 4 },
  countText: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 12 },
  card: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 20, borderWidth: 1, padding: 14, marginBottom: 12 },
  qrWrap: { borderRadius: 14, padding: 6, overflow: "hidden", flexShrink: 0 },
  cardInfo: { flex: 1, minWidth: 0, gap: 5 },
  cardTopRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  typePill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  typePillTextWhite: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
  inactivePill: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  inactivePillText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  businessName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  contentText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  metaSep: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#6B8EAE" },
  chevronWrap: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 16 },
  emptyIconWrap: { width: 88, height: 88, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  signInBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 20, marginTop: 4 },
  signInBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
});
