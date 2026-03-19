import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { settingsStyles as styles } from "@/features/settings/styles";
import SettingsMenuItem from "./SettingsMenuItem";

interface Props {
  user: any;
  deleteConfirmText: string;
  setDeleteConfirmText: (v: string) => void;
  handleDeleteAccount: () => void;
  goToComments: () => void;
  goToHistory: () => void;
}

export default function AccountSection({ user, deleteConfirmText, setDeleteConfirmText, handleDeleteAccount, goToComments, goToHistory }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
    >
      <Animated.View entering={FadeInDown.duration(300)}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MY CONTENT</Text>
          <View style={styles.menuGroup}>
            <SettingsMenuItem
              icon="time-outline"
              label="My History"
              sublabel="View and delete your scan history"
              onPress={goToHistory}
            />
            <View style={styles.divider} />
            <SettingsMenuItem
              icon="chatbubble-ellipses-outline"
              label="My Comments"
              sublabel="View and delete your comments"
              onPress={goToComments}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DANGER ZONE</Text>
          <View style={[styles.menuGroup, { borderColor: Colors.dark.danger + "40" }]}>
            <View style={{ padding: 16, gap: 12 }}>
              <View style={styles.warningBanner}>
                <Ionicons name="warning" size={20} color={Colors.dark.danger} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.warningTitle}>Delete Account</Text>
                  <Text style={styles.warningDesc}>
                    Your account will be scheduled for deletion. Comments will be hidden immediately. You have 14 days to contact support to recover it.
                  </Text>
                </View>
              </View>
              <Text style={styles.confirmLabel}>Type "delete" to confirm:</Text>
              <TextInput
                style={styles.confirmInput}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder="delete"
                placeholderTextColor={Colors.dark.textMuted}
                autoCapitalize="none"
              />
              <Pressable
                onPress={handleDeleteAccount}
                disabled={deleteConfirmText.toLowerCase() !== "delete"}
                style={({ pressed }) => [
                  styles.deleteBtn,
                  { opacity: deleteConfirmText.toLowerCase() !== "delete" ? 0.4 : pressed ? 0.8 : 1 },
                ]}
              >
                <Ionicons name="trash" size={18} color="#fff" />
                <Text style={styles.deleteBtnText}>Delete My Account</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
}
