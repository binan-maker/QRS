import React, { useState, useCallback, useRef } from "react";
import {
  View, Text, TextInput, Pressable, FlatList, ActivityIndicator,
  StyleSheet, Image, Platform, KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { searchUsers, UserSearchResult } from "@/lib/services/user-service";
import {
  getFriendStatus,
  sendFriendRequest,
  cancelFriendRequest,
  FriendStatus,
} from "@/lib/services/friend-service";

interface ResultItem extends UserSearchResult {
  friendStatus: FriendStatus;
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const raw = await searchUsers(q);
      const filtered = user ? raw.filter((r) => r.userId !== user.id) : raw;
      const withStatus = await Promise.all(
        filtered.map(async (r) => ({
          ...r,
          friendStatus: user ? await getFriendStatus(user.id, r.userId) : ("none" as FriendStatus),
        }))
      );
      setResults(withStatus);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  function handleChange(text: string) {
    setQuery(text);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => runSearch(text), 400);
  }

  async function handleAddFriend(item: ResultItem) {
    if (!user) { router.push("/(auth)/login"); return; }
    if (item.friendStatus === "sent") {
      await cancelFriendRequest(user.id, item.userId);
    } else if (item.friendStatus === "none") {
      await sendFriendRequest(
        user.id, user.username ?? "", user.displayName, null,
        item.userId, item.username, item.displayName, item.photoURL,
      );
    }
    setResults((prev) =>
      prev.map((r) =>
        r.userId === item.userId
          ? { ...r, friendStatus: item.friendStatus === "sent" ? "none" : "sent" }
          : r
      )
    );
  }

  function getActionLabel(status: FriendStatus) {
    if (status === "friends") return "Friends";
    if (status === "sent") return "Requested";
    if (status === "received") return "Accept";
    return "Add Friend";
  }

  function getActionColors(status: FriendStatus): [string, string] {
    if (status === "friends") return [colors.safe, colors.safe + "BB"];
    if (status === "sent") return [colors.surfaceBorder, colors.surfaceBorder];
    if (status === "received") return [colors.accent, colors.accent + "BB"];
    return [colors.primary, colors.primary + "BB"];
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Nav */}
      <View style={[styles.nav, { paddingTop: topInset + 8 }]}>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/profile" as any)}
          style={[styles.navBack, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Find People</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by username…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={handleChange}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => runSearch(query)}
        />
        {query.length > 0 && (
          <Pressable onPress={() => { setQuery(""); setResults([]); setSearched(false); }}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Hint */}
      {!searched && (
        <View style={styles.hintWrap}>
          <LinearGradient
            colors={[colors.primaryDim, colors.accentDim]}
            style={styles.hintIcon}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Ionicons name="people-outline" size={28} color={colors.primary} />
          </LinearGradient>
          <Text style={[styles.hintTitle, { color: colors.text }]}>Search for people</Text>
          <Text style={[styles.hintSub, { color: colors.textMuted }]}>
            Type a username to find and add friends on QR Guard
          </Text>
        </View>
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.centerRow}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {/* No results */}
      {searched && !loading && results.length === 0 && (
        <View style={styles.hintWrap}>
          <Ionicons name="person-remove-outline" size={40} color={colors.textMuted} />
          <Text style={[styles.hintTitle, { color: colors.text }]}>No users found</Text>
          <Text style={[styles.hintSub, { color: colors.textMuted }]}>
            Try a different username
          </Text>
        </View>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(r) => r.userId}
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: insets.bottom + 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            const initials = item.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
            const actionColors = getActionColors(item.friendStatus);
            const isDisabled = item.friendStatus === "friends";
            return (
              <Pressable
                onPress={() => router.push(`/profile/${item.username}` as any)}
                style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
              >
                {/* Avatar */}
                <View style={[styles.avatarWrap, { borderColor: colors.primary + "40" }]}>
                  {item.photoURL ? (
                    <Image source={{ uri: item.photoURL }} style={styles.avatarImg} />
                  ) : (
                    <LinearGradient colors={[colors.primary, colors.accent]} style={styles.avatarGrad}>
                      <Text style={styles.avatarInitials}>{initials}</Text>
                    </LinearGradient>
                  )}
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
                    {item.displayName}
                  </Text>
                  <Text style={[styles.username, { color: colors.primary }]}>@{item.username}</Text>
                  {item.bio ? (
                    <Text style={[styles.bio, { color: colors.textMuted }]} numberOfLines={1}>{item.bio}</Text>
                  ) : null}
                </View>

                {/* Action */}
                {user && (
                  <Pressable
                    onPress={() => !isDisabled && handleAddFriend(item)}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      { borderColor: actionColors[0] + "60", opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <LinearGradient
                      colors={isDisabled ? [colors.safeDim, colors.safeDim] : [actionColors[0] + "22", actionColors[1] + "12"]}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={[styles.actionLabel, { color: isDisabled ? colors.safe : actionColors[0] }]}>
                      {getActionLabel(item.friendStatus)}
                    </Text>
                  </Pressable>
                )}
              </Pressable>
            );
          }}
        />
      )}
    </KeyboardAvoidingView>
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
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 16, borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 6,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", padding: 0 },
  hintWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 36, gap: 12, marginTop: -60 },
  hintIcon: { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  hintTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  hintSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  centerRow: { paddingVertical: 32, alignItems: "center" },
  resultCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 18, padding: 14, borderWidth: 1,
  },
  avatarWrap: { width: 50, height: 50, borderRadius: 17, overflow: "hidden", borderWidth: 1.5 },
  avatarImg: { width: 50, height: 50 },
  avatarGrad: { width: 50, height: 50, alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  displayName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  username: { fontSize: 13, fontFamily: "Inter_500Medium" },
  bio: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  actionBtn: {
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  actionLabel: { fontSize: 12, fontFamily: "Inter_700Bold" },
});
