import { View, Text, StyleSheet, Pressable, ScrollView, Platform, RefreshControl, Image } from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useHome } from "@/hooks/useHome";
import { detectContentType, getContentTypeIcon, truncate, formatRelativeTime } from "@/lib/utils/formatters";
import NotificationsModal from "@/features/home/components/NotificationsModal";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const {
    user, photoURL, recentScans, refreshing, onRefresh,
    notifCount, notifOpen, setNotifOpen,
    notifications, markingRead, pulseStyle,
    handleOpenNotifications, handleClearNotifications,
  } = useHome();

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  function getFirstName(name: string) {
    return name ? name.trim().split(/\s+/)[0] : "";
  }

  return (
    <>
      <View style={[styles.container, { paddingTop: topInset }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.primary} />
          }
        >
          <Animated.View entering={FadeInDown.duration(600)}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.greeting} numberOfLines={1} ellipsizeMode="tail">
                  {user ? `Hey, ${getFirstName(user.displayName)}` : "Welcome"}
                </Text>
                <Text style={styles.tagline}>Scan smart. Stay safe.</Text>
              </View>
              <View style={styles.headerRight}>
                {user ? (
                  <Pressable onPress={handleOpenNotifications} style={styles.notifBtn} accessibilityLabel="Notifications">
                    <Ionicons
                      name={notifCount > 0 ? "notifications" : "notifications-outline"}
                      size={22}
                      color={notifCount > 0 ? Colors.dark.primary : Colors.dark.textSecondary}
                    />
                    {notifCount > 0 && (
                      <View style={styles.notifBadge}>
                        <Text style={styles.notifBadgeText}>{notifCount > 99 ? "99+" : notifCount}</Text>
                      </View>
                    )}
                  </Pressable>
                ) : null}
                {user ? (
                  <Pressable onPress={() => router.push("/(tabs)/profile")} style={styles.avatarCircle}>
                    {photoURL ? (
                      <Image source={{ uri: photoURL }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarText}>{user.displayName.charAt(0).toUpperCase()}</Text>
                    )}
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(auth)/login"); }}
                    style={styles.signInBtn}
                  >
                    <Ionicons name="log-in-outline" size={18} color={Colors.dark.primary} />
                    <Text style={styles.signInText}>Sign In</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(100)}>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/(tabs)/scanner"); }}
              style={({ pressed }) => [styles.scanCard, { opacity: pressed ? 0.9 : 1 }]}
            >
              <LinearGradient
                colors={["rgba(0, 212, 255, 0.12)", "rgba(124, 58, 237, 0.08)"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.scanCardGradient}
              >
                <Animated.View style={[styles.scanIconOuter, pulseStyle]}>
                  <View style={styles.scanIconInner}>
                    <MaterialCommunityIcons name="qrcode-scan" size={40} color={Colors.dark.primary} />
                  </View>
                </Animated.View>
                <Text style={styles.scanCardTitle}>Tap to Scan QR Code</Text>
                <Text style={styles.scanCardSub}>Camera or gallery supported</Text>
                <View style={styles.scanCardArrow}>
                  <Ionicons name="arrow-forward" size={20} color={Colors.dark.primary} />
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(200)}>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: Colors.dark.safeDim }]}>
                  <Ionicons name="shield-checkmark" size={22} color={Colors.dark.safe} />
                </View>
                <Text style={styles.statLabel}>Safe Scans</Text>
                <Text style={styles.statDesc}>Verified codes</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: Colors.dark.dangerDim }]}>
                  <Ionicons name="warning" size={22} color={Colors.dark.danger} />
                </View>
                <Text style={styles.statLabel}>Stay Alert</Text>
                <Text style={styles.statDesc}>Check reports</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: Colors.dark.accentDim }]}>
                  <Ionicons name="chatbubbles" size={22} color={Colors.dark.accent} />
                </View>
                <Text style={styles.statLabel}>Community</Text>
                <Text style={styles.statDesc}>Read reviews</Text>
              </View>
            </View>
          </Animated.View>

          {!user && (
            <Animated.View entering={FadeInDown.duration(600).delay(300)}>
              <Pressable onPress={() => router.push("/(auth)/login")} style={styles.promoCard}>
                <LinearGradient
                  colors={["rgba(124, 58, 237, 0.15)", "rgba(0, 212, 255, 0.1)"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.promoGradient}
                >
                  <View style={styles.promoContent}>
                    <Ionicons name="sparkles" size={24} color={Colors.dark.accent} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.promoTitle}>Unlock Full Access</Text>
                      <Text style={styles.promoSub}>Sign in to comment, report QR codes, and sync history across devices</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.dark.textMuted} />
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.duration(600).delay(400)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Scans</Text>
              {recentScans.length > 0 && (
                <Pressable onPress={() => router.push("/(tabs)/history")}>
                  <Text style={styles.seeAll}>See All</Text>
                </Pressable>
              )}
            </View>

            {recentScans.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="scan-outline" size={40} color={Colors.dark.textMuted} />
                <Text style={styles.emptyText}>No scans yet</Text>
                <Text style={styles.emptySubtext}>Scan a QR code to see it here</Text>
              </View>
            ) : (
              recentScans.map((scan) => (
                <Pressable
                  key={scan.id}
                  onPress={() => {
                    if (scan.qrCodeId) router.push({ pathname: "/qr-detail/[id]", params: { id: scan.qrCodeId } });
                  }}
                  style={({ pressed }) => [styles.scanItem, { opacity: pressed ? 0.8 : 1 }]}
                >
                  <View style={[styles.scanItemIcon, { backgroundColor: Colors.dark.primaryDim }]}>
                    <Ionicons
                      name={getContentTypeIcon(detectContentType(scan.content)) as any}
                      size={20}
                      color={Colors.dark.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scanItemContent} numberOfLines={1}>{truncate(scan.content, 40)}</Text>
                    <Text style={styles.scanItemDate}>{new Date(scan.scannedAt).toLocaleDateString()}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.dark.textMuted} />
                </Pressable>
              ))
            )}
          </Animated.View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      <NotificationsModal
        visible={notifOpen}
        notifications={notifications}
        markingRead={markingRead}
        onClose={() => setNotifOpen(false)}
        onClearAll={handleClearNotifications}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  scrollContent: { padding: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 8 },
  headerLeft: { flex: 1, flexShrink: 1, minWidth: 0 },
  greeting: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.dark.text, flexShrink: 1 },
  tagline: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  notifBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
    alignItems: "center", justifyContent: "center",
  },
  notifBadge: {
    position: "absolute", top: -2, right: -2,
    backgroundColor: Colors.dark.primary, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: Colors.dark.background,
  },
  notifBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#000", lineHeight: 14 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.dark.primaryDim, borderWidth: 2, borderColor: Colors.dark.primary,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  avatarImage: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.dark.primary },
  signInBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.dark.primaryDim, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
  },
  signInText: { color: Colors.dark.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  scanCard: { borderRadius: 20, overflow: "hidden", marginBottom: 20 },
  scanCardGradient: {
    padding: 28, alignItems: "center", borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(0, 212, 255, 0.15)",
  },
  scanIconOuter: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: "rgba(0, 212, 255, 0.1)",
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  scanIconInner: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: Colors.dark.primaryDim,
    alignItems: "center", justifyContent: "center",
  },
  scanCardTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.dark.text, marginBottom: 4 },
  scanCardSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary },
  scanCardArrow: { position: "absolute", right: 20, top: "50%" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: Colors.dark.surface, borderRadius: 16,
    padding: 14, alignItems: "center",
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  statIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary, textAlign: "center" },
  statDesc: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, textAlign: "center", marginTop: 2 },
  promoCard: { borderRadius: 16, overflow: "hidden", marginBottom: 24 },
  promoGradient: { borderRadius: 16, borderWidth: 1, borderColor: "rgba(124, 58, 237, 0.2)" },
  promoContent: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  promoTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.dark.text, marginBottom: 2 },
  promoSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, lineHeight: 17 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  seeAll: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },
  scanItem: {
    flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder,
  },
  scanItemIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  scanItemContent: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.dark.text, marginBottom: 2 },
  scanItemDate: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },
});
