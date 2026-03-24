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
import Animated, { FadeInDown } from "react-native-reanimated";
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
    <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.surfaceBorder, padding: 14, marginBottom: 12, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <SkeletonBox width={64} height={64} borderRadius={12} />
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonBox width="50%" height={10} />
          <SkeletonBox width="80%" height={13} />
          <SkeletonBox width="35%" height={10} />
        </View>
      </View>
    </View>
  );
}

type Filter = "all" | "individual" | "business";

function formatDate(iso: string) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return iso; }
}

export default function MyQrCodesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBarHeight = 60 + insets.bottom;

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

  const FILTERS: { key: Filter; label: string; icon: string }[] = [
    { key: "all", label: "All", icon: "apps-outline" },
    { key: "individual", label: "Individual", icon: "person-outline" },
    { key: "business", label: "Business", icon: "storefront-outline" },
  ];

  function renderItem({ item, index }: { item: GeneratedQrItem; index: number }) {
    const isBusiness = item.qrType === "business";
    const typeColor = isBusiness ? "#FBBF24" : colors.primary;
    const typeBg = isBusiness ? "#FBBF2415" : colors.primaryDim;

    return (
      <Animated.View entering={FadeInDown.duration(350).delay(index * 40)}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/my-qr/${item.docId}` as any); }}
          style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.88 : 1 }]}
        >
          <View style={[styles.qrWrap, { backgroundColor: item.bgColor || "#F8FAFC" }]}>
            <QRCode value={item.content || "https://qrguard.app"} size={72} color={item.fgColor || "#0A0E17"} backgroundColor={item.bgColor || "#F8FAFC"} quietZone={4} ecl="L" />
          </View>

          <View style={styles.cardInfo}>
            <View style={styles.cardRow}>
              <View style={[styles.typeBadge, { backgroundColor: typeBg, borderColor: typeColor + "40" }]}>
                <Ionicons name={isBusiness ? "storefront" : "person"} size={10} color={typeColor} />
                <Text style={[styles.typeBadgeText, { color: typeColor }]}>{isBusiness ? "Business" : "Individual"}</Text>
              </View>
              {!item.isActive && (
                <View style={[styles.inactiveBadge, { backgroundColor: colors.dangerDim, borderColor: colors.danger + "40" }]}>
                  <Text style={[styles.inactiveBadgeText, { color: colors.danger }]}>OFF</Text>
                </View>
              )}
            </View>
            {item.businessName ? <Text style={[styles.businessName, { color: colors.text }]} numberOfLines={1}>{item.businessName}</Text> : null}
            <Text style={[styles.content, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.content.length > 48 ? item.content.slice(0, 48) + "…" : item.content}
            </Text>
            <View style={styles.meta}>
              <View style={styles.metaItem}>
                <Ionicons name="scan-outline" size={11} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textMuted }]}>{item.scanCount} scans</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="chatbubble-outline" size={11} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textMuted }]}>{item.commentCount}</Text>
              </View>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ alignSelf: "center" }} />
        </Pressable>
      </Animated.View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
        <View style={[styles.navBar, { borderBottomColor: colors.surfaceBorder }]}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.navTitle, { color: colors.text }]}>My QR Codes</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Sign in required</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Sign in to view your QR codes</Text>
          <Pressable onPress={() => router.push("/(auth)/login")} style={[styles.createBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.createBtnText, { color: colors.primaryText }]}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.surfaceBorder }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>My QR Codes</Text>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/qr-generator"); }}
          style={[styles.createBtn2, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}
        >
          <Ionicons name="add" size={18} color={colors.primary} />
          <Text style={[styles.createBtn2Text, { color: colors.primary }]}>Create</Text>
        </Pressable>
      </View>

      <View style={[styles.filterRow, { borderBottomColor: colors.surfaceBorder }]}>
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
            <Text style={[styles.filterBtnText, { color: colors.textMuted }, filter === f.key && { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading && qrCodes.length === 0 ? (
        <View style={{ padding: 16 }}>
          <SkeletonQrCard /><SkeletonQrCard /><SkeletonQrCard />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="qrcode-plus" size={52} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {filter === "business" ? "No business QR codes yet" : filter === "individual" ? "No individual QR codes yet" : "No QR codes yet"}
          </Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Go to QR Generator to create your first{filter === "business" ? " business" : ""} QR code
          </Text>
          <Pressable onPress={() => router.push("/(tabs)/qr-generator")} style={[styles.createBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="add" size={18} color={colors.primaryText} />
            <Text style={[styles.createBtnText, { color: colors.primaryText }]}>Create QR Code</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.docId}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 16 }]}
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
  navBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  navTitle: { fontSize: 18, fontFamily: "Inter_700Bold", flex: 1, textAlign: "center" },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  createBtn2: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  createBtn2Text: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  filterBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  list: { padding: 16, gap: 10 },
  countText: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 8 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, padding: 12 },
  qrWrap: { borderRadius: 10, padding: 6, overflow: "hidden", flexShrink: 0 },
  cardInfo: { flex: 1, minWidth: 0 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  typeBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  typeBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  inactiveBadge: { borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, borderWidth: 1 },
  inactiveBadgeText: { fontSize: 8, fontFamily: "Inter_700Bold" },
  businessName: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 2 },
  content: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16, marginBottom: 6 },
  meta: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  dateText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, marginTop: 8 },
  createBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
