import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";

export function StandardQrBanner({
  loading,
  ready,
  ownerName,
  isActive,
  qrId,
}: {
  loading: boolean;
  ready: boolean;
  ownerName: string | null;
  isActive: boolean;
  qrId?: string;
}) {
  const { colors, isDark } = useTheme();
  const [showId, setShowId] = useState(false);
  const accent = "#22c55e";

  return (
    <Animated.View entering={FadeInDown.delay(60).duration(260)} style={{ marginBottom: 4 }}>
      <View style={{
        borderRadius: 12,
        borderWidth: 1,
        borderColor: accent + "28",
        backgroundColor: isDark ? "#0a1a0e" : "#f0fdf4",
        overflow: "hidden",
      }}>
        {/* Main row */}
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 10,
          paddingHorizontal: 12, paddingVertical: 10,
        }}>
          <View style={{
            width: 30, height: 30, borderRadius: 9,
            backgroundColor: accent + "20",
            alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            {loading
              ? <ActivityIndicator size="small" color={accent} />
              : <Ionicons name="shield-checkmark" size={16} color={accent} />
            }
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: accent }}>
              Protected by QR Guard
            </Text>
            {!loading && ownerName ? (
              <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 1 }} numberOfLines={1}>
                {ownerName}
              </Text>
            ) : null}
          </View>

          {!loading && !isActive && (
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 4,
              backgroundColor: colors.dangerDim, borderRadius: 8,
              paddingHorizontal: 7, paddingVertical: 3,
            }}>
              <Ionicons name="ban-outline" size={12} color={colors.danger} />
              <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.danger }}>Deactivated</Text>
            </View>
          )}

          {!loading && ready && qrId && (
            <Pressable
              onPress={() => setShowId((v) => !v)}
              style={({ pressed }) => [{
                flexDirection: "row", alignItems: "center", gap: 4,
                paddingHorizontal: 8, paddingVertical: 4,
                borderRadius: 8, borderWidth: 1,
                borderColor: accent + "35",
                backgroundColor: showId ? accent + "18" : "transparent",
                opacity: pressed ? 0.75 : 1,
              }]}
            >
              <Ionicons name={showId ? "eye-off-outline" : "eye-outline"} size={12} color={accent} />
              <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: accent }}>
                {showId ? "Hide ID" : "QR ID"}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Collapsible QR ID row */}
        {showId && qrId && (
          <Animated.View
            entering={FadeIn.duration(160)}
            style={{
              borderTopWidth: 1,
              borderTopColor: accent + "20",
              paddingHorizontal: 12, paddingVertical: 8,
              flexDirection: "row", alignItems: "center", gap: 8,
              backgroundColor: accent + "08",
            }}
          >
            <Ionicons name="qr-code-outline" size={13} color={colors.textMuted} />
            <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.textMuted, flex: 1 }} selectable numberOfLines={1}>
              {qrId}
            </Text>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}
