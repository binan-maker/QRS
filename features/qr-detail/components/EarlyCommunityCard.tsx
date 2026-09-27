import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";

interface Props {
  isLoggedIn: boolean;
  onRatePress: () => void;
}

/**
 * Explains the difference between "no community data" and a safety verdict.
 * An unrated QR must not look suspicious just because it is new to BinRo.
 */
const EarlyCommunityCard = memo(function EarlyCommunityCard({ isLoggedIn, onRatePress }: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.primary + "35" },
      ]}
      accessibilityLabel="No community rating yet"
    >
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryDim }]}>
          <Ionicons name="people-outline" size={21} color={colors.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>COMMUNITY CHECK</Text>
          <Text style={[styles.title, { color: colors.text }]}>No community rating yet</Text>
        </View>
      </View>

      <Text style={[styles.body, { color: colors.textSecondary }]}>
        This QR code has not received a community rating yet. That does not mean it is safe or unsafe — your experience can help the next person.
      </Text>

      <Pressable
        onPress={onRatePress}
        accessibilityRole="button"
        accessibilityLabel={isLoggedIn ? "Be the first to rate this QR code" : "Sign in to rate this QR code"}
        style={({ pressed }) => [
          styles.action,
          { backgroundColor: colors.primary },
          pressed && styles.actionPressed,
        ]}
      >
        <Ionicons name={isLoggedIn ? "flag-outline" : "log-in-outline"} size={16} color={colors.primaryText} />
        <Text style={[styles.actionText, { color: colors.primaryText }]}>
          {isLoggedIn ? "Be the first to rate" : "Sign in to rate"}
        </Text>
        {isLoggedIn && <Ionicons name="arrow-forward" size={15} color={colors.primaryText} />}
      </Pressable>
    </View>
  );
});

export default EarlyCommunityCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
    gap: 3,
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: "Inter_700Bold",
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
  },
  action: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  actionPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  actionText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
});