import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { useScaleFns } from "@/lib/utils/use-scale";
import type { ContentDetailRow } from "@/lib/services/qr-display-utils";

interface ContentTypeMeta {
  color: string;
  icon: string;
  label: string;
}

interface Props {
  ctMeta: ContentTypeMeta;
  effectiveContentType: string;
  isDynamic: boolean;
  isBusiness: boolean;
  contentRows: ContentDetailRow[];
  liveRaw: string | null;
  isGuardQr: boolean;
  guardLink: any | null;
  standardLink: any | null;
}

export default function QrContentInfoCard({
  ctMeta, effectiveContentType, isDynamic, isBusiness, contentRows, liveRaw, isGuardQr, guardLink, standardLink,
}: Props) {
  const { colors, isDark } = useTheme();
  const { rf, sp } = useScaleFns();

  return (
    <Animated.View entering={FadeInDown.duration(350).delay(65)}>
      <View style={{ borderRadius: sp(18), borderWidth: 1.5, borderColor: ctMeta.color + "35", backgroundColor: isDark ? ctMeta.color + "10" : ctMeta.color + "0A", padding: sp(16), marginBottom: sp(14) }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp(10), marginBottom: sp(14) }}>
          <View style={{ width: sp(40), height: sp(40), borderRadius: sp(12), backgroundColor: ctMeta.color + "18", borderWidth: 1, borderColor: ctMeta.color + "30", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={ctMeta.icon as any} size={rf(20)} color={ctMeta.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: ctMeta.color }}>{ctMeta.label} QR Code</Text>
            <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 1 }}>
              {isDynamic
                ? (isBusiness ? "Smart Redirect — destination is updatable" : "Protected redirect — content is updatable")
                : "Content is directly encoded in this QR"}
            </Text>
          </View>
          {isDynamic && (
            <View style={{ borderRadius: sp(8), paddingHorizontal: sp(7), paddingVertical: sp(3), backgroundColor: "#6366F115", borderWidth: 1, borderColor: "#6366F130" }}>
              <Ionicons name="git-branch-outline" size={rf(12)} color="#6366F1" />
            </View>
          )}
        </View>

        {/* Loading for dynamic */}
        {isDynamic && !liveRaw && (isGuardQr ? !guardLink : !standardLink) && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp(8), paddingVertical: sp(8) }}>
            <ActivityIndicator size="small" color={ctMeta.color} />
            <Text style={{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: colors.textMuted }}>Loading content details…</Text>
          </View>
        )}

        {/* Content rows */}
        {contentRows.length > 0 ? (
          contentRows.map((row, idx) => (
            <View key={idx} style={{ flexDirection: "row", alignItems: "flex-start", gap: sp(10), paddingVertical: sp(10), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: ctMeta.color + "25" }}>
              <View style={{ width: sp(30), height: sp(30), borderRadius: sp(9), backgroundColor: ctMeta.color + "15", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: sp(1) }}>
                <Ionicons name={row.icon as any} size={rf(14)} color={ctMeta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: rf(10), fontFamily: "Inter_600SemiBold", color: ctMeta.color, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: sp(2) }}>{row.label}</Text>
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_500Medium", color: colors.text, lineHeight: rf(19) }} selectable>{row.value}</Text>
              </View>
            </View>
          ))
        ) : (
          !isDynamic && (
            <View style={{ paddingVertical: sp(6), paddingLeft: sp(2) }}>
              <Text style={{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: colors.textMuted, lineHeight: rf(18) }}>
                {effectiveContentType === "contact"
                  ? "vCard contact encoded in this QR — scan to save to contacts"
                  : effectiveContentType === "event" || effectiveContentType === "calendar"
                    ? "Calendar event encoded in this QR — scan to add to calendar"
                    : "Content encoded directly in the QR code"}
              </Text>
            </View>
          )
        )}

        {/* Dynamic fallback row */}
        {isDynamic && liveRaw && contentRows.length === 0 && (
          <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: ctMeta.color + "25", paddingTop: sp(10) }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: sp(10) }}>
              <View style={{ width: sp(30), height: sp(30), borderRadius: sp(9), backgroundColor: ctMeta.color + "15", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Ionicons name="link-outline" size={rf(14)} color={ctMeta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: rf(10), fontFamily: "Inter_600SemiBold", color: ctMeta.color, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: sp(2) }}>Destination</Text>
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_500Medium", color: colors.text }} selectable numberOfLines={2}>{liveRaw}</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
