import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet from "@/shared/components/ui/BottomSheet";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { commentMenuStyles } from "@/features/qr-detail/styles";

interface Props {
  visible: boolean;
  isOwner: boolean;
  onClose: () => void;
  onDelete: () => void;
  onReport: () => void;
}

export default function CommentMenuSheet({ visible, isOwner, onClose, onDelete, onReport }: Props) {
  const { colors } = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose} sheetStyle={{ paddingHorizontal: 0 }}>
      {isOwner ? (
        <Pressable onPress={onDelete} style={commentMenuStyles.menuItem}>
          <View style={[commentMenuStyles.menuIconWrap, { backgroundColor: (colors as any).dangerDim ?? (colors.danger + "15") }]}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </View>
          <Text style={[commentMenuStyles.menuLabel, { color: colors.danger }]}>Delete comment</Text>
        </Pressable>
      ) : (
        <Pressable onPress={onReport} style={commentMenuStyles.menuItem}>
          <View style={[commentMenuStyles.menuIconWrap, { backgroundColor: (colors as any).warningDim ?? (colors.warning + "15") }]}>
            <Ionicons name="flag-outline" size={20} color={colors.warning} />
          </View>
          <Text style={[commentMenuStyles.menuLabel, { color: colors.text }]}>Report comment</Text>
        </Pressable>
      )}
      <Pressable onPress={onClose} style={commentMenuStyles.cancelBtn}>
        <Text style={[commentMenuStyles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
      </Pressable>
    </BottomSheet>
  );
}
