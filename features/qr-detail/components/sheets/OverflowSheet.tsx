import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet from "@/components/ui/BottomSheet";
import { useTheme } from "@/contexts/ThemeContext";
import { overflowStyles } from "@/features/qr-detail/styles";

interface Props {
  visible: boolean;
  onClose: () => void;
  isFavorite: boolean;
  isFollowing: boolean;
  followLoading: boolean;
  hasOwner: boolean;
  onFavorite: () => void;
  onWatch: () => void;
  onReport: () => void;
}

export default function OverflowSheet({
  visible,
  onClose,
  isFavorite,
  isFollowing,
  followLoading,
  hasOwner,
  onFavorite,
  onWatch,
  onReport,
}: Props) {
  const { colors } = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose} sheetStyle={{ paddingHorizontal: 0 }}>
      {/* Favorites */}
      <Pressable
        style={overflowStyles.item}
        onPress={() => { onClose(); onFavorite(); }}
      >
        <View style={[overflowStyles.iconWrap, { backgroundColor: isFavorite ? colors.danger + "18" : colors.surfaceLight }]}>
          <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={20} color={isFavorite ? colors.danger : colors.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[overflowStyles.itemLabel, { color: colors.text }]}>
            {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          </Text>
          <Text style={[overflowStyles.itemSub, { color: colors.textMuted }]}>
            {isFavorite ? "Unpin this QR from your favorites" : "Save this QR for quick access"}
          </Text>
        </View>
        {isFavorite && <Ionicons name="checkmark-circle" size={16} color={colors.danger} />}
      </Pressable>

      <View style={[overflowStyles.separator, { backgroundColor: colors.surfaceBorder }]} />

      {/* Watch (only for owned QR — secondary action) */}
      {hasOwner && (
        <>
          <Pressable
            style={[overflowStyles.item, followLoading && { opacity: 0.5 }]}
            onPress={followLoading ? undefined : () => { onClose(); onWatch(); }}
          >
            <View style={[overflowStyles.iconWrap, { backgroundColor: isFollowing ? colors.primaryDim : colors.surfaceLight }]}>
              {followLoading ? (
                <ActivityIndicator size={18} color={isFollowing ? colors.primary : colors.textSecondary} />
              ) : (
                <Ionicons
                  name={isFollowing ? "notifications" : "notifications-outline"}
                  size={20}
                  color={isFollowing ? colors.primary : colors.textSecondary}
                />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[overflowStyles.itemLabel, { color: colors.text }]}>
                {isFollowing ? "Unwatch this QR" : "Watch this QR"}
              </Text>
              <Text style={[overflowStyles.itemSub, { color: colors.textMuted }]}>
                {isFollowing ? "Stop alerts for this specific QR" : "Get alerts when this QR changes"}
              </Text>
            </View>
            {isFollowing && !followLoading && (
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            )}
          </Pressable>
          <View style={[overflowStyles.separator, { backgroundColor: colors.surfaceBorder }]} />
        </>
      )}

      {/* Report */}
      <Pressable style={overflowStyles.item} onPress={() => { onClose(); onReport(); }}>
        <View style={[overflowStyles.iconWrap, { backgroundColor: colors.danger + "18" }]}>
          <Ionicons name="flag-outline" size={20} color={colors.danger} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[overflowStyles.itemLabel, { color: colors.danger }]}>Report QR</Text>
          <Text style={[overflowStyles.itemSub, { color: colors.textMuted }]}>Flag this QR as suspicious or harmful</Text>
        </View>
      </Pressable>
    </BottomSheet>
  );
}
