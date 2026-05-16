import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { useScaleFns } from "@/lib/utils/use-scale";

interface ContentTypeMeta {
  color: string;
  icon: string;
  label: string;
  bg?: string;
}

interface Props {
  qrContent: string;
  displayTitle: string;
  ctMeta: ContentTypeMeta;
  isBusiness: boolean;
  isActive: boolean;
  isDynamic: boolean;
  fgColor: string;
  bgColor: string;
  svgRef: React.MutableRefObject<any>;
  guardDest?: string;
  isPrivateDest?: boolean;
  standardRawContent?: string;
  sharingQr: boolean;
  downloadingPdf: boolean;
  onShare: () => void;
  onDownloadPdf: () => void;
  onCopy: () => void;
}

export default function QrHeroCard({
  qrContent, displayTitle, ctMeta, isBusiness, isActive, isDynamic,
  fgColor, bgColor, svgRef, guardDest, isPrivateDest, standardRawContent,
  sharingQr, downloadingPdf, onShare, onDownloadPdf, onCopy,
}: Props) {
  const { colors, isDark } = useTheme();
  const { rf, sp } = useScaleFns();

  return (
    <Animated.View entering={FadeIn.duration(350)}>
      <View style={{ borderRadius: sp(24), borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, marginBottom: sp(14), overflow: "hidden" }}>
        <LinearGradient
          colors={[ctMeta.color + "22", ctMeta.color + "06"]}
          style={{ paddingTop: sp(20), paddingHorizontal: sp(20), paddingBottom: sp(14), alignItems: "center" }}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          {/* Status badges */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp(6), marginBottom: sp(16) }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(4), borderRadius: sp(8), paddingHorizontal: sp(8), paddingVertical: sp(3), backgroundColor: ctMeta.color + "20", borderWidth: 1, borderColor: ctMeta.color + "30" }}>
              <Ionicons name={ctMeta.icon as any} size={rf(10)} color={ctMeta.color} />
              <Text style={{ fontSize: rf(10), fontFamily: "Inter_700Bold", color: ctMeta.color }}>{ctMeta.label}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(4), borderRadius: sp(8), paddingHorizontal: sp(8), paddingVertical: sp(3), backgroundColor: isBusiness ? colors.warningDim : colors.primaryDim }}>
              <Ionicons name={isBusiness ? "storefront" : "person"} size={rf(10)} color={isBusiness ? colors.warning : colors.primary} />
              <Text style={{ fontSize: rf(10), fontFamily: "Inter_700Bold", color: isBusiness ? colors.warning : colors.primary }}>{isBusiness ? "Business" : "Individual"}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(4), borderRadius: sp(8), paddingHorizontal: sp(8), paddingVertical: sp(3), backgroundColor: isActive ? "#22c55e18" : "#ef444418" }}>
              <View style={{ width: sp(5), height: sp(5), borderRadius: sp(3), backgroundColor: isActive ? "#22c55e" : "#ef4444" }} />
              <Text style={{ fontSize: rf(10), fontFamily: "Inter_700Bold", color: isActive ? "#22c55e" : "#ef4444" }}>{isActive ? "Active" : "Inactive"}</Text>
            </View>
            {isDynamic && (
              <View style={{ borderRadius: sp(8), paddingHorizontal: sp(8), paddingVertical: sp(3), backgroundColor: "#6366F118", borderWidth: 1, borderColor: "#6366F130" }}>
                <Text style={{ fontSize: rf(10), fontFamily: "Inter_700Bold", color: "#6366F1" }}>Dynamic</Text>
              </View>
            )}
          </View>

          {/* QR Code */}
          <View style={{ borderRadius: sp(20), overflow: "hidden", padding: sp(16), backgroundColor: bgColor, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 }}>
            <QRCode
              getRef={(ref: any) => { svgRef.current = ref; }}
              value={qrContent || "https://qrguard.app"}
              size={sp(180)}
              color={fgColor}
              backgroundColor={bgColor}
              quietZone={8}
              ecl="M"
            />
          </View>

          {/* Title */}
          <Text style={{ fontSize: rf(16), fontFamily: "Inter_700Bold", color: colors.text, marginTop: sp(14), textAlign: "center" }} numberOfLines={2}>
            {displayTitle.length > 50 ? displayTitle.slice(0, 50) + "…" : displayTitle}
          </Text>

          {/* Live destination */}
          {isDynamic && guardDest && !isPrivateDest && (
            <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: sp(3), textAlign: "center" }} numberOfLines={1}>
              → {guardDest.length > 44 ? guardDest.slice(0, 44) + "…" : guardDest}
            </Text>
          )}
          {isDynamic && standardRawContent && (
            <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: sp(3), textAlign: "center" }} numberOfLines={1}>
              → {standardRawContent.length > 44 ? standardRawContent.slice(0, 44) + "…" : standardRawContent}
            </Text>
          )}
        </LinearGradient>

        {/* Action buttons */}
        <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.surfaceBorder }}>
          {([
            { icon: "share-outline", label: "Share", onPress: onShare, busy: sharingQr },
            { icon: "download-outline", label: "Save PDF", onPress: onDownloadPdf, busy: downloadingPdf },
            { icon: "copy-outline", label: "Copy", onPress: onCopy, busy: false },
          ] as const).map((btn, i) => (
            <Pressable
              key={btn.label}
              onPress={btn.onPress}
              disabled={btn.busy}
              style={({ pressed }) => [{
                flex: 1, alignItems: "center", gap: sp(4), paddingVertical: sp(14),
                borderRightWidth: i < 2 ? 1 : 0, borderRightColor: colors.surfaceBorder,
                opacity: pressed || btn.busy ? 0.6 : 1,
              }]}
            >
              {btn.busy
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Ionicons name={btn.icon as any} size={rf(19)} color={colors.primary} />
              }
              <Text style={{ fontSize: rf(10), fontFamily: "Inter_600SemiBold", color: colors.primary }}>{btn.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}
