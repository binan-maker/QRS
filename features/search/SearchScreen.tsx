import React from "react";
import {
  View, Text, TextInput, Pressable, ActivityIndicator,
  StyleSheet, Image, Platform, KeyboardAvoidingView,
} from "react-native";
import { FlashList as _FlashList } from "@shopify/flash-list";
const FlashList = _FlashList as any;
import { router } from "expo-router";
import { safePush } from "@/shared/utils/navigation";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/shared/utils/platform";
import ScreenHeader from "@/shared/components/ui/ScreenHeader";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useUserSearch, type UserSearchResult } from "./hooks/useUserSearch";

export default function SearchScreen() {
  const insets   = useSafeAreaInsets();
  const { colors } = useTheme();
  const topInset   = useTopInset();

  const { query, results, loading, searched, handleChange, handleClear, runSearch } = useUserSearch();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset + 8 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenHeader
        title="Find People"
        onBack={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/profile" as any)}
      />

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
          <Pressable onPress={handleClear}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Idle hint */}
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
            Type a username to find users on BinRo
          </Text>
        </View>
      )}

      {loading && (
        <View style={styles.centerRow}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {searched && !loading && results.length === 0 && (
        <View style={styles.hintWrap}>
          <Ionicons name="person-remove-outline" size={40} color={colors.textMuted} />
          <Text style={[styles.hintTitle, { color: colors.text }]}>No users found</Text>
          <Text style={[styles.hintSub, { color: colors.textMuted }]}>Try a different username</Text>
        </View>
      )}

      {!loading && results.length > 0 && (
        <FlashList
          data={results}
          keyExtractor={(r: UserSearchResult) => r.userId}
          estimatedItemSize={72}
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: insets.bottom + 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }: { item: UserSearchResult }) => {
            const initials = item.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
            return (
              <Pressable
                onPress={() => safePush(`/profile/${item.username}`)}
                style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
              >
                <View style={[styles.avatarWrap, { borderColor: colors.primary + "40" }]}>
                  {item.photoURL ? (
                    <Image source={{ uri: item.photoURL }} style={styles.avatarImg} />
                  ) : (
                    <LinearGradient colors={[colors.primary, colors.accent]} style={styles.avatarGrad}>
                      <Text style={styles.avatarInitials}>{initials}</Text>
                    </LinearGradient>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
                    {item.displayName}
                  </Text>
                  <Text style={[styles.username, { color: colors.primary }]}>@{item.username}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 16, borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 6,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", padding: 0 },
  hintWrap:    { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 36, gap: 12, marginTop: -60 },
  hintIcon:    { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  hintTitle:   { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  hintSub:     { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  centerRow:   { paddingVertical: 32, alignItems: "center" },
  resultCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 18, padding: 14, borderWidth: 1,
  },
  avatarWrap:     { width: 50, height: 50, borderRadius: 17, overflow: "hidden", borderWidth: 1.5 },
  avatarImg:      { width: 50, height: 50 },
  avatarGrad:     { width: 50, height: 50, alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  displayName:    { fontSize: 15, fontFamily: "Inter_700Bold" },
  username:       { fontSize: 13, fontFamily: "Inter_500Medium" },
});
