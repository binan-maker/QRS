import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
      style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.7 : 1 }]}
    >
      <Ionicons name={icon as any} size={22} color={danger ? colors.danger : colors.textSecondary} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, danger && { color: colors.danger }]}>{label}</Text>
        {sublabel ? <Text style={styles.menuSublabel}>{sublabel}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}
