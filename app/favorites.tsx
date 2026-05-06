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
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "@/lib/haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
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
    <View style={{ flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.surfaceBorder, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 10 }}>
      <SkeletonBox width={48} height={48} borderRadius={15} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBox width="55%" height={13} borderRadius={4} />
        <SkeletonBox width="80%" height={10} borderRadius={4} />
        <SkeletonBox width="35%" height={9} borderRadius={4} />
      </View>
      <SkeletonBox width={28} height={28} borderRadius={9} />
    </View>
  );
}

function formatDate(iso: string) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  catch { return iso; }
}

function getTypeConfig(type: string, colors: any): {
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  label: string;
} {
  const map: Record<string, { icon: keyof typeof Ionicons.glyphMap; gradient: [string, string]; label: string }> = {
    url:      { icon: "globe",         gradient: [colors.primary, colors.primaryShade],     label: "URL" },
    payment:  { icon: "card",          gradient: [colors.warning, colors.warningShade],      label: "Payment" },
    email:    { icon: "mail",          gradient: [colors.primary, colors.primaryShade],      label: "Email" },
    phone:    { icon: "call",          gradient: [colors.safe, colors.safeShade],            label: "Phone" },
    wifi:     { icon: "wifi",          gradient: [colors.primary, colors.primaryShade],      label: "Wi-Fi" },
    location: { icon: "location",      gradient: [colors.danger, colors.dangerShade],        label: "Location" },
    text:     { icon: "document-text", gradient: [colors.textSecondary, colors.textMuted],   label: "Text" },
    sms:      { icon: "chatbubble",    gradient: [colors.primary, colors.primaryShade],      label: "SMS" },
    contact:  { icon: "person",        gradient: [colors.safe, colors.safeShade],            label: "Contact" },
  };
  return map[type] || { icon: "document-text", gradient: [colors.textSecondary, colors.textMuted], label: "Text" };
}

function getDisplayLabel(type: string, content: string): string {
  if (type === "url") {
    try { return new URL(content).hostname.replace("www.", ""); } catch {}
  }
  if (content.length > 40) return content.slice(0, 40) + "…";
  return content;
}

function getSubtitle(type: string, content: string): string | null {
  if (type === "url") return content.length > 52 ? content.slice(0, 52) + "…" : content;
  if (content.length > 48) return content.slice(0, 48) + "…";
  return null;
}

export default function FavoritesScreen() {
  const { colors } = useTheme();
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
    const cfg = getTypeConfig(item.contentType, colors);
    const displayLabel = getDisplayLabel(item.contentType, item.content);
    const subtitle = getSubtitle(item.contentType, item.content);

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
              borderColor: colors.danger + "35",
              opacity: pressed ? 0.88 : 1,
              transform: [{ scale: pressed ? 0.984 : 1 }],
            }
          ]}
        >
          <LinearGradient
            colors={cfg.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconBox}
          >
            <Ionicons name={cfg.icon} size={21} color="#fff" />
          </LinearGradient>

          <View style={styles.body}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1} maxFontSizeMultiplier={1}>
              {displayLabel}
            </Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1} maxFontSizeMultiplier={1}>
                {subtitle}
              </Text>
            )}
            <View style={styles.metaRow}>
              <View style={[styles.heartBadge, { backgroundColor: colors.dangerDim, borderColor: colors.danger + "40" }]}>
                <Ionicons name="heart" size={9} color={colors.danger} />
                <Text style={[styles.heartBadgeText, { color: colors.danger }]} maxFontSizeMultiplier={1}>
                  Saved
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.right}>
            <Text style={[styles.dateText, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
              {formatDate(item.createdAt)}
            </Text>
            <View style={[styles.chevronWrap, { backgroundColor: cfg.gradient[0] + "18" }]}>
              <Ionicons name="chevron-forward" size={13} color={cfg.gradient[0]} />
            </View>
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
      <Text style={[styles.navTitle, { color: colors.text }]}>Favorites</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NavBar />
        <View style={styles.center}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.dangerDim }]}>
            <Ionicons name="heart" size={34} color={colors.danger} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Sign in required</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Sign in to view your favorited QR codes</Text>
          <Pressable onPress={() => router.push("/(auth)/login")} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
            <View style={[styles.signInBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.signInBtnText}>Sign In</Text>
            </View>
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
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.dangerDim }]}>
            <Ionicons name="heart" size={34} color={colors.danger} />
          </View>
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
            <Text style={[styles.countText, { color: colors.textMuted }]}>
              {favorites.length} {favorites.length === 1 ? "saved code" : "saved codes"}
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
    paddingHorizontal: 20, paddingBottom: 14,
  },
  navTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.4 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  list: { paddingHorizontal: 16, paddingTop: 2 },
  countText: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 13,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  body: { flex: 1, minWidth: 0, gap: 4 },
  title: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1 },
  heartBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 6, paddingVertical: 2.5,
    borderRadius: 100, borderWidth: 1,
  },
  heartBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.2 },
  right: { alignItems: "flex-end", gap: 8, flexShrink: 0 },
  dateText: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.1 },
  chevronWrap: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 16 },
  emptyIconCircle: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  signInBtn: { paddingHorizontal: 36, paddingVertical: 12, borderRadius: 20, marginTop: 4 },
  signInBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
});
