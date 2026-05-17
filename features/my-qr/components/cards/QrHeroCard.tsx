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
  const { colors } = useTheme();
  const { rf, sp } = useScaleFns();

  // Only show the destination hint for URL-like content — never show raw
  // mailto:, tel:, sms:, etc. schemes as they read as ugly protocol strings.
  const rawDest = !isPrivateDest ? (guardDest || standardRawContent || null) : null;
  const dest = rawDest && /^https?:\/\//i.test(rawDest) ? rawDest : null;

  return (
    <Animated.View entering={FadeIn.duration(160)}>
      <View style={{
        borderRadius: sp(24), borderWidth: 1, borderColor: colors.surfaceBorder,
        backgroundColor: colors.surface, marginBottom: sp(14), overflow: "hidden",
      }}>
        <LinearGradient
          colors={[ctMeta.color + "18", ctMeta.color + "04"]}
          style={{ paddingTop: sp(22), paddingHorizontal: sp(20), paddingBottom: sp(18), alignItems: "center" }}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          {/* Paused badge — only rendered when the QR is inactive */}
          {!isActive && (
            <View style={{
              flexDirection: "row", alignItems: "center", gap: sp(4),
              alignSelf: "flex-end", marginBottom: sp(16),
              borderRadius: sp(10), paddingHorizontal: sp(9), paddingVertical: sp(4),
              backgroundColor: "#ef444414",
            }}>
              <View style={{ width: sp(5), height: sp(5), borderRadius: sp(3), backgroundColor: "#ef4444" }} />
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", color: "#ef4444" }}>Paused</Text>
            </View>
          )}

          {/* QR Code */}
          <View style={{
            borderRadius: sp(18), overflow: "hidden",
            padding: sp(14), backgroundColor: bgColor,
            shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.10, shadowRadius: 12, elevation: 5,
          }}>
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
          <Text style={{
            fontSize: rf(16), fontFamily: "Inter_700Bold",
            color: colors.text, marginTop: sp(16), textAlign: "center",
          }} numberOfLines={2}>
            {displayTitle.length > 50 ? displayTitle.slice(0, 50) + "…" : displayTitle}
          </Text>

          {/* Destination hint */}
          {dest && (
            <Text style={{
              fontSize: rf(11), fontFamily: "Inter_400Regular",
              color: colors.textMuted, marginTop: sp(4), textAlign: "center",
            }} numberOfLines={1}>
              {dest.length > 44 ? dest.slice(0, 44) + "…" : dest}
            </Text>
          )}
        </LinearGradient>

        {/* Action buttons */}
        <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.surfaceBorder }}>
          {([
            { icon: "share-outline",   label: "Share",    onPress: onShare,       busy: sharingQr },
            { icon: "download-outline", label: "Save PDF", onPress: onDownloadPdf, busy: downloadingPdf },
            { icon: "copy-outline",    label: "Copy",     onPress: onCopy,        busy: false },
          ] as const).map((btn, i) => (
            <Pressable
              key={btn.label}
              onPress={btn.onPress}
              disabled={btn.busy}
              style={({ pressed }) => [{
                flex: 1, alignItems: "center", gap: sp(4), paddingVertical: sp(14),
                borderRightWidth: i < 2 ? 1 : 0, borderRightColor: colors.surfaceBorder,
                opacity: pressed || btn.busy ? 0.55 : 1,
              }]}
            >
              {btn.busy
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Ionicons name={btn.icon as any} size={rf(19)} color={colors.primary} />
              }
              <Text style={{ fontSize: rf(10), fontFamily: "Inter_600SemiBold", color: colors.primary }}>
                {btn.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}
