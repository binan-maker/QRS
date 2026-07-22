import { View, Text, StyleSheet, Pressable, RefreshControl } from "react-native";
import { FlashList as _FlashList } from "@shopify/flash-list";
const FlashList = _FlashList as any;
import { router } from "expo-router";
import { safePush } from "@/shared/utils/navigation";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/shared/utils/platform";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import SkeletonBox from "@/shared/components/ui/SkeletonBox";
import { useFavorites, type FavoriteItem } from "./hooks/useFavorites";
import { FavoriteCard } from "./components/FavoriteCard";

function SkeletonFavoriteCard() {
  const { colors } = useTheme();
  return (
    <View style={{
      flexDirection: "row", alignItems: "center", gap: 13,
      backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1,
      borderColor: colors.surfaceBorder, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 10,
    }}>
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

export default function FavoritesScreen() {
  const { colors } = useTheme();
  const insets     = useSafeAreaInsets();
  const topInset   = useTopInset();
  const tabBarHeight = 62 + insets.bottom + 8;

  const { user, favorites, loading, refreshing, handleRefresh } = useFavorites();

  const NavBar = () => (
    <View style={[styles.navBar, { paddingTop: topInset + 6 }]}>
      <Pressable
        onPress={() => router.back()}
        style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
      >
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
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Sign in to view your favorited QR codes
          </Text>
          <Pressable
            onPress={() => safePush("/(auth)/login")}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
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
          <SkeletonFavoriteCard />
          <SkeletonFavoriteCard />
          <SkeletonFavoriteCard />
          <SkeletonFavoriteCard />
        </View>
      ) : favorites.length === 0 ? (
        <Animated.View entering={FadeIn.duration(180)} style={styles.center}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.dangerDim }]}>
            <Ionicons name="heart" size={34} color={colors.danger} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No favorites yet</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Tap the heart on any QR detail page to save it here
          </Text>
        </Animated.View>
      ) : (
        <FlashList
          data={favorites}
          keyExtractor={(item: FavoriteItem) => item.id}
          renderItem={({ item }: { item: FavoriteItem }) => <FavoriteCard item={item} />}
          estimatedItemSize={74}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 20 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.danger}
            />
          }
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
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  list:      { paddingHorizontal: 16, paddingTop: 2 },
  countText: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 12 },
  center:    { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 16 },
  emptyIconCircle: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySub:   { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  signInBtn:     { paddingHorizontal: 36, paddingVertical: 12, borderRadius: 20, marginTop: 4 },
  signInBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
});
