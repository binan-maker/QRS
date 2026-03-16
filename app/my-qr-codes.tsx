import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  RefreshControl,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import QRCode from "react-native-qrcode-svg";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserGeneratedQrs,
  type GeneratedQrItem,
} from "@/lib/firestore-service";

function SkeletonBox({ width, height = 12, borderRadius = 8, style }: { width?: any; height?: number; borderRadius?: number; style?: any }) {
  const shimmer = useSharedValue(0.3);
  useEffect(() => {
    shimmer.value = withRepeat(withSequence(withTiming(1, { duration: 750 }), withTiming(0.3, { duration: 750 })), -1, true);
  }, []);
  const anim = useAnimatedStyle(() => ({ opacity: shimmer.value }));
  return <Animated.View style={[{ width: width || "100%", height, borderRadius, backgroundColor: Colors.dark.surfaceLight }, anim, style]} />;
}

function SkeletonQrCard() {
  return (
    <View style={{ backgroundColor: Colors.dark.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.dark.surfaceBorder, padding: 14, marginBottom: 12, gap: 12 }}>
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

const CACHE_TTL_MS = 5 * 60 * 1000;
const qrCache: { [userId: string]: { data: GeneratedQrItem[]; ts: number } } = {};

function formatDate(iso: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function MyQrCodesScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBarHeight = 60 + insets.bottom;

  const [qrCodes, setQrCodes] = useState<GeneratedQrItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const loadQrCodes = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    const cached = qrCache[user.id];
    if (!forceRefresh && cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      setQrCodes(cached.data);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await getUserGeneratedQrs(user.id);
      qrCache[user.id] = { data, ts: Date.now() };
      setQrCodes(data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadQrCodes(true);
    }, [loadQrCodes])
  );

  function handleRefresh() {
    setRefreshing(true);
    loadQrCodes(true);
  }

  const filtered = qrCodes.filter((qr) => {
    if (filter === "individual") return qr.qrType === "individual" && qr.branded;
    if (filter === "business") return qr.qrType === "business";
    return qr.branded;
  });

  const FILTERS: { key: Filter; label: string; icon: string }[] = [
    { key: "all", label: "All", icon: "apps-outline" },
    { key: "individual", label: "Individual", icon: "person-outline" },
    { key: "business", label: "Business", icon: "storefront-outline" },
  ];

  function renderItem({ item, index }: { item: GeneratedQrItem; index: number }) {
    const isBusiness = item.qrType === "business";
    const typeColor = isBusiness ? "#FBBF24" : Colors.dark.primary;
    const typeBg = isBusiness ? "#FBBF2415" : Colors.dark.primaryDim;

    return (
      <Animated.View entering={FadeInDown.duration(350).delay(index * 40)}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/my-qr/${item.docId}` as any);
          }}
          style={({ pressed }) => [styles.card, { opacity: pressed ? 0.88 : 1 }]}
        >
          <View style={[styles.qrWrap, { backgroundColor: item.bgColor || "#F8FAFC" }]}>
            <QRCode
              value={item.content || "https://qrguard.app"}
              size={72}
              color={item.fgColor || "#0A0E17"}
              backgroundColor={item.bgColor || "#F8FAFC"}
              quietZone={4}
              ecl="L"
            />
          </View>

          <View style={styles.cardInfo}>
            <View style={styles.cardRow}>
              <View style={[styles.typeBadge, { backgroundColor: typeBg, borderColor: typeColor + "40" }]}>
                <Ionicons
                  name={isBusiness ? "storefront" : "person"}
                  size={10}
                  color={typeColor}
                />
                <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                  {isBusiness ? "Business" : "Individual"}
                </Text>
              </View>
              {!item.isActive && (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveBadgeText}>OFF</Text>
                </View>
              )}
            </View>

            {item.businessName ? (
              <Text style={styles.businessName} numberOfLines={1}>{item.businessName}</Text>
            ) : null}

            <Text style={styles.content} numberOfLines={2}>
              {item.content.length > 48 ? item.content.slice(0, 48) + "…" : item.content}
            </Text>

            <View style={styles.meta}>
              <View style={styles.metaItem}>
                <Ionicons name="scan-outline" size={11} color={Colors.dark.textMuted} />
                <Text style={styles.metaText}>{item.scanCount} scans</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="chatbubble-outline" size={11} color={Colors.dark.textMuted} />
                <Text style={styles.metaText}>{item.commentCount}</Text>
              </View>
              {item.createdAt ? (
                <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
              ) : null}
            </View>
          </View>

          <Ionicons name="chevron-forward" size={16} color={Colors.dark.textMuted} style={{ alignSelf: "center" }} />
        </Pressable>
      </Animated.View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.navBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
          </Pressable>
          <Text style={styles.navTitle}>My QR Codes</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Sign in required</Text>
          <Text style={styles.emptySub}>Sign in to view your QR codes</Text>
          <Pressable onPress={() => router.push("/(auth)/login")} style={styles.createBtn}>
            <Text style={styles.createBtnText}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.navTitle}>My QR Codes</Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(tabs)/qr-generator");
          }}
          style={styles.createBtn2}
        >
          <Ionicons name="add" size={18} color={Colors.dark.primary} />
          <Text style={styles.createBtn2Text}>Create</Text>
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => {
              setFilter(f.key);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
          >
            <Ionicons
              name={f.icon as any}
              size={13}
              color={filter === f.key ? Colors.dark.primary : Colors.dark.textMuted}
            />
            <Text style={[styles.filterBtnText, filter === f.key && styles.filterBtnTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ padding: 16 }}>
          <SkeletonQrCard />
          <SkeletonQrCard />
          <SkeletonQrCard />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="qrcode-plus" size={52} color={Colors.dark.textMuted} />
          <Text style={styles.emptyTitle}>
            {filter === "business" ? "No business QR codes yet" :
             filter === "individual" ? "No individual QR codes yet" :
             "No QR codes yet"}
          </Text>
          <Text style={styles.emptySub}>
            Go to QR Generator to create your first{filter === "business" ? " business" : ""} QR code
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/qr-generator")}
            style={styles.createBtn}
          >
            <Ionicons name="add" size={18} color="#000" />
            <Text style={styles.createBtnText}>Create QR Code</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.docId}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 16 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.dark.primary}
            />
          }
          ListHeaderComponent={
            <Text style={styles.countText}>
              {filtered.length} {filtered.length === 1 ? "code" : "codes"}
            </Text>
          }
        />
      )}
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
  createBtn2: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.dark.primaryDim, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.dark.primary + "40",
  },
  createBtn2Text: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },

  filterRow: {
    flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder,
  },
  filterBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  filterBtnActive: {
    backgroundColor: Colors.dark.primaryDim,
    borderColor: Colors.dark.primary + "50",
  },
  filterBtnText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted },
  filterBtnTextActive: { color: Colors.dark.primary, fontFamily: "Inter_600SemiBold" },

  list: { padding: 16, gap: 10 },
  countText: {
    fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted,
    marginBottom: 8,
  },

  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.dark.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    padding: 12,
  },
  qrWrap: { borderRadius: 10, padding: 6, overflow: "hidden", flexShrink: 0 },
  cardInfo: { flex: 1, minWidth: 0 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  typeBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1,
  },
  typeBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  inactiveBadge: {
    backgroundColor: Colors.dark.dangerDim, borderRadius: 4,
    paddingHorizontal: 4, paddingVertical: 1,
    borderWidth: 1, borderColor: Colors.dark.danger + "40",
  },
  inactiveBadgeText: { fontSize: 8, fontFamily: "Inter_700Bold", color: Colors.dark.danger },
  businessName: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.dark.text, marginBottom: 2 },
  content: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary, lineHeight: 16, marginBottom: 6,
  },
  meta: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },
  dateText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.dark.text, textAlign: "center" },
  emptySub: {
    fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary,
    textAlign: "center", lineHeight: 18,
  },
  createBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dark.primary, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 16, marginTop: 8,
  },
  createBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#000" },
});
