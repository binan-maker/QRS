import type { MutableRefObject } from "react";
import { View, Text, Pressable, ActivityIndicator, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useScaleFns } from "@/shared/hooks/useScaleFns";
import type { LogoPosition } from "@/features/my-qr/hooks/useQrDesign";
import { DEFAULT_QR_URL } from "@/config/app";

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
  isActive: boolean;
  isDynamic: boolean;
  fgColor: string;
  bgColor: string;
  svgRef: MutableRefObject<any>;
  guardDest?: string;
  isPrivateDest?: boolean;
  standardRawContent?: string;
  sharingQr: boolean;
  downloadingPdf: boolean;
  onShare: () => void;
  onDownloadPdf: () => void;
  onCopy: () => void;
  customLogoUri?: string | null;
  showDefaultLogo?: boolean;
  logoPosition?: LogoPosition;
}

export default function QrHeroCard({
  qrContent, displayTitle, ctMeta, isActive, isDynamic,
  fgColor, bgColor, svgRef, guardDest, isPrivateDest, standardRawContent,
  sharingQr, downloadingPdf, onShare, onDownloadPdf, onCopy,
  customLogoUri, showDefaultLogo, logoPosition = "center",
}: Props) {
  const { colors, isDark } = useTheme();
  const { rf, sp } = useScaleFns();

  const rawDest = !isPrivateDest ? (guardDest || standardRawContent || null) : null;
  const dest = (() => {
    if (!rawDest || !/^https?:\/\//i.test(rawDest)) return null;
    try {
      const { pathname } = new URL(rawDest);
      if (/^\/(q|go|guard)\/[A-Za-z0-9_-]/.test(pathname)) return null;
    } catch { return null; }
    return rawDest;
  })();

  const logoSource = customLogoUri
    ? { uri: customLogoUri }
    : showDefaultLogo
    ? require("../../../../assets/images/icon.png")
    : undefined;

  const qrSize = sp(180);

  const ACTIONS = [
    { icon: "share-outline",    label: "Share",    onPress: onShare,       busy: sharingQr,      iconLib: "Ionicons" },
    { icon: "download-outline", label: "Save PDF", onPress: onDownloadPdf, busy: downloadingPdf, iconLib: "Ionicons" },
    { icon: "copy-outline",     label: "Copy",     onPress: onCopy,        busy: false,          iconLib: "Ionicons" },
  ] as const;

  return (
    <Animated.View entering={FadeIn.duration(160)}>
      <View style={{
        borderRadius: sp(24), borderWidth: 1, borderColor: colors.surfaceBorder,
        backgroundColor: colors.surface, marginBottom: sp(14), overflow: "hidden",
      }}>
        {/* Hero gradient area */}
        <LinearGradient
          colors={[ctMeta.color + "15", ctMeta.color + "04", "transparent"]}
          style={{ paddingTop: sp(22), paddingHorizontal: sp(20), paddingBottom: sp(20), alignItems: "center" }}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          {/* Status badge */}
          {!isActive && (
            <View style={{
              flexDirection: "row", alignItems: "center", gap: sp(5),
              alignSelf: "flex-end", marginBottom: sp(14),
              borderRadius: sp(20), paddingHorizontal: sp(10), paddingVertical: sp(4),
              backgroundColor: "#ef444418", borderWidth: 1, borderColor: "#ef444430",
            }}>
              <View style={{ width: sp(5), height: sp(5), borderRadius: sp(3), backgroundColor: "#ef4444" }} />
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", color: "#ef4444" }}>Paused</Text>
            </View>
          )}

          {/* Dynamic badge */}
          {isDynamic && isActive && (
            <View style={{
              flexDirection: "row", alignItems: "center", gap: sp(4),
              alignSelf: "flex-end", marginBottom: sp(14),
              borderRadius: sp(20), paddingHorizontal: sp(9), paddingVertical: sp(3),
              backgroundColor: ctMeta.color + "18", borderWidth: 1, borderColor: ctMeta.color + "30",
            }}>
              <View style={{ width: sp(5), height: sp(5), borderRadius: sp(3), backgroundColor: ctMeta.color }} />
              <Text style={{ fontSize: rf(10), fontFamily: "Inter_600SemiBold", color: ctMeta.color }}>Dynamic</Text>
            </View>
          )}

          {/* QR Code */}
          <View style={{
            borderRadius: sp(20), overflow: "hidden",
            padding: sp(14), backgroundColor: bgColor,
            shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
            shadowOpacity: isDark ? 0.35 : 0.12, shadowRadius: 16, elevation: 8,
            position: "relative",
          }}>
            <QRCode
              getRef={(ref: any) => { svgRef.current = ref; }}
              value={qrContent || DEFAULT_QR_URL}
              size={qrSize}
              color={fgColor}
              backgroundColor={bgColor}
              logo={logoPosition === "center" ? logoSource : undefined}
              logoSize={customLogoUri ? 54 : showDefaultLogo ? 48 : undefined}
              logoBackgroundColor={bgColor}
              logoBorderRadius={customLogoUri ? 27 : 10}
              logoMargin={4}
              quietZone={8}
              ecl="H"
            />
            {logoSource && logoPosition !== "center" && (
              <View style={[
                {
                  position: "absolute",
                  width: 40, height: 40, borderRadius: 10,
                  backgroundColor: bgColor,
                  alignItems: "center", justifyContent: "center",
                  borderWidth: 1, borderColor: "rgba(0,0,0,0.08)",
                },
                logoPosition === "top-left"     && { top: sp(14) + 10, left: sp(14) + 10 },
                logoPosition === "top-right"    && { top: sp(14) + 10, right: sp(14) + 10 },
                logoPosition === "bottom-left"  && { bottom: sp(14) + 10, left: sp(14) + 10 },
                logoPosition === "bottom-right" && { bottom: sp(14) + 10, right: sp(14) + 10 },
              ]}>
                <Image
                  source={customLogoUri ? { uri: customLogoUri } : require("../../../../assets/images/icon.png")}
                  style={{ width: 34, height: 34, borderRadius: 8 }}
                />
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={{
            fontSize: rf(16), fontFamily: "Inter_700Bold",
            color: colors.text, marginTop: sp(18), textAlign: "center", letterSpacing: -0.2,
          }} numberOfLines={2}>
            {displayTitle.length > 50 ? displayTitle.slice(0, 50) + "…" : displayTitle}
          </Text>

          {/* Type label */}
          <View style={{
            flexDirection: "row", alignItems: "center", gap: sp(5), marginTop: sp(6),
            backgroundColor: ctMeta.color + "14", borderRadius: sp(20),
            paddingHorizontal: sp(10), paddingVertical: sp(4),
          }}>
            <View style={{ width: sp(6), height: sp(6), borderRadius: sp(3), backgroundColor: ctMeta.color }} />
            <Text style={{ fontSize: rf(11), fontFamily: "Inter_500Medium", color: ctMeta.color }}>
              {ctMeta.label}
            </Text>
          </View>

          {dest && (
            <Text style={{
              fontSize: rf(11), fontFamily: "Inter_400Regular",
              color: colors.textMuted, marginTop: sp(8), textAlign: "center",
            }} numberOfLines={1}>
              {dest.length > 44 ? dest.slice(0, 44) + "…" : dest}
            </Text>
          )}
        </LinearGradient>

        {/* Action row */}
        <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.surfaceBorder }}>
          {ACTIONS.map((btn, i) => (
            <Pressable
              key={btn.label}
              onPress={btn.onPress}
              disabled={btn.busy}
              style={({ pressed }) => [{
                flex: 1, alignItems: "center", gap: sp(5), paddingVertical: sp(14),
                borderRightWidth: i < 2 ? 1 : 0, borderRightColor: colors.surfaceBorder,
                opacity: pressed || btn.busy ? 0.5 : 1,
                backgroundColor: pressed ? (isDark ? colors.surfaceLight : colors.background) : "transparent",
              }]}
            >
              {btn.busy
                ? <ActivityIndicator size="small" color={colors.textMuted} />
                : <Ionicons name={btn.icon as any} size={rf(18)} color={colors.text} />
              }
              <Text style={{ fontSize: rf(10), fontFamily: "Inter_500Medium", color: colors.textSecondary }}>
                {btn.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}
