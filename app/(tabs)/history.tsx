import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { getUserScansPaginated, getUserFavorites } from "@/lib/firestore-service";
import {
  parseAnyPaymentQr,
  analyzeAnyPaymentQr,
  analyzeUrlHeuristics,
} from "@/lib/qr-analysis";
import { DocumentSnapshot } from "firebase/firestore";

interface HistoryItem {
  id: string;
  content: string;
  contentType: string;
  scannedAt: string;
  qrCodeId?: string;
  source: "local" | "cloud" | "favorite";
}

type Filter = "all" | "url" | "text" | "payment" | "other" | "favorites";
type RiskLevel = "safe" | "caution" | "dangerous";

const PAGE_SIZE = 20;

export default function HistoryScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [localHistory, setLocalHistory] = useState<HistoryItem[]>([]);
  const [cloudHistory, setCloudHistory] = useState<HistoryItem[]>([]);
  const [favorites, setFavorites] = useState<HistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cloudHasMore, setCloudHasMore] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const cloudLastDocRef = useRef<DocumentSnapshot | null>(null);
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  // Merge local + cloud, dedup by qrCodeId, sort by date
  const history = useMemo<HistoryItem[]>(() => {
    const merged: HistoryItem[] = [...localHistory];
    for (const c of cloudHistory) {
      if (!merged.find((i) => i.qrCodeId && i.qrCodeId === c.qrCodeId)) {
        merged.push(c);
      }
    }
    return merged.sort(
      (a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
    );
  }, [localHistory, cloudHistory]);

  const loadLocalHistory = useCallback(async (userId?: string | null) => {
    try {
      if (!userId) {
        setLocalHistory([]);
        return;
      }
      const stored = await AsyncStorage.getItem(`local_scan_history_${userId}`);
      if (stored) {
        const local: any[] = JSON.parse(stored);
        setLocalHistory(local.map((s) => ({ ...s, source: "local" as const })));
      } else {
        setLocalHistory([]);
      }
    } catch {
      setLocalHistory([]);
    }
  }, []);

  const loadInitialCloudHistory = useCallback(async (userId: string) => {
    try {
      const result = await getUserScansPaginated(userId, PAGE_SIZE);
      cloudLastDocRef.current = result.lastDoc;
      setCloudHasMore(result.hasMore);
      setCloudHistory(
        result.items.map((s) => ({
          id: s.id,
          content: s.content,
          contentType: s.contentType,
          scannedAt: s.scannedAt,
          qrCodeId: s.qrCodeId,
          source: "cloud" as const,
        }))
      );
    } catch {
      setCloudHistory([]);
    }
  }, []);

  const loadMoreCloudHistory = useCallback(async () => {
    if (!user || loadingMore || !cloudHasMore) return;
    setLoadingMore(true);
    try {
      const result = await getUserScansPaginated(
        user.id,
        PAGE_SIZE,
        cloudLastDocRef.current ?? undefined
      );
      cloudLastDocRef.current = result.lastDoc;
      setCloudHasMore(result.hasMore);
      setCloudHistory((prev) => [
        ...prev,
        ...result.items.map((s) => ({
          id: s.id,
          content: s.content,
          contentType: s.contentType,
          scannedAt: s.scannedAt,
          qrCodeId: s.qrCodeId,
          source: "cloud" as const,
        })),
      ]);
    } catch {}
    setLoadingMore(false);
  }, [user, loadingMore, cloudHasMore]);

  const loadFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      return;
    }
    try {
      const favs = await getUserFavorites(user.id);
      setFavorites(
        favs.map((f: any) => ({
          id: f.id,
          content: f.content || f.qrCodeId,
          contentType: f.contentType || "text",
          scannedAt: f.createdAt,
          qrCodeId: f.qrCodeId,
          source: "favorite" as const,
        }))
      );
    } catch {}
  }, [user]);

  // Reset and reload when user changes (including sign-out / sign-in with new account)
  useEffect(() => {
    const currentUserId = user?.id ?? null;
    if (prevUserIdRef.current !== currentUserId) {
      prevUserIdRef.current = currentUserId;
      // Clear cloud data immediately when user changes
      setCloudHistory([]);
      setFavorites([]);
      setLocalHistory([]);
      cloudLastDocRef.current = null;
      setCloudHasMore(false);
    }

    loadLocalHistory(currentUserId);

    if (user) {
      loadInitialCloudHistory(user.id);
      loadFavorites();
    }
  }, [user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    cloudLastDocRef.current = null;
    setCloudHasMore(false);
    setCloudHistory([]);

    await loadLocalHistory(user?.id);
    if (user) {
      await loadInitialCloudHistory(user.id);
      await loadFavorites();
    }
    setRefreshing(false);
  }, [user, loadLocalHistory, loadInitialCloudHistory, loadFavorites]);

  async function clearLocalHistory() {
    Alert.alert(
      "Clear History",
      "This will remove all locally stored scan history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            if (user?.id) {
              await AsyncStorage.removeItem(`local_scan_history_${user.id}`);
            }
            setLocalHistory([]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }

  function getContentIcon(type: string) {
    switch (type) {
      case "url": return "link";
      case "phone": return "call";
      case "email": return "mail";
      case "wifi": return "wifi";
      case "location": return "location";
      case "payment": return "card";
      default: return "document-text";
    }
  }

  const safetyRiskMap = useMemo<Map<string, RiskLevel>>(() => {
    const map = new Map<string, RiskLevel>();
    const allItems = [...history, ...favorites];
    for (const item of allItems) {
      if (item.contentType === "url") {
        try {
          const result = analyzeUrlHeuristics(item.content);
          map.set(item.id, result.riskLevel as RiskLevel);
        } catch {
          map.set(item.id, "safe");
        }
      } else if (item.contentType === "payment") {
        try {
          const parsed = parseAnyPaymentQr(item.content);
          if (parsed) {
            const result = analyzeAnyPaymentQr(parsed);
            map.set(item.id, result.riskLevel as RiskLevel);
          } else {
            map.set(item.id, "safe");
          }
        } catch {
          map.set(item.id, "safe");
        }
      } else {
        map.set(item.id, "safe");
      }
    }
    return map;
  }, [history, favorites]);

  const displayItems: HistoryItem[] = filter === "favorites"
    ? favorites
    : history.filter((item) => {
        if (filter === "all") return true;
        if (filter === "url") return item.contentType === "url";
        if (filter === "text") return item.contentType === "text";
        if (filter === "payment") return item.contentType === "payment";
        return !["url", "text", "payment"].includes(item.contentType);
      });

  function formatDate(d: string) {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "url", label: "URLs" },
    { key: "payment", label: "Payment" },
    { key: "text", label: "Text" },
    { key: "other", label: "Other" },
    ...(user ? [{ key: "favorites" as Filter, label: "Favorites" }] : []),
  ];

  const renderItem = useCallback(
    ({ item }: { item: HistoryItem }) => {
      const risk = safetyRiskMap.get(item.id) ?? "safe";
      const showRiskBadge = (item.contentType === "url" || item.contentType === "payment") && risk !== "safe";
      const riskColor = risk === "dangerous" ? Colors.dark.danger : Colors.dark.warning;
      const riskBgColor = risk === "dangerous" ? Colors.dark.dangerDim : Colors.dark.warningDim;

      return (
        <Pressable
          onPress={() => {
            if (item.qrCodeId) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({
                pathname: "/qr-detail/[id]",
                params: { id: item.qrCodeId },
              });
            }
          }}
          style={({ pressed }) => [styles.historyItem, { opacity: pressed ? 0.8 : 1 }]}
        >
          <View style={[
            styles.itemIcon,
            {
              backgroundColor: item.source === "favorite"
                ? Colors.dark.dangerDim
                : Colors.dark.primaryDim,
            },
          ]}>
            <Ionicons
              name={
                item.source === "favorite"
                  ? "heart"
                  : (getContentIcon(item.contentType) as any)
              }
              size={20}
              color={item.source === "favorite" ? Colors.dark.danger : Colors.dark.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemContent} numberOfLines={1}>
              {item.content}
            </Text>
            <View style={styles.itemMeta}>
              <Text style={styles.itemDate}>{formatDate(item.scannedAt)}</Text>
              <View style={styles.badgesRow}>
                {showRiskBadge ? (
                  <View style={[styles.riskBadge, { backgroundColor: riskBgColor }]}>
                    <Ionicons
                      name={risk === "dangerous" ? "warning" : "alert-circle"}
                      size={10}
                      color={riskColor}
                    />
                    <Text style={[styles.riskBadgeText, { color: riskColor }]}>
                      {risk === "dangerous" ? "Dangerous" : "Caution"}
                    </Text>
                  </View>
                ) : null}
                <View
                  style={[
                    styles.sourceBadge,
                    {
                      backgroundColor:
                        item.source === "favorite"
                          ? Colors.dark.dangerDim
                          : item.source === "cloud"
                          ? Colors.dark.accentDim
                          : Colors.dark.surfaceLight,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      item.source === "favorite"
                        ? "heart"
                        : item.source === "cloud"
                        ? "cloud"
                        : "phone-portrait"
                    }
                    size={10}
                    color={
                      item.source === "favorite"
                        ? Colors.dark.danger
                        : item.source === "cloud"
                        ? Colors.dark.accent
                        : Colors.dark.textMuted
                    }
                  />
                  <Text
                    style={[
                      styles.sourceText,
                      {
                        color:
                          item.source === "favorite"
                            ? Colors.dark.danger
                            : item.source === "cloud"
                            ? Colors.dark.accent
                            : Colors.dark.textMuted,
                      },
                    ]}
                  >
                    {item.source === "favorite"
                      ? "Favorite"
                      : item.source === "cloud"
                      ? "Synced"
                      : "Local"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.dark.textMuted} />
        </Pressable>
      );
    },
    [safetyRiskMap]
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.dark.primary} />
      </View>
    );
  }, [loadingMore]);

  const handleEndReached = useCallback(() => {
    if (filter !== "favorites" && filter !== "all" ? false : filter === "favorites" ? false : true) {
      loadMoreCloudHistory();
    }
    if (filter === "all" || filter === "url" || filter === "text" || filter === "payment" || filter === "other") {
      loadMoreCloudHistory();
    }
  }, [filter, loadMoreCloudHistory]);

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <View style={styles.headerActions}>
          {history.length > 0 && filter !== "favorites" ? (
            <Pressable onPress={clearLocalHistory} style={styles.headerBtn}>
              <Ionicons name="trash-outline" size={20} color={Colors.dark.textMuted} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/settings");
            }}
            style={styles.headerBtn}
          >
            <Ionicons name="settings-outline" size={22} color={Colors.dark.textSecondary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => {
              setFilter(f.key);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[
              styles.filterChip,
              filter === f.key && styles.filterChipActive,
              f.key === "favorites" && styles.filterChipFavorite,
              f.key === "favorites" && filter === f.key && styles.filterChipFavoriteActive,
            ]}
          >
            {f.key === "favorites" ? (
              <Ionicons
                name={filter === "favorites" ? "heart" : "heart-outline"}
                size={13}
                color={filter === "favorites" ? Colors.dark.danger : Colors.dark.textMuted}
              />
            ) : null}
            <Text
              style={[
                styles.filterText,
                filter === f.key && styles.filterTextActive,
                f.key === "favorites" && filter === f.key && { color: Colors.dark.danger },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={displayItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 84 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.dark.primary}
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={filter === "favorites" ? "heart-outline" : "time-outline"}
              size={48}
              color={Colors.dark.textMuted}
            />
            <Text style={styles.emptyTitle}>
              {filter === "favorites" ? "No favorites yet" : "No history yet"}
            </Text>
            <Text style={styles.emptySubtext}>
              {filter === "favorites"
                ? "Tap the heart on QR detail to add favorites"
                : "Scanned QR codes will appear here"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
  },
  headerActions: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
    flexWrap: "nowrap",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
  },
  filterChipActive: {
    backgroundColor: Colors.dark.primaryDim,
    borderColor: Colors.dark.primary,
  },
  filterChipFavorite: {
    borderColor: Colors.dark.danger + "50",
  },
  filterChipFavoriteActive: {
    backgroundColor: Colors.dark.dangerDim,
    borderColor: Colors.dark.danger,
  },
  filterText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textMuted,
  },
  filterTextActive: {
    color: Colors.dark.primary,
  },
  list: {
    paddingHorizontal: 20,
  },
  historyItem: {
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
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  itemContent: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.text,
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  itemDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  riskBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  sourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sourceText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  emptyState: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textSecondary,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    textAlign: "center",
    maxWidth: 260,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
});
