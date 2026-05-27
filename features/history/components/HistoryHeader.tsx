import React from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "@/lib/haptics";

interface Props {
  searchVisible:    boolean;
  searchQuery:      string;
  onChangeQuery:    (q: string) => void;
  onOpenSearch:     () => void;
  onCloseSearch:    () => void;
  searchInputRef:   React.RefObject<TextInput>;
  colors:           any;
  fontSize:         (n: number) => number;
}

const HistoryHeader = React.memo(function HistoryHeader({
  searchVisible,
  searchQuery,
  onChangeQuery,
  onOpenSearch,
  onCloseSearch,
  searchInputRef,
  colors,
  fontSize,
}: Props) {
  if (searchVisible) {
    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
      >
        <Ionicons name="search-outline" size={17} color={colors.textMuted} />
        <TextInput
          ref={searchInputRef}
          value={searchQuery}
          onChangeText={onChangeQuery}
          placeholder="Search URLs, payments, text…"
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.text }]}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          maxFontSizeMultiplier={1}
          autoFocus
        />
        <Pressable onPress={onCloseSearch} hitSlop={8}>
          <Text style={[styles.searchCancel, { color: colors.primary, fontSize: fontSize(14) }]} maxFontSizeMultiplier={1}>
            Cancel
          </Text>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.delay(0).duration(260)} style={styles.header}>
      <Animated.Text
        entering={FadeInDown.delay(40).duration(260)}
        style={[styles.title, { color: colors.text, fontSize: fontSize(22) }]}
      >
        Scan History
      </Animated.Text>
      <Animated.View entering={FadeInDown.delay(30).duration(260)} style={styles.actions}>
        <Animated.View entering={FadeIn.delay(40).duration(240)}>
          <Pressable
            onPress={onOpenSearch}
            style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          </Pressable>
        </Animated.View>
        <Animated.View entering={FadeIn.delay(50).duration(240)}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: "/settings" as any, params: { from: "history" } });
            }}
            style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
});

export default HistoryHeader;

const styles = StyleSheet.create({
  header: {
    flexDirection:   "row",
    justifyContent:  "space-between",
    alignItems:      "center",
    paddingHorizontal: 20,
    paddingTop:      8,
    paddingBottom:   10,
  },
  title: {
    fontFamily:   "Inter_700Bold",
    letterSpacing: -0.5,
    lineHeight:   28,
  },
  actions: { flexDirection: "row", gap: 8, alignItems: "center" },
  btn: {
    width:        38,
    height:       38,
    borderRadius: 12,
    alignItems:   "center",
    justifyContent: "center",
    borderWidth:  1,
  },
  searchBar: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             10,
    marginHorizontal: 16,
    marginTop:       8,
    marginBottom:    10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius:    14,
    borderWidth:     1,
  },
  searchInput: {
    flex:       1,
    fontSize:   14,
    fontFamily: "Inter_400Regular",
    paddingVertical: 0,
  },
  searchCancel: { fontFamily: "Inter_600SemiBold" },
});
