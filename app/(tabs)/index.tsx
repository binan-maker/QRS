import { View, Text, StyleSheet, Pressable, ScrollView, Platform, RefreshControl, Image } from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "@/lib/haptics";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { useHome } from "@/hooks/useHome";
import { detectContentType, getContentTypeIcon, truncate, formatRelativeTime } from "@/lib/utils/formatters";
import NotificationsModal from "@/features/home/components/NotificationsModal";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const {
    user, photoURL, recentScans, refreshing, onRefresh,
    notifCount, notifOpen, setNotifOpen,
    notifications, markingRead, pulseStyle,
    handleOpenNotifications, handleClearNotifications,
  } = useHome();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const styles = makeStyles(colors);

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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          <Animated.View entering={FadeInDown.duration(600)}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.greeting} numberOfLines={1} ellipsizeMode="tail">
                  {user ? `Hey, ${getFirstName(user.displayName)} 👋` : "Welcome"}
                </Text>
                <Text style={styles.tagline}>Scan smart. Stay safe.</Text>
              </View>
              <View style={styles.headerRight}>
                {user ? (
                  <Pressable onPress={handleOpenNotifications} style={styles.notifBtn} accessibilityLabel="Notifications">
                    <Ionicons
                      name={notifCount > 0 ? "notifications" : "notifications-outline"}
                      size={22}
                      color={notifCount > 0 ? colors.primary : colors.textSecondary}
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
                    <Ionicons name="log-in-outline" size={18} color={colors.primary} />
                    <Text style={styles.signInText}>Sign In</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(100)}>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/(tabs)/scanner"); }}
              style={({ pressed }) => [styles.scanCard, { opacity: pressed ? 0.92 : 1 }]}
            >
              <LinearGradient
                colors={colors.isDark
                  ? ["#0A2640", "#0A1D35"]
                  : ["#E8F4FF", "#F0F8FF"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.scanCardGradient}
              >
                <View style={styles.scanCardLeft}>
                  <Animated.View style={[styles.scanIconOuter, pulseStyle]}>
                    <LinearGradient
                      colors={colors.isDark
                        ? [colors.primary + "30", colors.primary + "15"]
                        : [colors.primary + "20", colors.primary + "08"]}
                      style={styles.scanIconInner}
                    >
                      <MaterialCommunityIcons name="qrcode-scan" size={38} color={colors.primary} />
                    </LinearGradient>
                  </Animated.View>
                  <View style={styles.scanCardTextBlock}>
                    <Text style={styles.scanCardTitle}>Scan QR Code</Text>
                    <Text style={styles.scanCardSub}>Camera or gallery · Instant analysis</Text>
                  </View>
                </View>
                <View style={styles.scanCardArrowWrap}>
                  <LinearGradient
                    colors={[colors.primary, colors.primary + "CC"]}
                    style={styles.scanCardArrow}
                  >
                    <Ionicons name="arrow-forward" size={18} color="#000" />
                  </LinearGradient>
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(200)}>
            <View style={styles.statsRow}>
              {[
                { icon: "shield-checkmark" as const, label: "Safe Scans", desc: "Verified", color: colors.safe, bg: colors.safeDim },
                { icon: "warning" as const, label: "Stay Alert", desc: "Reports", color: colors.warning, bg: colors.warningDim },
                { icon: "chatbubbles" as const, label: "Community", desc: "Reviews", color: colors.accent, bg: colors.accentDim },
              ].map((stat, idx) => (
                <View key={idx} style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: stat.bg }]}>
                    <Ionicons name={stat.icon} size={20} color={stat.color} />
                  </View>
                  <Text style={[styles.statLabel, { color: colors.text }]}>{stat.label}</Text>
                  <Text style={styles.statDesc}>{stat.desc}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {!user && (
            <Animated.View entering={FadeInDown.duration(600).delay(300)}>
              <Pressable onPress={() => router.push("/(auth)/login")} style={styles.promoCard}>
                <LinearGradient
                  colors={colors.isDark
                    ? ["rgba(167,139,250,0.12)", "rgba(0,212,255,0.08)"]
                    : ["rgba(109,40,217,0.06)", "rgba(0,119,204,0.05)"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.promoGradient}
                >
                  <View style={styles.promoContent}>
                    <View style={[styles.promoIconWrap, { backgroundColor: colors.accentDim }]}>
                      <Ionicons name="sparkles" size={20} color={colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.promoTitle}>Unlock Full Access</Text>
                      <Text style={styles.promoSub}>Sign in to comment, report, and sync history</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.duration(600).delay(400)}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.sectionTitle}>Recent Scans</Text>
              </View>
              {recentScans.length > 0 && (
                <Pressable
                  onPress={() => router.push("/(tabs)/history")}
                  style={[styles.seeAllBtn, { backgroundColor: colors.primaryDim }]}
                >
                  <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
                  <Ionicons name="arrow-forward" size={12} color={colors.primary} />
                </Pressable>
              )}
            </View>

            {recentScans.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconWrap, { backgroundColor: colors.surfaceLight }]}>
                  <Ionicons name="scan-outline" size={36} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyText}>No scans yet</Text>
                <Text style={styles.emptySubtext}>Scan a QR code to get started</Text>
              </View>
            ) : (
              <View style={styles.recentList}>
                {recentScans.map((scan, idx) => {
                  const contentType = detectContentType(scan.content);
                  const icon = getContentTypeIcon(contentType) as any;
                  const accentMap: Record<string, string> = {
                    url: colors.primary, payment: colors.accent,
                    wifi: colors.safe, phone: colors.safe,
                    email: colors.warning, location: colors.danger,
                  };
                  const accent = accentMap[contentType] ?? colors.primary;
                  const accentDim = accent + "1A";
                  return (
                    <Animated.View
                      key={scan.id}
                      entering={FadeInRight.duration(350).delay(idx * 60)}
                    >
                      <Pressable
                        onPress={() => {
                          if (scan.qrCodeId) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push({ pathname: "/qr-detail/[id]", params: { id: scan.qrCodeId } });
                          }
                        }}
                        style={({ pressed }) => [
                          styles.scanItem,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.surfaceBorder,
                            opacity: pressed ? 0.85 : 1,
                            transform: [{ scale: pressed ? 0.985 : 1 }],
                          },
                        ]}
                      >
                        <View style={[styles.scanItemAccent, { backgroundColor: accent }]} />
                        <View style={[styles.scanItemIcon, { backgroundColor: accentDim }]}>
                          <Ionicons name={icon} size={17} color={accent} />
                        </View>
                        <View style={styles.scanItemBody}>
                          <Text style={[styles.scanItemContent, { color: colors.text }]} numberOfLines={1}>
                            {truncate(scan.content, 38)}
                          </Text>
                          <View style={styles.scanItemMeta}>
                            <View style={[styles.scanItemTypeBadge, { backgroundColor: accentDim, borderColor: accent + "40" }]}>
                              <Text style={[styles.scanItemTypeText, { color: accent }]}>
                                {contentType.charAt(0).toUpperCase() + contentType.slice(1)}
                              </Text>
                            </View>
                            <Text style={[styles.scanItemDate, { color: colors.textMuted }]}>
                              {formatRelativeTime(scan.scannedAt)}
                            </Text>
                          </View>
                        </View>
                        {scan.qrCodeId ? (
                          <View style={[styles.scanItemChevron, { backgroundColor: colors.primaryDim }]}>
                            <Ionicons name="chevron-forward" size={13} color={colors.primary} />
                          </View>
                        ) : null}
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
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

function makeStyles(c: ReturnType<typeof import("@/contexts/ThemeContext").useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    scrollContent: { padding: 20 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 8 },
    headerLeft: { flex: 1, shrink: 1, minWidth: 0 } as any,
    greeting: { fontSize: 24, fontFamily: "Inter_700Bold", color: c.text, flexShrink: 1 },
    tagline: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary, marginTop: 2 },
    headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
    notifBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder,
      alignItems: "center", justifyContent: "center",
    },
    notifBadge: {
      position: "absolute", top: -2, right: -2,
      backgroundColor: c.primary, borderRadius: 8,
      minWidth: 16, height: 16, alignItems: "center", justifyContent: "center",
      paddingHorizontal: 3, borderWidth: 1.5, borderColor: c.background,
    },
    notifBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: c.primaryText, lineHeight: 14 },
    avatarCircle: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: c.primaryDim, borderWidth: 2, borderColor: c.primary,
      alignItems: "center", justifyContent: "center", overflow: "hidden",
    },
    avatarImage: { width: 44, height: 44, borderRadius: 22 },
    avatarText: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.primary },
    signInBtn: {
      flexDirection: "row", alignItems: "center", gap: 6,
      backgroundColor: c.primaryDim, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
      borderWidth: 1, borderColor: c.primary + "40",
    },
    signInText: { color: c.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    scanCard: { borderRadius: 22, overflow: "hidden", marginBottom: 20 },
    scanCardGradient: {
      padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      borderRadius: 22, borderWidth: 1, borderColor: c.primary + "30",
    },
    scanCardLeft: { flexDirection: "row", alignItems: "center", gap: 16, flex: 1 },
    scanIconOuter: {
      width: 72, height: 72, borderRadius: 20,
      alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    },
    scanIconInner: {
      width: 72, height: 72, borderRadius: 20,
      alignItems: "center", justifyContent: "center",
    },
    scanCardTextBlock: { flex: 1, minWidth: 0 },
    scanCardTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: c.text, marginBottom: 4 },
    scanCardSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary },
    scanCardArrowWrap: { marginLeft: 8 },
    scanCardArrow: {
      width: 38, height: 38, borderRadius: 19,
      alignItems: "center", justifyContent: "center",
    },
    statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
    statCard: {
      flex: 1, backgroundColor: c.surface, borderRadius: 16,
      padding: 14, alignItems: "center",
      borderWidth: 1, borderColor: c.surfaceBorder, gap: 4,
    },
    statIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    statLabel: { fontSize: 11, fontFamily: "Inter_700Bold", textAlign: "center" },
    statDesc: { fontSize: 10, fontFamily: "Inter_400Regular", color: c.textMuted, textAlign: "center" },
    promoCard: { borderRadius: 18, overflow: "hidden", marginBottom: 24 },
    promoGradient: { borderRadius: 18, borderWidth: 1, borderColor: c.accent + "25" },
    promoContent: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
    promoIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    promoTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: c.text, marginBottom: 2 },
    promoSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary, lineHeight: 16 },
    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    sectionDot: { width: 8, height: 8, borderRadius: 4 },
    sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: c.text },
    seeAllBtn: {
      flexDirection: "row", alignItems: "center", gap: 4,
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
    },
    seeAll: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
    emptyState: { alignItems: "center", paddingVertical: 44, gap: 10 },
    emptyIconWrap: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4 },
    emptyText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.textSecondary },
    emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textMuted },
    recentList: {
      gap: 8,
    },
    scanItem: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 18,
      borderWidth: 1,
      overflow: "hidden",
      paddingRight: 14,
      paddingVertical: 13,
    },
    scanItemAccent: {
      width: 3,
      alignSelf: "stretch",
      borderTopRightRadius: 3,
      borderBottomRightRadius: 3,
      marginRight: 13,
    },
    scanItemIcon: {
      width: 40, height: 40, borderRadius: 13,
      alignItems: "center", justifyContent: "center",
      marginRight: 12, flexShrink: 0,
    },
    scanItemBody: { flex: 1, minWidth: 0, gap: 5 },
    scanItemContent: { fontSize: 13.5, fontFamily: "Inter_500Medium", lineHeight: 18 },
    scanItemMeta: { flexDirection: "row", alignItems: "center", gap: 7 },
    scanItemTypeBadge: {
      paddingHorizontal: 7, paddingVertical: 2,
      borderRadius: 100, borderWidth: 1,
    },
    scanItemTypeText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.2 },
    scanItemDate: { fontSize: 10, fontFamily: "Inter_400Regular" },
    scanItemChevron: {
      width: 26, height: 26, borderRadius: 8,
      alignItems: "center", justifyContent: "center", marginLeft: 8,
    },
  });
}
