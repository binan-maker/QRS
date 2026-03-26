import { useState, useCallback } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "@/lib/haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import SkeletonBox from "@/components/ui/SkeletonBox";
import { useAuth } from "@/contexts/AuthContext";
import { getUserFavorites } from "@/lib/firestore-service";

interface FavoriteItem {
  id: string;
  qrCodeId: string;
  content: string;
  contentType: string;
  createdAt: string;
}

function SkeletonFavoriteCard() {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.surfaceBorder, padding: 16, marginBottom: 12 }}>
      <SkeletonBox width={56} height={56} borderRadius={16} />
      <View style={{ flex: 1, gap: 10 }}>
        <SkeletonBox width="35%" height={9} />
        <SkeletonBox width="88%" height={13} />
        <SkeletonBox width="50%" height={9} />
      </View>
    </View>
  );
}

function formatDate(iso: string) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  catch { return iso; }
}

const TYPE_CONFIG: Record<string, { icon: string; gradient: [string, string]; label: string }> = {
  url:      { icon: "link",          gradient: ["#4B8EF5", "#2E6DE0"], label: "URL" },
  payment:  { icon: "card",          gradient: ["#FBBF24", "#D97706"], label: "Payment" },
  email:    { icon: "mail",          gradient: ["#4B8EF5", "#2E6DE0"], label: "Email" },
  phone:    { icon: "call",          gradient: ["#34D399", "#059669"], label: "Phone" },
  wifi:     { icon: "wifi",          gradient: ["#4B8EF5", "#2E6DE0"], label: "WiFi" },
  location: { icon: "location",      gradient: ["#F87171", "#DC2626"], label: "Location" },
  text:     { icon: "document-text", gradient: ["#8BA7C7", "#3D5270"], label: "Text" },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.text;
}

export default function FavoritesScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBarHeight = 62 + insets.bottom + 8;

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = useCallback(async () => {
    if (!user) return;
    try { const data = await getUserFavorites(user.id); setFavorites(data as FavoriteItem[]); }
    catch {}
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useFocusEffect(useCallback(() => { setLoading(true); loadFavorites(); }, [loadFavorites]));

  function handleRefresh() { setRefreshing(true); loadFavorites(); }

  function renderItem({ item, index }: { item: FavoriteItem; index: number }) {
    const cfg = getTypeConfig(item.contentType);

    return (
      <Animated.View entering={FadeInDown.duration(380).delay(index * 50).springify()}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/qr-detail/${item.qrCodeId || item.id}` as any);
          }}
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
          <LinearGradient
            colors={[cfg.gradient[0] + (isDark ? "14" : "09"), "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />

          <LinearGradient
            colors={cfg.gradient}
            style={styles.iconBox}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={cfg.icon as any} size={24} color="#fff" />
          </LinearGradient>

          <View style={styles.cardInfo}>
            <View style={styles.cardTopRow}>
              <LinearGradient
                colors={cfg.gradient}
                style={styles.typePill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.typePillText}>{cfg.label}</Text>
              </LinearGradient>
              <View style={styles.heartBadge}>
                <Ionicons name="heart" size={10} color="#F87171" />
                <Text style={styles.heartBadgeText}>Saved</Text>
              </View>
            </View>
            <Text style={[styles.contentText, { color: colors.text }]} numberOfLines={2}>
              {item.content.length > 65 ? item.content.slice(0, 65) + "…" : item.content}
            </Text>
            <Text style={[styles.dateText, { color: colors.textMuted }]}>{formatDate(item.createdAt)}</Text>
          </View>

          <LinearGradient
            colors={cfg.gradient}
            style={styles.chevronWrap}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="chevron-forward" size={14} color="#fff" />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  const NavBar = () => (
    <View style={[styles.navBar, { paddingTop: topInset + 6 }]}>
      <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
      <View>
        <Text style={[styles.navTitle, { color: colors.text }]}>Favorites</Text>
      </View>
      <View style={{ width: 40 }} />
    </View>
  );

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NavBar />
        <View style={styles.center}>
          <LinearGradient colors={["#F87171", "#DC2626"]} style={styles.emptyIconCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="heart" size={34} color="#fff" />
          </LinearGradient>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Sign in required</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Sign in to view your favorited QR codes</Text>
          <Pressable onPress={() => router.push("/(auth)/login")} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
            <LinearGradient colors={[colors.primary, colors.primaryShade]} style={styles.signInBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
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

      {loading ? (
        <View style={{ padding: 20 }}>
          <SkeletonFavoriteCard /><SkeletonFavoriteCard /><SkeletonFavoriteCard /><SkeletonFavoriteCard />
        </View>
      ) : favorites.length === 0 ? (
        <Animated.View entering={FadeIn.duration(400)} style={styles.center}>
          <LinearGradient colors={["#F87171", "#DC2626"]} style={styles.emptyIconCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="heart" size={34} color="#fff" />
          </LinearGradient>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No favorites yet</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Tap the heart on any QR detail page to save it here
          </Text>
        </Animated.View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 20 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.danger} />}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={[styles.countBadgeText, { color: colors.textMuted }]}>
                {favorites.length} {favorites.length === 1 ? "saved code" : "saved codes"}
              </Text>
            </View>
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
    paddingHorizontal: 20, paddingBottom: 14,
  },
  navTitle: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  list: { paddingHorizontal: 20, paddingTop: 4 },
  listHeader: { marginBottom: 14 },
  countBadgeText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  card: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 12,
    overflow: "hidden",
  },
  iconBox: {
    width: 56, height: 56, borderRadius: 18,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  cardInfo: { flex: 1, minWidth: 0, gap: 6 },
  cardTopRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  typePill: { borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  typePillText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5, color: "#fff" },
  heartBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  heartBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#F87171" },
  contentText: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  dateText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  chevronWrap: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 16 },
  emptyIconCircle: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  signInBtn: { paddingHorizontal: 36, paddingVertical: 14, borderRadius: 20, marginTop: 4 },
  signInBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
});
