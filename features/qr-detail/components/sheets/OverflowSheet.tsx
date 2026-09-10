import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet from "@/shared/components/ui/BottomSheet";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { overflowStyles } from "@/features/qr-detail/styles";

interface Props {
  visible: boolean;
  onClose: () => void;
  isFavorite: boolean;
  hasOwner: boolean;
  onFavorite: () => void;
  onReport: () => void;
}

export default function OverflowSheet({
  visible,
  onClose,
  isFavorite,
  hasOwner,
  onFavorite,
  onReport,
}: Props) {
  const { colors } = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose} sheetStyle={{ paddingHorizontal: 0 }} extraBottomPadding={20}>
        <View style={{ paddingBottom: 12 }}>
        {/* Favorites */}
        <Pressable
           style={[overflowStyles.item, { paddingVertical: 18 }]}
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

        {/* Report */}
      <Pressable
          style={[overflowStyles.item, { paddingVertical: 18 }]}
          onPress={() => { onClose(); onReport(); }}
        >
          <View style={[overflowStyles.iconWrap, { backgroundColor: colors.danger + "18" }]}>
            <Ionicons name="flag-outline" size={20} color={colors.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[overflowStyles.itemLabel, { color: colors.danger }]}>Report QR</Text>
            <Text style={[overflowStyles.itemSub, { color: colors.textMuted }]}>Flag this QR as suspicious or harmful</Text>
          </View>
        </Pressable>
       </View>
    </BottomSheet>
  );
}
