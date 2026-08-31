import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { makeStyles } from "@/features/qr-detail/styles";
import { navOfflineStyles } from "@/features/qr-detail/styles";
import { formatCompactNumber } from "@/shared/utils/formatters";
interface Props {
  offlineMode: boolean;
  ownerName: string | null;
  hasOwner: boolean;
  isGuardCreatedQr: boolean;
  isFollowingCreator: boolean;
  creatorFollowLoading: boolean;
  creatorFollowerCount: number;
  isFollowing: boolean;
  followLoading: boolean;
  followCount: number;
  isQrOwner: boolean;
  onBack: () => void;
  onFollowCreator: () => void;
  onOpenCreatorFollowers: () => void;
  onWatch: () => void;
  onOverflowOpen: () => void;
  onDonate?: () => void;
}

export default function QrDetailNavBar({
  offlineMode,
  ownerName,
  hasOwner,
  isGuardCreatedQr,
  isFollowingCreator,
  creatorFollowLoading,
  creatorFollowerCount,
  isFollowing,
  followLoading,
  followCount,
  isQrOwner,
  onBack,
  onFollowCreator,
  onOpenCreatorFollowers,
  onWatch,
  onOverflowOpen,
  onDonate,
}: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <Animated.View entering={FadeInDown.delay(0).duration(260)} style={styles.navBar}>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 }}>
        <Animated.View entering={FadeIn.delay(30).duration(240)}>
          <Pressable onPress={onBack} style={styles.navBackBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        </Animated.View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.navTitle, { textAlign: "left" }]} numberOfLines={1}>
            QR Details
          </Text>
          {offlineMode && (
            <Text style={[navOfflineStyles.badge, { color: colors.warning }]}>● Offline</Text>
          )}
        </View>
      </View>

      <View style={styles.navActions}>
        {!isQrOwner && isGuardCreatedQr && hasOwner ? (
          /* BinRo QR — visitor sees Follow / Unfollow creator button */
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
        }

        {onDonate && (
          <Animated.View entering={FadeIn.delay(35).duration(240)}>
            <Pressable
              onPress={onDonate}
              style={({ pressed }) => [styles.navActionBtn, { opacity: pressed ? 0.7 : 1 }]}
              hitSlop={6}
            >
              <Ionicons name="heart-outline" size={20} color={colors.primary} />
            </Pressable>
          </Animated.View>
        )}
        <Animated.View entering={FadeIn.delay(40).duration(240)}>
          <Pressable
            onPress={onOverflowOpen}
            style={({ pressed }) => [styles.navActionBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
          </Pressable>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
