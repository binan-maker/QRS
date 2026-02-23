import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

interface LocalScan {
  id: string;
  content: string;
  contentType: string;
  scannedAt: string;
  qrCodeId?: string;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [recentScans, setRecentScans] = useState<LocalScan[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const scanPulse = useSharedValue(1);

  useEffect(() => {
    scanPulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1200 }),
        withTiming(1, { duration: 1200 })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scanPulse.value }],
  }));

  const loadRecentScans = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem("local_scan_history");
      if (stored) {
        const all: LocalScan[] = JSON.parse(stored);
        setRecentScans(all.slice(0, 5));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadRecentScans();
  }, [loadRecentScans]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecentScans();
    setRefreshing(false);
  }, [loadRecentScans]);

  function getContentIcon(type: string) {
    switch (type) {
      case "url":
        return "link";
      case "phone":
        return "call";
      case "email":
        return "mail";
      case "wifi":
        return "wifi";
      case "location":
        return "location";
      default:
        return "document-text";
    }
  }

  function truncate(s: string, max: number) {
    return s.length > max ? s.slice(0, max) + "..." : s;
  }

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.dark.primary}
          />
        }
      >
        <Animated.View entering={FadeInDown.duration(600)}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>
                {user ? `Hey, ${user.displayName}` : "Welcome"}
              </Text>
              <Text style={styles.tagline}>Scan smart. Stay safe.</Text>
            </View>
            {user ? (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {user.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/(auth)/login");
                }}
                style={styles.signInBtn}
              >
                <Ionicons name="log-in-outline" size={18} color={Colors.dark.primary} />
                <Text style={styles.signInText}>Sign In</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(100)}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/(tabs)/scanner");
            }}
            style={({ pressed }) => [
              styles.scanCard,
              { opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <LinearGradient
              colors={["rgba(0, 212, 255, 0.12)", "rgba(124, 58, 237, 0.08)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.scanCardGradient}
            >
              <Animated.View style={[styles.scanIconOuter, pulseStyle]}>
                <View style={styles.scanIconInner}>
                  <MaterialCommunityIcons
                    name="qrcode-scan"
                    size={40}
                    color={Colors.dark.primary}
                  />
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

        {!user ? (
          <Animated.View entering={FadeInDown.duration(600).delay(300)}>
            <Pressable
              onPress={() => router.push("/(auth)/login")}
              style={styles.promoCard}
            >
              <LinearGradient
                colors={["rgba(124, 58, 237, 0.15)", "rgba(0, 212, 255, 0.1)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.promoGradient}
              >
                <View style={styles.promoContent}>
                  <Ionicons name="sparkles" size={24} color={Colors.dark.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.promoTitle}>Unlock Full Access</Text>
                    <Text style={styles.promoSub}>
                      Sign in to comment, report QR codes, and sync history across devices
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.dark.textMuted} />
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.duration(600).delay(400)}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Scans</Text>
            {recentScans.length > 0 ? (
              <Pressable onPress={() => router.push("/(tabs)/history")}>
                <Text style={styles.seeAll}>See All</Text>
              </Pressable>
            ) : null}
          </View>

          {recentScans.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="scan-outline" size={40} color={Colors.dark.textMuted} />
              <Text style={styles.emptyText}>No scans yet</Text>
              <Text style={styles.emptySubtext}>
                Scan a QR code to see it here
              </Text>
            </View>
          ) : (
            recentScans.map((scan, i) => (
              <Pressable
                key={scan.id}
                onPress={() => {
                  if (scan.qrCodeId) {
                    router.push({
                      pathname: "/qr-detail/[id]",
                      params: { id: scan.qrCodeId },
                    });
                  }
                }}
                style={({ pressed }) => [
                  styles.scanItem,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <View
                  style={[styles.scanItemIcon, { backgroundColor: Colors.dark.primaryDim }]}
                >
                  <Ionicons
                    name={getContentIcon(scan.contentType) as any}
                    size={20}
                    color={Colors.dark.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.scanItemContent} numberOfLines={1}>
                    {truncate(scan.content, 40)}
                  </Text>
                  <Text style={styles.scanItemDate}>
                    {new Date(scan.scannedAt).toLocaleDateString()}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={Colors.dark.textMuted}
                />
              </Pressable>
            ))
          )}
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
  },
  tagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.primaryDim,
    borderWidth: 2,
    borderColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.primary,
  },
  signInBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.dark.primaryDim,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  signInText: {
    color: Colors.dark.primary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  scanCard: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
  },
  scanCardGradient: {
    padding: 28,
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 212, 255, 0.15)",
  },
  scanIconOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(0, 212, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  scanIconInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.dark.primaryDim,
    alignItems: "center",
    justifyContent: "center",
  },
  scanCardTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
    marginBottom: 4,
  },
  scanCardSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
  },
  scanCardArrow: {
    position: "absolute",
    right: 20,
    top: "50%",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  statDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
  promoCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
  },
  promoGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.2)",
  },
  promoContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
  },
  promoTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  promoSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
  },
  seeAll: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.primary,
  },
  emptyState: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 40,
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
  scanItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
  },
  scanItemIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  scanItemContent: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.text,
  },
  scanItemDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
});
