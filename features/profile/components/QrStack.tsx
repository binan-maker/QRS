import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";
import Animated, { FadeIn } from "react-native-reanimated";
import type { QrItem } from "./QrPreviewCard";

const CARD_W    = 88;
const CARD_H    = 88;
const OFFSET_X  = 30;
const MAX_STACK = 9;

interface Props {
  qrs:          QrItem[];
  totalCount:   number;
  colors:       any;
  onViewAll:    () => void;
  onPressCard?: (qr: QrItem, index: number) => void;
}

export function QrStack({ qrs, totalCount, colors, onViewAll, onPressCard }: Props) {
  const visible = qrs.slice(0, MAX_STACK);
  const n       = visible.length;

  const containerW = CARD_W + (n - 1) * OFFSET_X;
  const containerH = CARD_H;

  const extraCount = totalCount > MAX_STACK ? totalCount - MAX_STACK : 0;
  const qrSize     = Math.floor(CARD_W * 0.66);

  return (
    <View style={{ width: containerW, height: containerH, position: "relative" }}>
      {/*
        Fan spreads → right.
        i=0   → back card,  LEFTMOST  (left=0,              zIndex=1)
        i=n-1 → front card, RIGHTMOST (left=(n-1)*OFFSET_X, zIndex=n)
        Render in natural order so i=n-1 paints on top (frontmost).
        More-overlay goes on the frontmost (rightmost) slot.

        Animated.View handles enter animation only; Pressable handles
        press scale/opacity. This avoids the Reanimated warning about
        "transform overwritten by layout animation".
      */}
      {visible.map((qr, i) => {
        const isFront = i === n - 1;
        const thumbBg = qr.bgColor || "#FFFFFF";
        const fgColor = qr.fgColor || "#000000";

        return (
          <Animated.View
            key={qr.docId ?? i}
            entering={FadeIn.delay(i * 18).duration(210)}
            style={[
              styles.slot,
              {
                left:      i * OFFSET_X,
                zIndex:    i + 1,
                elevation: i + 1,
              },
            ]}
          >
            <Pressable
              onPress={() => {
                if (onPressCard) {
                  onPressCard(qr, i);
                } else {
                  onViewAll();
                }
              }}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: thumbBg,
                  borderColor:     colors.surfaceBorder,
                  shadowOpacity:   isFront ? 0.18 : 0.08,
                  opacity:         pressed ? 0.82 : 1,
                  transform:       [{ scale: pressed ? 0.93 : 1 }],
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

              {isFront && extraCount > 0 && (
                <View style={[styles.moreOverlay, { backgroundColor: colors.primary + "DD" }]}>
                  <Text style={styles.moreCount}>+{extraCount}</Text>
                  <Text style={styles.moreLabel}>more</Text>
                </View>
              )}
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    position: "absolute",
    top:      0,
  },
  card: {
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
