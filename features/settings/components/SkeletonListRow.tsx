import { View } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import SkeletonBox from "@/components/ui/SkeletonBox";

export default function SkeletonListRow() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceBorder,
      }}
    >
      <SkeletonBox width={40} height={40} borderRadius={12} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBox width="70%" height={12} />
        <SkeletonBox width="40%" height={10} />
      </View>
    </View>
  );
}
