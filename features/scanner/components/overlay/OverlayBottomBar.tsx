import { useRef, useEffect } from "react";
import { View, Text, Pressable, Animated, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ReAnimated, { FadeInUp, FadeIn, FadeOut } from "react-native-reanimated";
import { SCANNER_GLOW } from "./constants";

export const LOW_LIGHT_AMBER        = "#FBBF24";
export const LOW_LIGHT_AMBER_BG     = "rgba(251,191,36,0.08)";
export const LOW_LIGHT_AMBER_BORDER = "rgba(251,191,36,0.30)";

interface Props {
  bottomInset: number; zoom: number; zoomLabel: string; onCycleZoom: () => void;
  anonymousMode: boolean; onPickImage: () => void; flashOn: boolean;
  onToggleFlash: () => void; facing: "back" | "front"; lowLightSuggested?: boolean;
}

export default function OverlayBottomBar({
  bottomInset, zoom, zoomLabel, onCycleZoom, anonymousMode,
  onPickImage, flashOn, onToggleFlash, facing, lowLightSuggested = false,
}: Props) {
  const isFlashActive = flashOn && facing === "back";
  const isFlashDisabled = facing === "front";
  const showLowLight = lowLightSuggested && !isFlashActive && !isFlashDisabled;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (showLowLight) {
      glowAnim.setValue(0);
      loop = Animated.loop(Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.2, duration: 900, useNativeDriver: true }),
      ]));
      loop.start();
    } else {
      glowAnim.setValue(0);
    }
    return () => { loop?.stop(); };
  }, [showLowLight, glowAnim]);

  return (
    <ReAnimated.View entering={FadeInUp.delay(40).duration(220)} style={[styles.bottomBar, { paddingBottom: Math.max(bottomInset, 12) + 48 }]}>
      {(zoom > 0 || anonymousMode) && (
        <ReAnimated.View entering={FadeIn.duration(200)} style={styles.pillRow}>
          {zoom > 0 && (
            <Pressable onPress={onCycleZoom} style={styles.zoomPill} hitSlop={6}>
              <Ionicons name="search-outline" size={12} color={SCANNER_GLOW} />
              <ReAnimated.Text style={styles.zoomText}>{zoomLabel}</ReAnimated.Text>
            </Pressable>
          )}
          {anonymousMode && (
            <ReAnimated.View entering={FadeIn.duration(180)} style={styles.anonPill}>
              <Ionicons name="eye-off" size={12} color="#F5A623" />
              <ReAnimated.Text style={styles.anonPillText}>Private</ReAnimated.Text>
            </ReAnimated.View>
          )}
        </ReAnimated.View>
      )}

      {showLowLight && (
        <ReAnimated.View entering={FadeIn.duration(280)} exiting={FadeOut.duration(200)} style={styles.lowLightPill}>
          <Ionicons name="flashlight-outline" size={13} color={LOW_LIGHT_AMBER} />
          <Text style={styles.lowLightText}>Low light — try the torch</Text>
        </ReAnimated.View>
      )}

      <ReAnimated.View entering={FadeIn.delay(40).duration(220)} style={styles.controlRow}>
        <View style={styles.btnGroup}>
          <Pressable onPress={onPickImage} hitSlop={6} style={({ pressed }) => [styles.glassBtn, pressed && styles.glassBtnPressed]}>
            <Ionicons name="images-outline" size={24} color="rgba(255,255,255,0.92)" />
          </Pressable>
          <Text style={styles.btnLabel}>Gallery</Text>
        </View>

        <View style={styles.btnGroup}>
          <View>
            <Pressable
              onPress={isFlashDisabled ? undefined : onToggleFlash} hitSlop={6}
              style={({ pressed }) => [
                styles.glassBtn, isFlashActive && styles.glassBtnFlash,
                isFlashDisabled && styles.glassBtnDisabled, showLowLight && styles.glassBtnLowLight,
                pressed && !isFlashDisabled && styles.glassBtnPressed,
              ]}
            >
              <Ionicons
                name={isFlashActive ? "flashlight" : "flashlight-outline"} size={24}
                color={isFlashDisabled ? "rgba(255,255,255,0.22)" : isFlashActive ? "#FFD60A" : showLowLight ? LOW_LIGHT_AMBER : "rgba(255,255,255,0.92)"}
              />
            </Pressable>
            {showLowLight && <Animated.View pointerEvents="none" style={[styles.glowRing, { opacity: glowAnim }]} />}
          </View>
          <Text style={[styles.btnLabel, isFlashDisabled && styles.btnLabelDim]}>Torch</Text>
        </View>
      </ReAnimated.View>
    </ReAnimated.View>
  );
}

const styles = StyleSheet.create({
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center", gap: 14 },
  pillRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  zoomPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: `${SCANNER_GLOW}44`,
  },
  zoomText: { fontSize: 12, fontFamily: "Inter_700Bold", color: SCANNER_GLOW, letterSpacing: 0.4 },
  anonPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
    backgroundColor: "rgba(245,158,11,0.1)", borderWidth: 1, borderColor: "rgba(245,166,35,0.28)",
  },
  anonPillText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#F5A623" },
  lowLightPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: LOW_LIGHT_AMBER_BG, borderWidth: 1, borderColor: LOW_LIGHT_AMBER_BORDER,
  },
  lowLightText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#FDE68A", letterSpacing: 0.1 },
  controlRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 32 },
  btnGroup: { alignItems: "center", gap: 8 },
  glassBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.32)", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
  },
  glassBtnFlash: { backgroundColor: "rgba(255,214,10,0.1)", borderColor: "rgba(255,214,10,0.38)" },
  glassBtnLowLight: { borderColor: LOW_LIGHT_AMBER_BORDER, borderWidth: 1.5 },
  glassBtnPressed: { backgroundColor: "rgba(255,255,255,0.12)" },
  glassBtnDisabled: { opacity: 0.35 },
  btnLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.48)", letterSpacing: 0.2 },
  btnLabelDim: { color: "rgba(255,255,255,0.2)" },
  glowRing: {
    position: "absolute", top: -5, left: -5, right: -5, bottom: -5,
    borderRadius: 37, borderWidth: 1.5, borderColor: LOW_LIGHT_AMBER,
  },
});
