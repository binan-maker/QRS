import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { makeStyles } from "@/features/qr-detail/styles";
import { navOfflineStyles } from "@/features/qr-detail/styles";
import { formatCompactNumber } from "@/lib/number-format";

interface Props {
  offlineMode: boolean;
  ownerName: string | null;
  hasOwner: boolean;
  isFollowingCreator: boolean;
  creatorFollowLoading: boolean;
  creatorFollowerCount: number;
  isFollowing: boolean;
  followLoading: boolean;
  followCount: number;
  isQrOwner: boolean;
  ownerDocId?: string;
  onBack: () => void;
  onFollowCreator: () => void;
  onOpenCreatorFollowers: () => void;
  onWatch: () => void;
  onManage: () => void;
  onOverflowOpen: () => void;
  onAnalytics?: () => void;
}

export default function QrDetailNavBar({
  offlineMode,
  ownerName,
  hasOwner,
  isFollowingCreator,
  creatorFollowLoading,
  creatorFollowerCount,
  isFollowing,
  followLoading,
  followCount,
  isQrOwner,
  ownerDocId,
  onBack,
  onFollowCreator,
  onOpenCreatorFollowers,
  onWatch,
  onManage,
  onOverflowOpen,
  onAnalytics,
}: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.navBar}>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 }}>
        <Pressable onPress={onBack} style={styles.navBackBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.navTitle, { textAlign: "left" }]} numberOfLines={1}>
            {hasOwner ? (ownerName || "QR Details") : "QR Details"}
          </Text>
          {offlineMode && (
            <Text style={[navOfflineStyles.badge, { color: colors.warning }]}>● Offline</Text>
          )}
        </View>
      </View>

      <View style={styles.navActions}>
        {isQrOwner ? (
          /* Owner sees Analytics + Manage — no Follow button shown */
          <>
            {onAnalytics && (
              <Pressable
                onPress={onAnalytics}
                style={({ pressed }) => [
                  styles.followBtn,
                  { backgroundColor: colors.accentDim, borderColor: colors.accent + "40", opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Ionicons name="bar-chart-outline" size={14} color={colors.accent} />
                <Text style={[styles.followBtnText, { color: colors.accent }]}>Analytics</Text>
              </Pressable>
            )}
            <Pressable
              onPress={onManage}
              style={({ pressed }) => [
                styles.followBtn,
                { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40", opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Ionicons name="settings-outline" size={14} color={colors.primary} />
              <Text style={[styles.followBtnText, { color: colors.primary }]}>Manage</Text>
            </Pressable>
          </>
        ) : hasOwner ? (
          /* Visitor on a QR Guard QR: show Follow creator button */
          <Pressable
            onPress={creatorFollowLoading ? undefined : onFollowCreator}
            style={({ pressed }) => [
              styles.followBtn,
              isFollowingCreator && styles.followBtnActive,
              creatorFollowLoading && { opacity: 0.55 },
              !creatorFollowLoading && { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
          >
            {creatorFollowLoading ? (
              <ActivityIndicator size={13} color={isFollowingCreator ? colors.primary : colors.textSecondary} />
            ) : (
              <Ionicons
                name={isFollowingCreator ? "person-add" : "person-add-outline"}
                size={14}
                color={isFollowingCreator ? colors.primary : colors.textSecondary}
              />
            )}
            <Text style={[styles.followBtnText, isFollowingCreator && styles.followBtnTextActive]}>
              {isFollowingCreator ? "Following" : "Follow"}
            </Text>
            {creatorFollowerCount > 0 && !creatorFollowLoading && (
              <Pressable onPress={onOpenCreatorFollowers} hitSlop={6}>
                <View style={styles.followCountPill}>
                  <Text style={styles.followCountPillText}>{formatCompactNumber(creatorFollowerCount)}</Text>
                </View>
              </Pressable>
            )}
          </Pressable>
        ) : null
        /* External QR with no registered owner → no follow/watch button */
        }

        <Pressable
          onPress={onOverflowOpen}
          style={({ pressed }) => [styles.navActionBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}
