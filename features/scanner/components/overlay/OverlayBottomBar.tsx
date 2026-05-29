import { View, StyleSheet, Pressable, Animated } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import ReAnimated, { FadeInUp, FadeIn } from "react-native-reanimated";
import { SCANNER_GLOW } from "./constants";

interface Props {
  bottomInset:   number;
  zoom:          number;
  zoomLabel:     string;
  onCycleZoom:   () => void;
  anonymousMode: boolean;
  scanned:       boolean;
  onPickImage:   () => void;
  onReset:       () => void;
  user:          any;
  scanReady:     Animated.Value;
}

export default function OverlayBottomBar({
  bottomInset,
  zoom,
  zoomLabel,
  onCycleZoom,
  anonymousMode,
  onPickImage,
}: Props) {
  return (
    <ReAnimated.View
      entering={FadeInUp.delay(40).duration(260)}
      style={[styles.bottomBar, { paddingBottom: Math.max(bottomInset, 8) + 16 }]}
    >
      {/* Status pills — zoom only when not at 1×, anon when active */}
      {(zoom > 0 || anonymousMode) && (
        <ReAnimated.View entering={FadeIn.duration(200)} style={styles.pillRow}>
          {zoom > 0 && (
            <Pressable onPress={onCycleZoom} style={styles.zoomPill}>
              <MaterialCommunityIcons name="magnify" size={12} color={SCANNER_GLOW} />
              <ReAnimated.Text style={styles.zoomText}>{zoomLabel}</ReAnimated.Text>
            </Pressable>
          )}
          {anonymousMode && (
            <ReAnimated.View entering={FadeIn.duration(200)} style={styles.anonPill}>
              <Ionicons name="eye-off" size={11} color="#F5A623" />
            </ReAnimated.View>
          )}
        </ReAnimated.View>
      )}

      {/* Gallery — centered, only action button */}
      <ReAnimated.View entering={FadeIn.delay(40).duration(240)}>
        <Pressable
          onPress={onPickImage}
          style={({ pressed }) => [styles.galleryBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="images-outline" size={24} color="rgba(255,255,255,0.85)" />
        </Pressable>
      </ReAnimated.View>
    </ReAnimated.View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position:          "absolute",
    bottom:            0,
    left:              0,
    right:             0,
    paddingHorizontal: 40,
    alignItems:        "center",
    gap:               14,
  },
  pillRow: {
    flexDirection: "row",
    gap:           8,
    alignItems:    "center",
  },
  zoomPill: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               4,
    backgroundColor:   "rgba(0,0,0,0.55)",
    borderRadius:      20,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderWidth:       1,
    borderColor:       "rgba(0,212,255,0.2)",
  },
  zoomText: {
    fontSize:      11,
    fontFamily:    "Inter_700Bold",
    color:         SCANNER_GLOW,
    letterSpacing: 0.4,
  },
  anonPill: {
    width:           26,
    height:          26,
    borderRadius:    13,
    backgroundColor: "rgba(245,158,11,0.12)",
    borderWidth:     1,
    borderColor:     "rgba(245,166,35,0.35)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  galleryBtn: {
    width:           60,
    height:          60,
    borderRadius:    30,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.12)",
    alignItems:      "center",
    justifyContent:  "center",
  },
});
