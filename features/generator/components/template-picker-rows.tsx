import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import type { CategorySchema } from "@/shared/schemas/CategorySchema";
import { styles } from "./template-picker-styles";

export function SectionHeader({ label, sublabel }: { label: string; sublabel: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.catHeader, { borderBottomColor: colors.surfaceBorder }]}>
      <Text style={[styles.catLabel, { color: colors.primary }]}>{label}</Text>
      <Text style={[styles.catSublabel, { color: colors.textMuted }]}>{sublabel}</Text>
    </View>
  );
}

export function CategoryRow({
  category, isSelected, onPress, matchedOn,
}: {
  category: CategorySchema;
  isSelected: boolean;
  onPress: () => void;
  matchedOn?: string[];
}) {
  const { colors } = useTheme();
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

export function EmptyState({ query, activeTag }: { query: string; activeTag: string }) {
  const { colors } = useTheme();
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
