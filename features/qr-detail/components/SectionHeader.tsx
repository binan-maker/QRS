import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

export function SectionHeader({
  label,
  inline,
}: {
  icon?: string;
  label: string;
  gradient?: [string, string];
  inline?: boolean;
}) {
  const { colors } = useTheme();
  const content = (
    <Text style={[styles.label, { color: colors.text }]} maxFontSizeMultiplier={1}>
      {label}
    </Text>
  );
  if (inline) return content;
  return <View style={styles.wrapper}>{content}</View>;
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 10, marginTop: 2 },
  label: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
