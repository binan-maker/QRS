import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { useHistory, type HistoryItem, type Filter } from "@/hooks/useHistory";
import HistoryItemComponent from "@/features/history/components/HistoryItem";
import FilterBar from "@/features/history/components/FilterBar";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "camera", label: "Camera" },
  { key: "gallery", label: "Gallery" },
  { key: "url", label: "URLs" },
  { key: "payment", label: "Payment" },
  { key: "text", label: "Text" },
  { key: "other", label: "Other" },
];

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const {
    user,
    displayItems,
    safetyRiskMap,
    filter,
    setFilter,
    refreshing,
    loadingMore,
    cloudLoading,
    cloudError,
    onRefresh,
    handleEndReached,
  } = useHistory();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const styles = makeStyles(colors);

  const activeFilters: { key: Filter; label: string }[] = user
    ? [...FILTERS, { key: "favorites" as Filter, label: "Favorites" }]
    : FILTERS;

  const renderItem = useCallback(
    ({ item }: { item: HistoryItem }) => {
      const risk = safetyRiskMap.get(item.id) ?? "safe";
      return (
        <HistoryItemComponent
          item={item}
          risk={risk as "safe" | "caution" | "dangerous"}
        />
      );
    },
    [safetyRiskMap]
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [loadingMore, colors]);

  const keyExtractor = useCallback((item: HistoryItem) => item.id, []);

  const emptyComponent = () => {
    if (!user) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="person-outline" size={36} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Sign in to see your history</Text>
          <Text style={styles.emptySubtext}>
            Your scan history is saved to your account and synced across all your devices.
          </Text>
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            style={[styles.signInBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.signInBtnText}>Sign In</Text>
          </Pressable>
        </View>
      );
    }
    if (cloudLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptySubtext, { marginTop: 12 }]}>Loading your history...</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons
            name={filter === "favorites" ? "heart-outline" : "time-outline"}
            size={36}
            color={colors.textMuted}
          />
        </View>
        <Text style={styles.emptyTitle}>
          {filter === "favorites" ? "No favorites yet"
            : filter === "camera" ? "No camera scans yet"
            : filter === "gallery" ? "No gallery scans yet"
            : "No history yet"}
        </Text>
        <Text style={styles.emptySubtext}>
          {filter === "favorites"
            ? "Tap the heart on a QR detail to save it here"
            : filter === "camera"
            ? "QR codes scanned with the camera will appear here"
            : filter === "gallery"
            ? "QR codes scanned from your gallery will appear here"
            : "Scanned QR codes will appear here"}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/settings");
            }}
            style={styles.headerBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <FilterBar
        filters={activeFilters}
        activeFilter={filter}
        onFilterChange={setFilter}
      />

      {user && cloudError && (
        <Pressable onPress={onRefresh} style={[styles.cloudErrorBanner, { backgroundColor: colors.warningDim, borderColor: colors.warning + "40" }]}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.warning} />
          <Text style={[styles.cloudErrorText, { color: colors.warning }]}>
            Couldn't load cloud history — pull to retry
          </Text>
        </Pressable>
      )}

      <FlatList
        data={displayItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 84 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={emptyComponent}
      />
    </View>
  );
}

function makeStyles(c: ReturnType<typeof import("@/contexts/ThemeContext").useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 8,
    },
    title: { fontSize: 24, fontFamily: "Inter_700Bold", color: c.text },
    headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
    headerBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: c.surface, alignItems: "center", justifyContent: "center",
      borderWidth: 1, borderColor: c.surfaceBorder,
    },
    list: { paddingHorizontal: 16, paddingTop: 4 },
    emptyState: { alignItems: "center", gap: 8, paddingVertical: 56, paddingHorizontal: 32 },
    emptyIcon: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: c.surface, alignItems: "center", justifyContent: "center", marginBottom: 4,
    },
    emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: c.textSecondary, textAlign: "center" },
    emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textMuted, textAlign: "center", lineHeight: 19 },
    footerLoader: { paddingVertical: 20, alignItems: "center" },
    signInBtn: {
      marginTop: 8, paddingHorizontal: 32, paddingVertical: 12,
      borderRadius: 12, alignItems: "center",
    },
    signInBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#000" },
    cloudErrorBanner: {
      flexDirection: "row", alignItems: "center", gap: 8,
      marginHorizontal: 16, marginBottom: 8, padding: 10,
      borderRadius: 10, borderWidth: 1,
    },
    cloudErrorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  });
}
