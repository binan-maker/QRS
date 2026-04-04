import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, Pressable, FlatList, ActivityIndicator,
  StyleSheet, Image, Platform, RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  getFriends,
  getIncomingRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  FriendEntry,
} from "@/lib/services/friend-service";

type Tab = "friends" | "requests";

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [requests, setRequests] = useState<FriendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [f, r] = await Promise.all([
        getFriends(user.id),
        getIncomingRequests(user.id),
      ]);
      setFriends(f);
      setRequests(r);
    } catch {}
  }, [user]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleAccept(entry: FriendEntry) {
    if (!user) return;
    await acceptFriendRequest(user.id, entry.userId);
    setRequests((prev) => prev.filter((r) => r.userId !== entry.userId));
    setFriends((prev) => [...prev, { ...entry, status: "friends" }]);
  }

  async function handleReject(entry: FriendEntry) {
    if (!user) return;
    await rejectFriendRequest(user.id, entry.userId);
    setRequests((prev) => prev.filter((r) => r.userId !== entry.userId));
  }

  async function handleRemove(entry: FriendEntry) {
    if (!user) return;
    await removeFriend(user.id, entry.userId);
    setFriends((prev) => prev.filter((f) => f.userId !== entry.userId));
  }

  function renderEntry(item: FriendEntry, mode: Tab) {
    const initials = item.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    return (
      <Pressable
        onPress={() => router.push(`/profile/${item.username}` as any)}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
      >
        <View style={[styles.avatarWrap, { borderColor: colors.primary + "40" }]}>
          {item.photoURL ? (
            <Image source={{ uri: item.photoURL }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatarGrad, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>{item.displayName}</Text>
          <Text style={[styles.username, { color: colors.primary }]}>@{item.username}</Text>
        </View>

        {mode === "requests" ? (
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => handleAccept(item)}
              style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="checkmark" size={16} color={colors.primaryText} />
              <Text style={[styles.acceptText, { color: colors.primaryText }]}>Accept</Text>
            </Pressable>
            <Pressable
              onPress={() => handleReject(item)}
              style={[styles.rejectBtn, { backgroundColor: colors.dangerDim, borderColor: colors.danger + "30" }]}
            >
              <Ionicons name="close" size={16} color={colors.danger} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => handleRemove(item)}
            style={[styles.removeBtn, { backgroundColor: colors.dangerDim, borderColor: colors.danger + "25" }]}
          >
            <Ionicons name="person-remove-outline" size={14} color={colors.danger} />
          </Pressable>
        )}
      </Pressable>
    );
  }

  const listData = tab === "friends" ? friends : requests;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Nav */}
      <View style={[styles.nav, { paddingTop: topInset + 8 }]}>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/profile" as any)}
          style={[styles.navBack, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Friends</Text>
        <Pressable
          onPress={() => router.push("/search" as any)}
          style={[styles.navAdd, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}
        >
          <Ionicons name="person-add-outline" size={18} color={colors.primary} />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        {(["friends", "requests"] as Tab[]).map((t) => {
          const active = tab === t;
          const count = t === "friends" ? friends.length : requests.length;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[
                styles.tabBtn,
                active && { backgroundColor: colors.primary },
              ]}
            >
              <Text style={[
                styles.tabLabel,
                { color: active ? colors.primaryText : colors.textMuted },
              ]}>
                {t === "friends" ? "Friends" : "Requests"}
                {count > 0 ? ` (${count})` : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : listData.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primaryDim }]}>
            <Ionicons
              name={tab === "friends" ? "people-outline" : "mail-outline"}
              size={28} color={colors.primary}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {tab === "friends" ? "No friends yet" : "No requests"}
          </Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>
            {tab === "friends"
              ? "Search for people and send them a friend request"
              : "Friend requests will appear here"}
          </Text>
          {tab === "friends" && (
            <Pressable
              onPress={() => router.push("/search" as any)}
              style={[styles.findBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="search-outline" size={16} color={colors.primaryText} />
              <Text style={[styles.findBtnText, { color: colors.primaryText }]}>Find People</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.userId}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: insets.bottom + 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => renderEntry(item, tab)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  nav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
  },
  navBack: {
    width: 40, height: 40, borderRadius: 13,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  navTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  navAdd: {
    width: 40, height: 40, borderRadius: 13,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  tabs: {
    flexDirection: "row", marginHorizontal: 16, borderRadius: 14,
    padding: 4, borderWidth: 1, marginBottom: 6,
  },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: "center" },
  tabLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 36, gap: 12, marginTop: -60,
  },
  emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  findBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 4,
  },
  findBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 18, padding: 14, borderWidth: 1,
  },
  avatarWrap: { width: 50, height: 50, borderRadius: 17, overflow: "hidden", borderWidth: 1.5 },
  avatarImg: { width: 50, height: 50 },
  avatarGrad: { width: 50, height: 50, alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  displayName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  username: { fontSize: 13, fontFamily: "Inter_500Medium" },
  actionRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  acceptBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 11,
  },
  acceptText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  rejectBtn: {
    width: 34, height: 34, borderRadius: 11, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  removeBtn: {
    width: 34, height: 34, borderRadius: 11, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
});
