import { Pressable, Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  icon: string;
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
  iconGradient?: [string, string];
}

export default function SettingsMenuItem({ icon, label, sublabel, onPress, danger, iconGradient }: Props) {
  const { colors, isDark } = useTheme();

  const gradient: [string, string] = danger
    ? [colors.danger, (colors as any).dangerShade ?? colors.danger]
    : iconGradient ?? [colors.primary, (colors as any).primaryShade ?? colors.primary];

  const cardBg = isDark ? colors.surface : "#ffffff";
  const borderColor = danger ? colors.danger + "40" : colors.surfaceBorder;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.984 : 1 }],
          shadowColor: danger ? colors.danger : (isDark ? "#000" : "#0008FF"),
          shadowOpacity: isDark ? 0.18 : 0.05,
        },
      ]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconBox}
      >
        <Ionicons name={icon as any} size={21} color="#fff" />
      </LinearGradient>

      <View style={styles.body}>
        <Text
          style={[styles.label, { color: danger ? colors.danger : colors.text }]}
          numberOfLines={1}
          maxFontSizeMultiplier={1}
        >
          {label}
        </Text>
        {sublabel ? (
          <Text
            style={[styles.sublabel, { color: colors.textSecondary }]}
            numberOfLines={1}
            maxFontSizeMultiplier={1}
          >
            {sublabel}
          </Text>
        ) : null}
      </View>

      <View style={[styles.chevronWrap, { backgroundColor: gradient[0] + "18" }]}>
        <Ionicons name="chevron-forward" size={13} color={gradient[0]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 13,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    elevation: 2,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  sublabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
