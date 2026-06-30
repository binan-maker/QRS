import { View, Text, Pressable, ActivityIndicator, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useScaleFns } from "@/shared/utils/use-scale";
import type { LogoPosition } from "@/features/my-qr/hooks/useQrDesign";

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
  customLogoUri?: string | null;
  showDefaultLogo?: boolean;
  logoPosition?: LogoPosition;
}

export default function QrHeroCard({
  qrContent, displayTitle, ctMeta, isBusiness, isActive, isDynamic,
  fgColor, bgColor, svgRef, guardDest, isPrivateDest, standardRawContent,
  sharingQr, downloadingPdf, onShare, onDownloadPdf, onCopy,
  customLogoUri, showDefaultLogo, logoPosition = "center",
}: Props) {
  const { colors } = useTheme();
  const { rf, sp } = useScaleFns();

  const rawDest = !isPrivateDest ? (guardDest || standardRawContent || null) : null;
  const dest = rawDest && /^https?:\/\//i.test(rawDest) ? rawDest : null;

  const logoSource = customLogoUri
    ? { uri: customLogoUri }
    : showDefaultLogo
    ? require("../../../../assets/images/icon.png")
    : undefined;

  const qrSize = sp(180);

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

          {/* QR Code with logo */}
          <View style={{
            borderRadius: sp(18), overflow: "hidden",
            padding: sp(14), backgroundColor: bgColor,
            shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.10, shadowRadius: 12, elevation: 5,
            position: "relative",
          }}>
            <QRCode
              getRef={(ref: any) => { svgRef.current = ref; }}
              value={qrContent || "https://qrguard.app"}
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

          <Text style={{
            fontSize: rf(16), fontFamily: "Inter_700Bold",
            color: colors.text, marginTop: sp(16), textAlign: "center",
          }} numberOfLines={2}>
            {displayTitle.length > 50 ? displayTitle.slice(0, 50) + "…" : displayTitle}
          </Text>

          {dest && (
            <Text style={{
              fontSize: rf(11), fontFamily: "Inter_400Regular",
              color: colors.textMuted, marginTop: sp(4), textAlign: "center",
            }} numberOfLines={1}>
              {dest.length > 44 ? dest.slice(0, 44) + "…" : dest}
            </Text>
          )}
        </LinearGradient>

        <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.surfaceBorder }}>
          {([
            { icon: "share-outline",    label: "Share",    onPress: onShare,       busy: sharingQr },
            { icon: "download-outline", label: "Save PDF", onPress: onDownloadPdf, busy: downloadingPdf },
            { icon: "copy-outline",     label: "Copy",     onPress: onCopy,        busy: false },
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
