import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { makeStyles } from "@/features/qr-detail/styles";
import { navOfflineStyles } from "@/features/qr-detail/styles";
interface Props {
  offlineMode: boolean;
  ownerName: string | null;
  hasOwner: boolean;
  isGuardCreatedQr: boolean;
  isQrOwner: boolean;
  onBack: () => void;
  onOverflowOpen: () => void;
  onDonate?: () => void;
}

export default function QrDetailNavBar({
  offlineMode,
  ownerName,
  hasOwner,
  isGuardCreatedQr,
  isQrOwner,
  onBack,
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
