import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";
import Animated, { FadeIn } from "react-native-reanimated";
import { safePush } from "@/shared/utils/navigation";
import type { QrItem } from "./QrPreviewCard";

const CARD_SIZE  = 96;
const OFFSET_X   = 7;
const OFFSET_Y   = 6;
const MAX_STACK  = 15;

interface Props {
  qrs:        QrItem[];
  totalCount: number;
  colors:     any;
  onViewAll:  () => void;
}

export function QrStack({ qrs, totalCount, colors, onViewAll }: Props) {
  const visible = qrs.slice(0, MAX_STACK);
  const n       = visible.length;

  const containerW = CARD_SIZE + (n - 1) * OFFSET_X;
  const containerH = CARD_SIZE + (n - 1) * OFFSET_Y;

  const extraCount = totalCount > MAX_STACK ? totalCount - MAX_STACK : 0;

  return (
    <Pressable
      onPress={onViewAll}
      style={({ pressed }) => ({
        opacity: pressed ? 0.88 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      {/* Stack container — sized to fit all offset cards */}
      <View style={{ width: containerW, height: containerH, position: "relative" }}>
        {/* Render back → front so the front card paints last (on top) */}
        {[...visible].reverse().map((qr, ri) => {
          const i      = n - 1 - ri; // 0 = front card
          const isBack = i === n - 1;
          const qrSize = Math.floor(CARD_SIZE * 0.66);
          const thumbBg = qr.bgColor || colors.surface;

          return (
            <Animated.View
              key={qr.docId ?? i}
              entering={FadeIn.delay(ri * 18).duration(220)}
              style={[
                styles.card,
                {
                  left:             i * OFFSET_X,
                  top:              i * OFFSET_Y,
                  backgroundColor:  thumbBg,
                  borderColor:      colors.surfaceBorder,
                  shadowColor:      "#000",
                  elevation:        n - i,
                  shadowOpacity:    0.1 + (n - i) * 0.01,
                },
              ]}
            >
              <QRCode
                value={qr.content || "https://qrguard.app"}
                size={qrSize}
                color={qr.fgColor || "#0A0E17"}
                backgroundColor={thumbBg}
                quietZone={4}
                ecl="L"
              />

              {/* "+N more" overlay on the backmost card */}
              {isBack && extraCount > 0 && (
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
    position:        "absolute",
    width:           CARD_SIZE,
    height:          CARD_SIZE,
    borderRadius:    16,
    borderWidth:     1,
    overflow:        "hidden",
    alignItems:      "center",
    justifyContent:  "center",
    shadowOffset:    { width: 0, height: 3 },
    shadowRadius:    8,
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems:     "center",
    justifyContent: "center",
    gap:            2,
  },
  moreCount: {
    fontSize:   18,
    fontFamily: "Inter_700Bold",
    color:      "#fff",
  },
  moreLabel: {
    fontSize:   11,
    fontFamily: "Inter_500Medium",
    color:      "rgba(255,255,255,0.85)",
  },
});
