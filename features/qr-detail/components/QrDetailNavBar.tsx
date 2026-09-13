import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { makeStyles } from "@/features/qr-detail/styles";
import { navOfflineStyles } from "@/features/qr-detail/styles";
interface Props {
  offlineMode: boolean;
  onBack: () => void;
  onShare: () => void;
  onOverflowOpen: () => void;
}

export default function QrDetailNavBar({
  offlineMode,
  onBack,
  onShare,
  onOverflowOpen,
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
        <Animated.View entering={FadeIn.delay(35).duration(240)}>
          <Pressable
            accessibilityLabel="Share QR details"
            accessibilityRole="button"
            onPress={onShare}
            style={({ pressed }) => [styles.navActionBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="share-social-outline" size={20} color={colors.text} />
          </Pressable>
        </Animated.View>
        <Animated.View entering={FadeIn.delay(40).duration(240)}>
          <Pressable
            accessibilityLabel="More QR detail actions"
            accessibilityRole="button"
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
