import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "@/shared/utils/haptics";
import { safePush } from "@/shared/utils/navigation";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { QrTypeIcon, getDisplayLabel, getSubtitle } from "@/features/qr-engine";
import type { FavoriteItem } from "../hooks/useFavorites";

function formatDate(iso: string) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  catch { return iso; }
}

export function FavoriteCard({ item }: { item: FavoriteItem }) {
  const { colors } = useTheme();
  const displayLabel = getDisplayLabel(item.content, item.contentType);
  const subtitle     = getSubtitle(item.content, item.contentType);

  return (
    <Animated.View entering={FadeInDown.duration(160).springify()}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          safePush(`/qr-detail/${item.qrCodeId || item.id}` as any);
        }}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.danger + "35",
            opacity: pressed ? 0.88 : 1,
            transform: [{ scale: pressed ? 0.984 : 1 }],
          },
        ]}
      >
        <QrTypeIcon contentType={item.contentType} size={48} />

        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1} maxFontSizeMultiplier={1}>
            {displayLabel}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1} maxFontSizeMultiplier={1}>
              {subtitle}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <View style={[styles.heartBadge, { backgroundColor: colors.dangerDim, borderColor: colors.danger + "40" }]}>
              <Ionicons name="heart" size={9} color={colors.danger} />
              <Text style={[styles.heartBadgeText, { color: colors.danger }]} maxFontSizeMultiplier={1}>
                Saved
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.right}>
          <Text style={[styles.dateText, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
            {formatDate(item.createdAt)}
          </Text>
          <View style={[styles.chevronWrap, { backgroundColor: colors.danger + "18" }]}>
            <Ionicons name="chevron-forward" size={13} color={colors.danger} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 20, marginBottom: 10, borderWidth: 1,
    overflow: "hidden", paddingHorizontal: 14, paddingVertical: 13, gap: 13,
  },
  body:     { flex: 1, minWidth: 0, gap: 4 },
  title:    { fontSize: 14, fontFamily: "Inter_700Bold", lineHeight: 20, letterSpacing: -0.1 },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  metaRow:  { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1 },
  heartBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 6, paddingVertical: 2.5,
    borderRadius: 100, borderWidth: 1,
  },
  heartBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.2 },
  right:       { alignItems: "flex-end", gap: 8, flexShrink: 0 },
  dateText:    { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.1 },
  chevronWrap: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
});
