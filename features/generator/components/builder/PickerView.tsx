import React, { memo } from "react";
import { View, Text, Pressable, ScrollView, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, { FadeIn, FadeInDown, SlideInLeft } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import { BUILT_IN_CATEGORIES } from "@/features/generator/data/built-in-categories";
import { catColor, GROUPS } from "@/features/generator/data/category-config";
import type { CategorySchema } from "@/lib/schemas/CategorySchema";
import { S } from "./builderStyles";
import CircleTile from "./CircleTile";

const SIDE_PAD = 16;
const GAP = 10;

interface Props {
  search: string;
  setSearch: (v: string) => void;
  searchResults: CategorySchema[] | null;
  popularCats: CategorySchema[];
  tileW: number;
  circleD: number;
  tabBarH: number;
  topInset: number;
  pickCategory: (id: string) => void;
  pickBlank: () => void;
  onBack: () => void;
}

function PickerView({
  search, setSearch, searchResults, popularCats,
  tileW, circleD, tabBarH, topInset,
  pickCategory, pickBlank, onBack,
}: Props) {
  const { colors } = useTheme();
  const hasSearch = search.trim().length > 0;

  return (
    <Reanimated.View entering={SlideInLeft.duration(230)} style={[S.root, { backgroundColor: colors.background }]}>
      <View style={{ height: topInset }} />
      <View style={S.header}>
        <Pressable onPress={onBack} style={[S.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[S.headerTitle, { color: colors.text }]}>Custom QR</Text>
          <Text style={[S.headerSub, { color: colors.textMuted }]}>
            {BUILT_IN_CATEGORIES.length}+ types — pick one to start
          </Text>
        </View>
      </View>

      <View style={[S.searchWrap, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} />
        <TextInput
          style={[S.searchInput, { color: colors.text }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search — UPI, WhatsApp, WiFi, Google…"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} hitSlop={10}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[S.pickScroll, { paddingHorizontal: SIDE_PAD, paddingBottom: tabBarH + 16 }]}
      >
        {hasSearch && (
          <Reanimated.View entering={FadeIn.duration(180)} style={{ gap: 8 }}>
            {searchResults && searchResults.length > 0 ? searchResults.map((cat, i) => (
              <Reanimated.View key={cat.id} entering={FadeInDown.duration(160).delay(i * 20)}>
                <Pressable
                  onPress={() => pickCategory(cat.id)}
                  style={({ pressed }) => [S.searchRow, {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfaceBorder,
                    opacity: pressed ? 0.75 : 1,
                  }]}
                >
                  <View style={[S.searchRowIcon, { backgroundColor: catColor(cat.id) + "18" }]}>
                    <Ionicons name={cat.icon as any} size={20} color={catColor(cat.id)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={[S.searchRowName, { color: colors.text }]}>{cat.name}</Text>
                      {cat.isIndiaFirst && <Text style={S.flagBadge}>🇮🇳</Text>}
                      {cat.badge && (
                        <View style={[S.catBadge, { backgroundColor: (cat.badgeColor ?? "#888") + "22", borderColor: (cat.badgeColor ?? "#888") + "50" }]}>
                          <Text style={[S.catBadgeText, { color: cat.badgeColor ?? "#888" }]}>{cat.badge}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[S.searchRowDesc, { color: colors.textMuted }]} numberOfLines={1}>{cat.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                </Pressable>
              </Reanimated.View>
            )) : (
              <View style={[S.emptySearch, { borderColor: colors.surfaceBorder }]}>
                <Ionicons name="search-outline" size={28} color={colors.textMuted} />
                <Text style={[S.emptySearchText, { color: colors.textMuted }]}>
                  No QR types match "{search}"
                </Text>
                <Text style={[S.emptySearchSub, { color: colors.textMuted }]}>
                  Try "UPI", "WiFi", "Instagram", "WhatsApp"…
                </Text>
              </View>
            )}

            <Pressable
              onPress={pickBlank}
              style={({ pressed }) => [S.searchRow, {
                backgroundColor: colors.primaryDim,
                borderColor: colors.primary + "50",
                opacity: pressed ? 0.75 : 1,
              }]}
            >
              <View style={[S.searchRowIcon, { backgroundColor: colors.primary + "18" }]}>
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.searchRowName, { color: colors.primary }]}>Build Your Own</Text>
                <Text style={[S.searchRowDesc, { color: colors.primary + "AA" }]}>Custom labels + values — any data you want</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </Pressable>
          </Reanimated.View>
        )}

        {!hasSearch && (
          <>
            <Reanimated.View entering={FadeInDown.duration(240)}>
              <View style={S.groupHeader}>
                <Text style={S.groupEmoji}>🔥</Text>
                <Text style={[S.groupLabel, { color: colors.textMuted }]}>MOST POPULAR</Text>
                <View style={[S.groupLine, { backgroundColor: colors.surfaceBorder }]} />
              </View>
              <View style={[S.tilesRow, { gap: GAP }]}>
                {popularCats.map(cat => (
                  <CircleTile
                    key={cat.id}
                    cat={cat}
                    size={tileW}
                    circleD={circleD}
                    onPress={() => pickCategory(cat.id)}
                  />
                ))}
              </View>
            </Reanimated.View>

            {GROUPS.map((grp, gi) => {
              const cats = BUILT_IN_CATEGORIES.filter(c => grp.ids.includes(c.id));
              if (!cats.length) return null;
              return (
                <Reanimated.View key={grp.label} entering={FadeInDown.duration(240).delay((gi + 1) * 35)}>
                  <View style={S.groupHeader}>
                    <Text style={S.groupEmoji}>{grp.emoji}</Text>
                    <Text style={[S.groupLabel, { color: colors.textMuted }]}>{grp.label.toUpperCase()}</Text>
                    <View style={[S.groupLine, { backgroundColor: colors.surfaceBorder }]} />
                  </View>
                  <View style={[S.tilesRow, { gap: GAP }]}>
                    {cats.map(cat => (
                      <CircleTile
                        key={cat.id}
                        cat={cat}
                        size={tileW}
                        circleD={circleD}
                        onPress={() => pickCategory(cat.id)}
                      />
                    ))}
                  </View>
                </Reanimated.View>
              );
            })}

            <Reanimated.View entering={FadeInDown.duration(240).delay((GROUPS.length + 1) * 35)}>
              <View style={S.groupHeader}>
                <Text style={S.groupEmoji}>✏️</Text>
                <Text style={[S.groupLabel, { color: colors.textMuted }]}>CUSTOM FIELDS</Text>
                <View style={[S.groupLine, { backgroundColor: colors.surfaceBorder }]} />
              </View>
              <Pressable
                onPress={pickBlank}
                style={({ pressed }) => [S.blankCard, {
                  backgroundColor: colors.surface,
                  borderColor: colors.primary + "50",
                  opacity: pressed ? 0.82 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                }]}
              >
                <LinearGradient
                  colors={[colors.primary + "18", colors.primary + "06"]}
                  style={S.blankCardGrad}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <View style={[S.blankCardIcon, { backgroundColor: colors.primaryDim }]}>
                    <Ionicons name="create-outline" size={28} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.blankCardTitle, { color: colors.text }]}>Build Your Own</Text>
                    <Text style={[S.blankCardSub, { color: colors.textMuted }]}>
                      Any labels + values — business cards, product tags, info boards, menus…
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </LinearGradient>
              </Pressable>
            </Reanimated.View>
          </>
        )}
      </ScrollView>
    </Reanimated.View>
  );
}

export default memo(PickerView);
