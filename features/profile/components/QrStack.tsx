import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";
import Animated, { FadeIn } from "react-native-reanimated";
import type { QrItem } from "./QrPreviewCard";

const CARD_W    = 88;
const CARD_H    = 88;
const OFFSET_X  = 30;   // how far each card peeks out
const MAX_STACK = 7;

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
        {/*
          Fan spreads → right.
          i=0   → back card,  LEFTMOST  (left=0,              zIndex=1)
          i=n-1 → front card, RIGHTMOST (left=(n-1)*OFFSET_X, zIndex=n)
          Render in natural order so i=n-1 paints on top (frontmost).
          More card overlays the rightmost/frontmost slot.
        */}
        {visible.map((qr, i) => {
          const isFront = i === n - 1;
          const thumbBg = qr.bgColor || "#FFFFFF";
          const fgColor = qr.fgColor || "#000000";

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
                  shadowOpacity:   isFront ? 0.18 : 0.08,
                  elevation:       i + 1,
                  zIndex:          i + 1,
                },
              ]}
            >
              <QRCode
                value={qr.content || "https://qrguard.app"}
                size={qrSize}
                color={fgColor}
                backgroundColor={thumbBg}
                quietZone={4}
                ecl="L"
              />

              {/* "+N more" overlay on the frontmost (rightmost) card */}
              {isFront && extraCount > 0 && (
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
