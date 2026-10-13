import React from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import ReAnimated, { FadeIn } from "react-native-reanimated";
import { FINDER_SIZE } from "@/features/scanner/hooks/useCameraControls";
import { useOverlayAnimations } from "@/features/scanner/hooks/useOverlayAnimations";
import FinderFrame from "./FinderFrame";
import OverlayTopBar from "./OverlayTopBar";
import OverlayBottomBar from "./OverlayBottomBar";

interface Props {
  topInset: number;
  bottomInset: number;
  flashOn: boolean;
  onToggleFlash: () => void;
  zoom: number;
  zoomLabel: string;
  onCycleZoom: () => void;
  scanned: boolean;
  scanSuccess: boolean;
  anonymousMode: boolean;
  onToggleAnonymous: () => void;
  onPickImage: () => void;
  user: any;
  facing: "back" | "front";
  lowLightSuggested?: boolean;
}

export default function ScannerOverlay(props: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const anims = useOverlayAnimations();

  const TOP_BAR_H = props.topInset + 12 + 60;
  const BOTTOM_BAR_H = Math.max(props.bottomInset, 12) + 20 + 110;
  const availH = screenHeight - TOP_BAR_H - BOTTOM_BAR_H;
  const finderTop = TOP_BAR_H + Math.max(0, (availH - FINDER_SIZE) / 2);
  const finderLeft = (screenWidth - FINDER_SIZE) / 2;

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.outerContainer]}>
      <View style={[StyleSheet.absoluteFillObject, styles.nonInteractive]}>
        <ReAnimated.View entering={FadeIn.delay(80).duration(220)} style={[styles.titleArea, { top: finderTop - 62 }]}>
          <Text style={styles.titleText}>Scan a QR code</Text>
        </ReAnimated.View>

        <View style={{ position: "absolute", top: finderTop, left: finderLeft }}>
          <ReAnimated.View entering={FadeIn.delay(60).duration(220)}>
            <FinderFrame cornerBreath={anims.cornerBreath} />
          </ReAnimated.View>
        </View>

        {props.scanned && (
          <ReAnimated.View entering={FadeIn.duration(180)} style={[styles.hintArea, { top: finderTop + FINDER_SIZE + 20 }]}>
            <Text style={styles.hintText}>{props.scanSuccess ? "Code captured" : "Analyzing…"}</Text>
          </ReAnimated.View>
        )}
      </View>

      <OverlayTopBar
        topInset={props.topInset}
        anonymousMode={props.anonymousMode}
        onToggleAnonymous={props.onToggleAnonymous}
        user={props.user}
      />

      <OverlayBottomBar
        bottomInset={props.bottomInset}
        zoom={props.zoom}
        zoomLabel={props.zoomLabel}
        onCycleZoom={props.onCycleZoom}
        anonymousMode={props.anonymousMode}
        onPickImage={props.onPickImage}
        flashOn={props.flashOn}
        onToggleFlash={props.onToggleFlash}
        facing={props.facing}
        lowLightSuggested={props.lowLightSuggested}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { pointerEvents: "box-none" },
  nonInteractive: { pointerEvents: "none" },
  titleArea: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  titleText: {
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.92)",
    textAlign: "center",
    letterSpacing: -0.2,
  },
  hintArea: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  hintText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.60)",
    textAlign: "center",
    letterSpacing: 0.1,
  },
});
