import {
  View, Text, Pressable, ScrollView, TextInput, ActivityIndicator,
} from "react-native";
import { useState, useMemo, useEffect, memo } from "react";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { CategoryRegistryService } from "@/services/category-registry-service";
import type { CategorySchema, CategorySearchResult } from "@/shared/schemas/CategorySchema";
import BottomSheet from "@/shared/components/ui/BottomSheet";
import { useWindowDimensions } from "react-native";
import { SectionHeader, CategoryRow, EmptyState } from "./template-picker-rows";
import { styles } from "./template-picker-styles";

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
  { key: "utility",  label: "Utility",   icon: "construct-outline"      },
];

function TemplatePickerModal({ visible, selectedPreset, onSelect, onClose }: Props) {
  const { colors } = useTheme();
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
      pool = pool.filter(c => c.tags.includes(activeTag) || c.id.includes(activeTag));
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
        if (name === word)                        { score += 100; matchedOn.push("exact"); continue; }
        if (name.startsWith(word))                { score += 60;  matchedOn.push("name");  continue; }
        if (name.includes(word))                  { score += 40;  matchedOn.push("name");  continue; }
        if (tags.some(t => t === word))           { score += 35;  matchedOn.push("tag");   continue; }
        if (tags.some(t => t.includes(word)))     { score += 20;  matchedOn.push("tag");   continue; }
        if (desc.includes(word))                  { score += 10;  matchedOn.push("desc"); }
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
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      maxHeight={sheetHeight}
      sheetStyle={{ paddingHorizontal: 0, backgroundColor: colors.background }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Choose QR Type</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {totalCount} types available worldwide
          </Text>
        </View>
        <Pressable onPress={handleClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceLight }]}>
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagRow}>
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
            <Animated.View entering={FadeIn.duration(260)}>
              <SectionHeader label="All Types" sublabel={`${totalCount} types available`} />
              <View style={styles.catItems}>
                {allCategories
                  .sort((a, b) => b.popularity - a.popularity)
                  .map(cat => (
                    <CategoryRow
                      key={cat.id}
                      category={cat}
                      isSelected={cat.presetIdx === selectedPreset}
                      onPress={() => handleSelect(cat)}
                    />
                  ))}
              </View>
            </Animated.View>
          ) : searchResults.length === 0 ? (
            <EmptyState query={search} activeTag={activeTag} />
          ) : (
            <Animated.View entering={FadeIn.duration(200)}>
              <SectionHeader
                label={search ? `Results for "${search}"` : TAG_FILTERS.find(t => t.key === activeTag)?.label ?? ""}
                sublabel={`${searchResults.length} type${searchResults.length !== 1 ? "s" : ""} found`}
              />
              <View style={styles.catItems}>
                {searchResults.map(({ category: cat, matchedOn }) => (
                  <CategoryRow
                    key={cat.id}
                    category={cat}
                    isSelected={cat.presetIdx === selectedPreset}
                    onPress={() => handleSelect(cat)}
                    matchedOn={matchedOn}
                  />
                ))}
              </View>
            </Animated.View>
          )}
        </ScrollView>
      )}
    </BottomSheet>
  );
}

export default memo(TemplatePickerModal);
