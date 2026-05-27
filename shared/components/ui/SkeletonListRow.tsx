import { View, ViewStyle } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import SkeletonBox from "@/shared/components/ui/SkeletonBox";

interface Props {
  iconSize?: number;
  containerStyle?: ViewStyle;
}

export default function SkeletonListRow({ iconSize = 40, containerStyle }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.surfaceBorder,
        },
        containerStyle,
      ]}
    >
      <SkeletonBox width={iconSize} height={iconSize} borderRadius={12} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBox width="70%" height={12} />
        <SkeletonBox width="40%" height={10} />
      </View>
    </View>
  );
}
