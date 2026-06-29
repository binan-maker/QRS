import React, { memo } from "react";
import { View, Image, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { shadow } from "@/shared/utils/platform";
import type { LogoPosition } from "@/features/generator/types/form-types";

interface Props {
  qrValue: string;
  qrSize: number;
  qrFgColor: string;
  qrBgColor: string;
  logoPosition: LogoPosition;
  customLogoUri: string | null;
  showDefaultLogo: boolean;
  svgRef: React.MutableRefObject<any>;
}

function QrPreview({
  qrValue, qrSize, qrFgColor, qrBgColor,
  logoPosition, customLogoUri, showDefaultLogo, svgRef,
}: Props) {
  const logoSource = customLogoUri
    ? { uri: customLogoUri }
    : showDefaultLogo
    ? require("../../../../assets/images/icon.png")
    : undefined;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.qrBg, { backgroundColor: qrBgColor }]}>
        <QRCode
          value={qrValue}
          size={qrSize}
          color={qrFgColor}
          backgroundColor={qrBgColor}
          getRef={(ref: any) => { svgRef.current = ref; }}
          logo={logoPosition === "center" ? logoSource : undefined}
          logoSize={customLogoUri ? 54 : showDefaultLogo ? 48 : undefined}
          logoBackgroundColor={qrBgColor}
          logoBorderRadius={customLogoUri ? 27 : 10}
          logoMargin={4}
          quietZone={10}
          ecl="H"
        />
        {logoSource && logoPosition !== "center" && (
          <View
            style={[
              styles.cornerLogoWrapper,
              { pointerEvents: "none" },
              logoPosition === "top-left"     && { top: 10, left: 10 },
              logoPosition === "top-right"    && { top: 10, right: 10 },
              logoPosition === "bottom-left"  && { bottom: 10, left: 10 },
              logoPosition === "bottom-right" && { bottom: 10, right: 10 },
            ]}
          >
            <Image
              source={customLogoUri ? { uri: customLogoUri } : require("../../../../assets/images/icon.png")}
              style={styles.cornerLogoImage}
            />
          </View>
        )}
      </View>
    </View>
  );
}

export default memo(QrPreview);

const styles = StyleSheet.create({
  wrapper: { alignItems: "center", paddingVertical: 14, paddingHorizontal: 16 },
  qrBg: {
    borderRadius: 16, padding: 12, position: "relative",
    ...shadow(10, "#000", 0.15, 0, 4, 6),
  },
  cornerLogoWrapper: {
    position: "absolute", width: 40, height: 40, borderRadius: 10,
    backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(0,0,0,0.08)",
  },
  cornerLogoImage: { width: 34, height: 34, borderRadius: 8 },
});
