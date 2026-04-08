import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { makeSettingsStyles } from "@/features/settings/styles";

interface Props {
  icon: string;
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
}

export default function SettingsMenuItem({ icon, label, sublabel, onPress, danger }: Props) {
  const { colors } = useTheme();
  const styles = makeSettingsStyles(colors);
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.75 : 1 }]}
    >
      <View style={[styles.menuIconWrap, {
        backgroundColor: danger ? colors.dangerDim : colors.surfaceLight,
      }]}>
        <Ionicons name={icon as any} size={18} color={danger ? colors.danger : colors.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, { color: danger ? colors.danger : colors.text }]} maxFontSizeMultiplier={1}>{label}</Text>
        {sublabel ? <Text style={styles.menuSublabel} maxFontSizeMultiplier={1}>{sublabel}</Text> : null}
      </View>
      <View style={[styles.menuIconWrap, { backgroundColor: colors.surfaceLight, width: 28, height: 28, borderRadius: 14 }]}>
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}
