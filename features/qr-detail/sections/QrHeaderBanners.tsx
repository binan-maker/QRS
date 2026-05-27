import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";

interface Props {
  offlineMode: boolean;
  hasOwner: boolean;
  isDeactivated: boolean;
  deactivationMsg: string | null;
  isDark: boolean;
  colors: any;
}

export function QrHeaderBanners({ offlineMode, hasOwner, isDeactivated, deactivationMsg, isDark, colors }: Props) {
  return (
    <>
      {!offlineMode && !hasOwner && (
        <Animated.View entering={FadeInDown.delay(30).duration(260)}>
          <View style={[styles.externalBadge, {
            backgroundColor: isDark ? "#1a1208" : "#fffbeb",
            borderColor: "#f59e0b30",
          }]}>
            <Ionicons name="scan-outline" size={14} color="#f59e0b" />
            <Text style={[styles.externalBadgeText, { color: "#f59e0b" }]}>
              External QR Code · Scanned from the wild
            </Text>
          </View>
        </Animated.View>
      )}

      {isDeactivated && (
        <Animated.View entering={FadeInDown.delay(30).duration(260)}>
          <View style={[styles.deactivatedBanner, { borderColor: "#ef444440" }]}>
            <LinearGradient
              colors={["rgba(239,68,68,0.18)", "rgba(239,68,68,0.08)"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.deactivatedIconWrap}>
              <Ionicons name="ban" size={22} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.deactivatedTitle, { color: colors.text }]}>QR Code Deactivated</Text>
              <Text style={[styles.deactivatedSub, { color: colors.textSecondary }]}>
                {deactivationMsg || "The owner has turned off this QR code. Links and actions are disabled."}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  externalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  externalBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  deactivatedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    overflow: "hidden",
  },
  deactivatedIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(239,68,68,0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  deactivatedTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  deactivatedSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
});
