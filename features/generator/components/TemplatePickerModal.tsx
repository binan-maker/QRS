import {
  View, Text, Modal, Pressable, ScrollView, TextInput,
  StyleSheet, useWindowDimensions, ActivityIndicator,
} from "react-native";
import { useState, useMemo, useEffect, memo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { CategoryRegistryService } from "@/lib/services/category-registry-service";
import type { CategorySchema, CategorySearchResult } from "@/lib/schemas/CategorySchema";

interface Props {
  visible: boolean;
  selectedPreset: number;
  onSelect: (idx: number) => void;
  onClose: () => void;
}

const BRAND_IDS = new Set([
  "whatsapp", "instagram", "twitter", "facebook", "linkedin",
  "youtube", "spotify", "paypal", "venmo", "grab", "bharat_qr", "telegram",
]);

const TAG_FILTERS = [
  { key: "all",      label: "All",       icon: "apps-outline"           },
  { key: "payment",  label: "Payments",  icon: "cash-outline"           },
  { key: "social",   label: "Social",    icon: "people-outline"         },
  { key: "contact",  label: "Contact",   icon: "person-circle-outline"  },
  { key: "business", label: "Business",  icon: "business-outline"       },
  { key: "utility",  label: "Utility",   icon: "construct-outline"      },
];

function TemplatePickerModal({ visible, selectedPreset, onSelect, onClose }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("all");
  const [allCategories, setAllCategories] = useState<CategorySchema[]>([]);
  const [loading, setLoading] = useState(true);

  const sheetHeight = screenHeight * 0.88;

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    CategoryRegistryService.getAll()
      .then((cats) => setAllCategories(cats.filter((c) => !BRAND_IDS.has(c.id))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible]);

  const searchResults = useMemo((): CategorySearchResult[] | null => {
    const q = search.trim();
    if (!q && activeTag === "all") return null;

    let pool = allCategories;

    if (activeTag !== "all") {
      pool = pool.filter(c =>
        c.tags.includes(activeTag) ||
        c.id.includes(activeTag)
      );
    }

    if (!q) {
      return pool
        .sort((a, b) => b.popularity - a.popularity)
        .map(c => ({ category: c, score: c.popularity, matchedOn: [] }));
    }

    const lower = q.toLowerCase();
    const words = lower.split(/\s+/).filter(Boolean);

    const scored: CategorySearchResult[] = pool.map(c => {
      const name = c.name.toLowerCase();
      const desc = c.description.toLowerCase();
      const tags = c.tags.map(t => t.toLowerCase());
      let score = 0;
      const matchedOn: string[] = [];

      for (const word of words) {
        if (name === word) { score += 100; matchedOn.push("exact"); continue; }
        if (name.startsWith(word)) { score += 60; matchedOn.push("name"); continue; }
        if (name.includes(word)) { score += 40; matchedOn.push("name"); continue; }
        if (tags.some(t => t === word)) { score += 35; matchedOn.push("tag"); continue; }
        if (tags.some(t => t.includes(word))) { score += 20; matchedOn.push("tag"); continue; }
        if (desc.includes(word)) { score += 10; matchedOn.push("desc"); }
      }
      score += Math.min(c.popularity / 10, 8);
      return { category: c, score, matchedOn };
    });

    return scored.filter(r => r.score > 8).sort((a, b) => b.score - a.score);
  }, [search, activeTag, allCategories]);

  function handleSelect(cat: CategorySchema) {
    if (cat.presetIdx !== undefined) {
      onSelect(cat.presetIdx);
      setSearch("");
      setActiveTag("all");
      onClose();
    }
  }

  function handleClose() {
    setSearch("");
    setActiveTag("all");
    onClose();
  }

  const totalCount = allCategories.length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              borderColor: colors.surfaceBorder,
              height: sheetHeight,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.surfaceBorder }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>Choose QR Type</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {totalCount} types available worldwide
              </Text>
            </View>
            <Pressable
              onPress={handleClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceLight }]}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Search */}
          <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Ionicons name="search-outline" size={16} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={search}
              onChangeText={setSearch}
              placeholder="What do you need a QR for?"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus={false}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          {/* Tag filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagRow}
          >
            {TAG_FILTERS.map(t => {
              const active = activeTag === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setActiveTag(t.key)}
                  style={[
                    styles.tagChip,
                    {
                      backgroundColor: active ? colors.primaryDim : colors.surface,
                      borderColor: active ? colors.primary + "60" : colors.surfaceBorder,
                    },
                  ]}
                >
                  <Text style={[styles.tagChipText, { color: active ? colors.primary : colors.textMuted }]}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* List */}
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading categories…</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {searchResults === null ? (
                <Animated.View entering={FadeIn.duration(300)}>
                  <SectionHeader
                    label="All Types"
                    sublabel={`${totalCount} types available`}
                    colors={colors}
                  />
                  <View style={styles.catItems}>
                    {allCategories
                      .sort((a, b) => b.popularity - a.popularity)
                      .map(cat => (
                        <CategoryRow
                          key={cat.id}
                          category={cat}
                          isSelected={cat.presetIdx === selectedPreset}
                          onPress={() => handleSelect(cat)}
                          colors={colors}
                        />
                      ))}
                  </View>
                </Animated.View>
              ) : searchResults.length === 0 ? (
                <EmptyState query={search} activeTag={activeTag} colors={colors} />
              ) : (
                <Animated.View entering={FadeIn.duration(200)}>
                  <SectionHeader
                    label={search ? `Results for "${search}"` : TAG_FILTERS.find(t => t.key === activeTag)?.label ?? ""}
                    sublabel={`${searchResults.length} type${searchResults.length !== 1 ? "s" : ""} found`}
                    colors={colors}
                  />
                  <View style={styles.catItems}>
                    {searchResults.map(({ category: cat, matchedOn }) => (
                      <CategoryRow
                        key={cat.id}
                        category={cat}
                        isSelected={cat.presetIdx === selectedPreset}
                        onPress={() => handleSelect(cat)}
                        colors={colors}
                        matchedOn={matchedOn}
                      />
                    ))}
                  </View>
                </Animated.View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function SectionHeader({ label, sublabel, colors }: { label: string; sublabel: string; colors: any }) {
  return (
    <View style={[styles.catHeader, { borderBottomColor: colors.surfaceBorder }]}>
      <Text style={[styles.catLabel, { color: colors.primary }]}>{label}</Text>
      <Text style={[styles.catSublabel, { color: colors.textMuted }]}>{sublabel}</Text>
    </View>
  );
}

function CategoryRow({
  category, isSelected, onPress, colors, matchedOn,
}: {
  category: CategorySchema;
  isSelected: boolean;
  onPress: () => void;
  colors: any;
  matchedOn?: string[];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.presetRow,
        {
          backgroundColor: isSelected ? colors.primaryDim : colors.surface,
          borderColor: isSelected ? colors.primary + "50" : colors.surfaceBorder,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View style={[styles.presetIconBox, { backgroundColor: isSelected ? colors.primary + "25" : colors.surfaceLight }]}>
        <Ionicons
          name={category.icon as any}
          size={17}
          color={isSelected ? colors.primary : colors.textSecondary}
        />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.rowTitleLine}>
          <Text style={[styles.presetLabel, { color: isSelected ? colors.primary : colors.text }]} numberOfLines={1}>
            {category.name}
          </Text>
          {category.badge && (
            <View style={[styles.badge, { backgroundColor: (category.badgeColor ?? colors.primary) + "22" }]}>
              <Text style={[styles.badgeText, { color: category.badgeColor ?? colors.primary }]}>
                {category.badge}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.presetHint, { color: colors.textMuted }]} numberOfLines={1}>
          {category.description}
        </Text>
      </View>

      {isSelected ? (
        <Ionicons name="checkmark-circle" size={19} color={colors.primary} />
      ) : (
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

function EmptyState({ query, activeTag, colors }: { query: string; activeTag: string; colors: any }) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={{ fontSize: 36, marginBottom: 12 }}>🔍</Text>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {query ? `No results for "${query}"` : "Nothing here yet"}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
        {query
          ? "Try different keywords — e.g. \"payment\", \"wifi\", \"contact\""
          : "Try a different filter"}
      </Text>
    </View>
  );
}

export default memo(TemplatePickerModal);

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    paddingTop: 12, overflow: "hidden",
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: "center", marginBottom: 8,
  },
  header: {
    flexDirection: "row", alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20, marginBottom: 6,
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center", marginLeft: 12,
  },
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  tagRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  tagChip: {
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 14,
    height: 36,
    alignItems: "center", justifyContent: "center",
  },
  tagChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold", lineHeight: 16 },
  catHeader: {
    flexDirection: "row", alignItems: "baseline", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: 1, marginTop: 4,
  },
  catLabel: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  catSublabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  catItems: { paddingHorizontal: 16, paddingTop: 6, gap: 6 },
  presetRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1,
  },
  presetIconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  rowTitleLine: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  presetLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  presetHint: { fontSize: 11, fontFamily: "Inter_400Regular" },
  badge: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  loadingWrap: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingTop: 60, gap: 12,
  },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  emptyWrap: {
    alignItems: "center", paddingTop: 48, paddingHorizontal: 32, gap: 4,
  },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 6 },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
});
