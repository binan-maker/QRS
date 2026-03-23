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
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
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
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.surfaceBorder, padding: 14, marginBottom: 10 }}>
      <SkeletonBox width={52} height={52} borderRadius={14} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBox width="40%" height={10} />
        <SkeletonBox width="85%" height={12} />
        <SkeletonBox width="55%" height={10} />
      </View>
    </View>
  );
}

function formatDate(iso: string) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return iso; }
}

function getContentTypeIcon(type: string): string {
  switch (type) {
    case "url": return "link-outline";
    case "payment": return "card-outline";
    case "email": return "mail-outline";
    case "phone": return "call-outline";
    case "wifi": return "wifi-outline";
    case "location": return "location-outline";
    default: return "document-text-outline";
  }
}

export default function FavoritesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBarHeight = 60 + insets.bottom;

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  function getContentTypeColor(type: string): string {
    switch (type) {
      case "url": return colors.primary;
      case "payment": return "#FBBF24";
      case "email": return colors.accent;
      case "phone": return colors.safe;
      case "wifi": return "#60A5FA";
      case "location": return "#F87171";
      default: return colors.textMuted;
    }
  }

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
    const typeColor = getContentTypeColor(item.contentType);
    const icon = getContentTypeIcon(item.contentType);

    return (
      <Animated.View entering={FadeInDown.duration(350).delay(index * 40)}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/qr-detail/${item.qrCodeId || item.id}` as any); }}
          style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.88 : 1 }]}
        >
          <View style={[styles.iconBox, { backgroundColor: typeColor + "18" }]}>
            <Ionicons name={icon as any} size={24} color={typeColor} />
          </View>
          <View style={styles.cardInfo}>
            <View style={styles.cardRow}>
              <View style={[styles.typeBadge, { backgroundColor: typeColor + "18", borderColor: typeColor + "40" }]}>
                <Text style={[styles.typeBadgeText, { color: typeColor }]}>{item.contentType.toUpperCase()}</Text>
              </View>
              <Ionicons name="heart" size={13} color={colors.danger} />
            </View>
            <Text style={[styles.content, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.content.length > 60 ? item.content.slice(0, 60) + "…" : item.content}
            </Text>
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
          <Text style={[styles.navTitle, { color: colors.text }]}>Favorite QR Codes</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="heart-outline" size={52} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Sign in required</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Sign in to view your favorited QR codes</Text>
          <Pressable onPress={() => router.push("/(auth)/login")} style={[styles.signInBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.signInBtnText, { color: colors.primaryText }]}>Sign In</Text>
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
        <Text style={[styles.navTitle, { color: colors.text }]}>Favorite QR Codes</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={{ padding: 16 }}>
          <SkeletonFavoriteCard /><SkeletonFavoriteCard /><SkeletonFavoriteCard /><SkeletonFavoriteCard />
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Ionicons name="heart-outline" size={40} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No favorites yet</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Tap the heart icon on any QR code detail page to save it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 16 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.danger} />}
          ListHeaderComponent={
            <Text style={[styles.countText, { color: colors.textMuted }]}>
              {favorites.length} favorited {favorites.length === 1 ? "code" : "codes"}
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
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  navTitle: { fontSize: 18, fontFamily: "Inter_700Bold", flex: 1, textAlign: "center" },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  list: { padding: 16, gap: 10 },
  countText: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 8 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 16, borderWidth: 1, padding: 14,
  },
  iconBox: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardInfo: { flex: 1, minWidth: 0 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  typeBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  typeBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  content: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 6 },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  signInBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16, marginTop: 8 },
  signInBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
