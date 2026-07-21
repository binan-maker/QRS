import React, { memo, type MutableRefObject } from "react";
import { View, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import type { LogoPosition } from "@/features/generator/types/form-types";
import QrPreview        from "./output/QrPreview";
import QrSecurityBadges from "./output/QrSecurityBadges";
import QrSavedBanner    from "./output/QrSavedBanner";
import QrOutputActions  from "./output/QrOutputActions";

interface Props {
  qrValue: string;
  qrSize: number;
  isBranded: boolean;
  privateMode: boolean;
  qrMode: "individual" | "private";
  logoPosition: LogoPosition;
  customLogoUri: string | null;
  showDefaultLogo: boolean;
  generatedUuid: string | null;
  generatedAt: Date | null;
  saving: boolean;
  savedToProfile: boolean;
  savedDocId?: string | null;
  user: any;
  svgRef: MutableRefObject<any>;
  logoPositionLabel: string;
  qrFgColor?: string;
  qrBgColor?: string;
  urlRiskScore?: number;
  urlRiskReasons?: string[];
  onSizeIncrease: () => void;
  onSizeDecrease: () => void;
  onCopy: () => void;
  onShare: () => void;
  onDownload: () => void;
  onClear: () => void;
  sharingQr?: boolean;
  downloadingPdf?: boolean;
}

function QrOutputCard({
  qrValue, qrSize, isBranded, privateMode, qrMode, logoPosition,
  customLogoUri, showDefaultLogo, generatedUuid, generatedAt,
  saving, savedToProfile, savedDocId, user, svgRef, logoPositionLabel,
  qrFgColor = "#0A0E17", qrBgColor = "#F8FAFC",
  urlRiskScore = 0, urlRiskReasons = [],
  onSizeIncrease, onSizeDecrease, onCopy, onShare, onDownload, onClear,
  sharingQr = false, downloadingPdf = false,
}: Props) {
  const { colors } = useTheme();
  const hasLogo = !!(customLogoUri || showDefaultLogo);

  return (
    <Animated.View
      entering={FadeInDown.delay(50).duration(260)}
      style={[styles.qrCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
    >
      <QrPreview
        qrValue={qrValue}
        qrSize={qrSize}
        qrFgColor={qrFgColor}
        qrBgColor={qrBgColor}
        logoPosition={logoPosition}
        customLogoUri={customLogoUri}
        showDefaultLogo={showDefaultLogo}
        svgRef={svgRef}
      />

      <QrSecurityBadges
        qrValue={qrValue}
        urlRiskScore={urlRiskScore}
        urlRiskReasons={urlRiskReasons}
        logoPosition={logoPosition}
        logoPositionLabel={logoPositionLabel}
        hasLogo={hasLogo}
      />

      <QrSavedBanner
        qrValue={qrValue}
        isBranded={isBranded}
        privateMode={privateMode}
        generatedUuid={generatedUuid}
        generatedAt={generatedAt}
        saving={saving}
        savedToProfile={savedToProfile}
        savedDocId={savedDocId}
      />

      <QrOutputActions
        qrValue={qrValue}
        qrSize={qrSize}
        onSizeIncrease={onSizeIncrease}
        onSizeDecrease={onSizeDecrease}
        onCopy={onCopy}
        onShare={onShare}
        onDownload={onDownload}
        onClear={onClear}
        sharingQr={sharingQr}
        downloadingPdf={downloadingPdf}
      />
    </Animated.View>
  );
}

export default memo(QrOutputCard);

const styles = StyleSheet.create({
  qrCard: { borderRadius: 20, borderWidth: 1, overflow: "hidden", marginBottom: 8 },
});
