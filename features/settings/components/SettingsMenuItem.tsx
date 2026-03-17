import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { settingsStyles as styles } from "@/features/settings/styles";

interface Props {
  icon: string;
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
}

export default function SettingsMenuItem({ icon, label, sublabel, onPress, danger }: Props) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.7 : 1 }]}
    >
      <Ionicons name={icon as any} size={22} color={danger ? Colors.dark.danger : Colors.dark.textSecondary} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, danger && { color: Colors.dark.danger }]}>{label}</Text>
        {sublabel ? <Text style={styles.menuSublabel}>{sublabel}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.dark.textMuted} />
    </Pressable>
  );
}
