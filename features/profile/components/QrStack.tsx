import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";
import Animated, { FadeIn } from "react-native-reanimated";
import type { QrItem } from "./QrPreviewCard";

const CARD_W    = 88;
const CARD_H    = 88;
const OFFSET_X  = 30;   // how far each card peeks out to the right
const MAX_STACK = 15;

interface Props {
  qrs:        QrItem[];
  totalCount: number;
  colors:     any;
  onViewAll:  () => void;
}

export function QrStack({ qrs, totalCount, colors, onViewAll }: Props) {
  const visible = qrs.slice(0, MAX_STACK);
  const n       = visible.length;

  // Total width: back card takes CARD_W, then each subsequent card adds OFFSET_X
  const containerW = CARD_W + (n - 1) * OFFSET_X;
  const containerH = CARD_H;

  const extraCount = totalCount > MAX_STACK ? totalCount - MAX_STACK : 0;
  const qrSize     = Math.floor(CARD_W * 0.66);

  return (
    <Pressable
      onPress={onViewAll}
      style={({ pressed }) => ({
        opacity:   pressed ? 0.88 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <View style={{ width: containerW, height: containerH, position: "relative" }}>
        {/* Render back → front: card 0 is leftmost/back, card n-1 is rightmost/front */}
        {visible.map((qr, i) => {
          const isFront  = i === n - 1;
          const thumbBg  = qr.bgColor || colors.surface;
          const fgColor  = qr.fgColor || "#0A0E17";

          return (
            <Animated.View
              key={qr.docId ?? i}
              entering={FadeIn.delay(i * 20).duration(220)}
              style={[
                styles.card,
                {
                  left:            i * OFFSET_X,
                  backgroundColor: thumbBg,
                  borderColor:     colors.surfaceBorder,
                  // Front card gets a slightly more prominent shadow
                  shadowOpacity:   isFront ? 0.18 : 0.08,
                  elevation:       i + 1,
                  zIndex:          i,
                },
              ]}
            >
              {/* QR code — only render on fully-visible front card and a few behind */}
              {(isFront || i >= n - 3) && (
                <QRCode
                  value={qr.content || "https://qrguard.app"}
                  size={qrSize}
                  color={fgColor}
                  backgroundColor={thumbBg}
                  quietZone={4}
                  ecl="L"
                />
              )}

              {/* "+N more" overlay on the backmost card */}
              {i === 0 && extraCount > 0 && (
                <View style={[styles.moreOverlay, { backgroundColor: colors.primary + "DD" }]}>
                  <Text style={styles.moreCount}>+{extraCount}</Text>
                  <Text style={styles.moreLabel}>more</Text>
                </View>
              )}
            </Animated.View>
          );
        })}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position:       "absolute",
    top:            0,
    width:          CARD_W,
    height:         CARD_H,
    borderRadius:   18,
    borderWidth:    1.5,
    overflow:       "hidden",
    alignItems:     "center",
    justifyContent: "center",
    shadowColor:    "#000",
    shadowOffset:   { width: 0, height: 4 },
    shadowRadius:   10,
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems:     "center",
    justifyContent: "center",
    gap:            2,
  },
  moreCount: {
    fontSize:   16,
    fontFamily: "Inter_700Bold",
    color:      "#fff",
  },
  moreLabel: {
    fontSize:   10,
    fontFamily: "Inter_500Medium",
    color:      "rgba(255,255,255,0.85)",
  },
});
