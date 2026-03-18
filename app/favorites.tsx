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
import Colors from "@/constants/colors";
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
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.dark.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.dark.surfaceBorder, padding: 14, marginBottom: 10 }}>
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

function getContentTypeColor(type: string): string {
  switch (type) {
    case "url": return Colors.dark.primary;
    case "payment": return "#FBBF24";
    case "email": return Colors.dark.accent;
    case "phone": return Colors.dark.safe;
    case "wifi": return "#60A5FA";
    case "location": return "#F87171";
    default: return Colors.dark.textMuted;
  }
}

export default function FavoritesScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBarHeight = 60 + insets.bottom;

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    try {
      const data = await getUserFavorites(user.id);
      setFavorites(data as FavoriteItem[]);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadFavorites(true);
    }, [loadFavorites])
  );

  function handleRefresh() {
    setRefreshing(true);
    loadFavorites(true);
  }

  function renderItem({ item, index }: { item: FavoriteItem; index: number }) {
    const typeColor = getContentTypeColor(item.contentType);
    const icon = getContentTypeIcon(item.contentType);

    return (
      <Animated.View entering={FadeInDown.duration(350).delay(index * 40)}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/qr-detail/${item.qrCodeId || item.id}` as any);
          }}
          style={({ pressed }) => [styles.card, { opacity: pressed ? 0.88 : 1 }]}
        >
          <View style={[styles.iconBox, { backgroundColor: typeColor + "18" }]}>
            <Ionicons name={icon as any} size={24} color={typeColor} />
          </View>

          <View style={styles.cardInfo}>
            <View style={styles.cardRow}>
              <View style={[styles.typeBadge, { backgroundColor: typeColor + "18", borderColor: typeColor + "40" }]}>
                <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                  {item.contentType.toUpperCase()}
                </Text>
              </View>
              <Ionicons name="heart" size={13} color={Colors.dark.danger} />
            </View>

            <Text style={styles.content} numberOfLines={2}>
              {item.content.length > 60 ? item.content.slice(0, 60) + "…" : item.content}
            </Text>

            <View style={styles.meta}>
              <Ionicons name="time-outline" size={11} color={Colors.dark.textMuted} />
              <Text style={styles.metaText}>Saved {formatDate(item.createdAt)}</Text>
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
          <Text style={styles.navTitle}>Favorite QR Codes</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="heart-outline" size={52} color={Colors.dark.textMuted} />
          <Text style={styles.emptyTitle}>Sign in required</Text>
          <Text style={styles.emptySub}>Sign in to view your favorited QR codes</Text>
          <Pressable onPress={() => router.push("/(auth)/login")} style={styles.signInBtn}>
            <Text style={styles.signInBtnText}>Sign In</Text>
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
        <Text style={styles.navTitle}>Favorite QR Codes</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={{ padding: 16 }}>
          <SkeletonFavoriteCard />
          <SkeletonFavoriteCard />
          <SkeletonFavoriteCard />
          <SkeletonFavoriteCard />
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="heart-outline" size={40} color={Colors.dark.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptySub}>
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.dark.danger}
            />
          }
          ListHeaderComponent={
            <Text style={styles.countText}>
              {favorites.length} favorited {favorites.length === 1 ? "code" : "codes"}
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

  list: { padding: 16, gap: 10 },
  countText: {
    fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted,
    marginBottom: 8,
  },

  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.dark.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    padding: 14,
  },
  iconBox: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  cardInfo: { flex: 1, minWidth: 0 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  typeBadge: {
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1,
  },
  typeBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  content: {
    fontSize: 13, fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary, lineHeight: 18, marginBottom: 6,
  },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.dark.surface, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder, marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.dark.text, textAlign: "center" },
  emptySub: {
    fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary,
    textAlign: "center", lineHeight: 18,
  },
  signInBtn: {
    backgroundColor: Colors.dark.primary, paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 16, marginTop: 8,
  },
  signInBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#000" },
});
