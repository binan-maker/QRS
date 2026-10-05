import { useMemo, useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAvatar, pickBestPhotoUrl } from "@/shared/contexts/AvatarContext";
import { makeSettingsStyles } from "@/features/settings/styles";
import SettingsMenuItem from "./SettingsMenuItem";

// Module-level: created once, not on every render
const ENTER_ANIM = FadeInDown.duration(260);

interface Props {
  user: any;
  deleteConfirmText: string;
  setDeleteConfirmText: (v: string) => void;
  handleDeleteAccount: () => void;
  goToComments: () => void;
  goToHistory?: () => void;
  onScroll?: (e: any) => void;
  paddingTop?: number;
}

export default function AccountSection({ user, deleteConfirmText, setDeleteConfirmText, handleDeleteAccount, goToComments, goToHistory, onScroll, paddingTop = 0 }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeSettingsStyles(colors), [colors]);
  const { cachedUrl, url: rawAvatarUrl } = useAvatar();
  const resolvedAvatarUrl = useMemo(
    () => pickBestPhotoUrl(cachedUrl, rawAvatarUrl, user?.photoURL),
    [cachedUrl, rawAvatarUrl, user?.photoURL]
  );
  const [avatarError, setAvatarError] = useState(false);
  useEffect(() => {
    setAvatarError(false);
  }, [resolvedAvatarUrl]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentContainerStyle={[styles.scrollContent, { paddingTop, paddingBottom: insets.bottom + 40 }]}
    >
      <Animated.View entering={ENTER_ANIM}>
        {user && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CONNECTED ACCOUNT</Text>
            <View style={styles.menuGroup}>
              <View style={styles.accountCard}>
                <LinearGradient
                  colors={[colors.primary + "30", colors.accent + "20"]}
                  style={[styles.accountAvatar, { overflow: "hidden" }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {resolvedAvatarUrl && !avatarError ? (
                    <Image
                      source={{ uri: resolvedAvatarUrl }}
                      style={{ width: "100%", height: "100%", borderRadius: 999 }}
                      cachePolicy="memory-disk"
                      contentFit="cover"
                      transition={180}
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <Text style={styles.accountAvatarText}>
                      {(user.displayName || user.email || "?").charAt(0).toUpperCase()}
                    </Text>
                  )}
                </LinearGradient>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.accountName} numberOfLines={1} ellipsizeMode="tail">
                    {user.displayName}
                  </Text>
                  <Text style={styles.accountEmail} numberOfLines={1} ellipsizeMode="tail">
                    {user.email}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MY CONTENT</Text>
          <View style={styles.menuGroup}>
            <SettingsMenuItem
              icon="time-outline"
              label="My History"
              sublabel="View and delete your scan history"
              onPress={goToHistory ?? (() => {})}
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
          <View style={[styles.menuGroup, { borderColor: colors.danger + "40" }]}>
            <View style={{ padding: 16, gap: 12 }}>
              <View style={styles.warningBanner}>
                <Ionicons name="warning" size={20} color={colors.danger} />
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
                placeholderTextColor={colors.textMuted}
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
