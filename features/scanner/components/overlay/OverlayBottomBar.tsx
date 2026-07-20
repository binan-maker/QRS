import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ReAnimated, { FadeInUp, FadeIn } from "react-native-reanimated";
import { SCANNER_GLOW } from "./constants";

interface Props {
  bottomInset:       number;
  zoom:              number;
  zoomLabel:         string;
  onCycleZoom:       () => void;
  anonymousMode:     boolean;
  scanned:           boolean;
  onPickImage:       () => void;
  onReset:           () => void;
  user:              any;
  scanReady:         Animated.Value;
  flashOn:           boolean;
  onToggleFlash:     () => void;
  facing:            "back" | "front";
  onFlipCamera:      () => void;
  onToggleAnonymous: () => void;
}

export default function OverlayBottomBar({
  bottomInset,
  zoom,
  zoomLabel,
  onCycleZoom,
  anonymousMode,
  onPickImage,
  flashOn,
  onToggleFlash,
  facing,
  onFlipCamera,
  onToggleAnonymous,
  user,
}: Props) {
  const isFlashActive = flashOn && facing === "back";
  const isFlashDisabled = facing === "front";

  return (
    <ReAnimated.View
      entering={FadeInUp.delay(40).duration(220)}
      style={[styles.bottomBar, { paddingBottom: Math.max(bottomInset, 12) + 12 }]}
    >
      {/* Status pills — zoom / anon indicators */}
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
              <Text style={styles.anonPillText}>Private</Text>
            </ReAnimated.View>
          )}
        </ReAnimated.View>
      )}

      {/* Main control row — three circular glassmorphism buttons */}
      <ReAnimated.View entering={FadeIn.delay(40).duration(220)} style={styles.controlRow}>

        {/* Flip camera */}
        <View style={styles.btnGroup}>
          <Pressable
            onPress={onFlipCamera}
            hitSlop={8}
            style={({ pressed }) => [
              styles.glassBtn,
              facing === "front" && styles.glassBtnActive,
              pressed && styles.glassBtnPressed,
            ]}
          >
            <Ionicons
              name="camera-reverse-outline"
              size={22}
              color={facing === "front" ? SCANNER_GLOW : "rgba(255,255,255,0.88)"}
            />
          </Pressable>
          <Text style={styles.btnLabel}>Flip</Text>
        </View>

        {/* Gallery — primary CTA, slightly larger */}
        <View style={styles.btnGroup}>
          <Pressable
            onPress={onPickImage}
            hitSlop={4}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
          >
            <Ionicons name="images-outline" size={26} color="rgba(255,255,255,0.95)" />
          </Pressable>
          <Text style={styles.btnLabel}>Gallery</Text>
        </View>

        {/* Flash */}
        <View style={styles.btnGroup}>
          <Pressable
            onPress={isFlashDisabled ? undefined : onToggleFlash}
            hitSlop={8}
            style={({ pressed }) => [
              styles.glassBtn,
              isFlashActive   && styles.glassBtnFlash,
              isFlashDisabled && styles.glassBtnDisabled,
              pressed && !isFlashDisabled && styles.glassBtnPressed,
            ]}
          >
            <Ionicons
              name={isFlashActive ? "flash" : "flash-off-outline"}
              size={22}
              color={
                isFlashDisabled
                  ? "rgba(255,255,255,0.22)"
                  : isFlashActive
                  ? "#FFD60A"
                  : "rgba(255,255,255,0.88)"
              }
            />
          </Pressable>
          <Text style={[styles.btnLabel, isFlashDisabled && styles.btnLabelDim]}>Flash</Text>
        </View>
      </ReAnimated.View>

      {/* Private mode — logged-in users only */}
      {user && (
        <ReAnimated.View entering={FadeIn.delay(80).duration(200)} style={styles.anonRow}>
          <Pressable
            onPress={onToggleAnonymous}
            hitSlop={6}
            style={({ pressed }) => [
              styles.anonToggle,
              anonymousMode && styles.anonToggleOn,
              pressed && styles.anonTogglePressed,
            ]}
          >
            <Ionicons
              name={anonymousMode ? "eye-off" : "eye-off-outline"}
              size={13}
              color={anonymousMode ? "#F5A623" : "rgba(255,255,255,0.4)"}
            />
            <Text style={[styles.anonLabel, anonymousMode && styles.anonLabelOn]}>
              {anonymousMode ? "Private mode on" : "Private mode"}
            </Text>
            <View style={[styles.anonDot, anonymousMode && styles.anonDotOn]} />
          </Pressable>
        </ReAnimated.View>
      )}
    </ReAnimated.View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position:          "absolute",
    bottom:            0,
    left:              0,
    right:             0,
    paddingHorizontal: 28,
    alignItems:        "center",
    gap:               16,
  },

  // Status pills
  pillRow: {
    flexDirection: "row",
    gap:           8,
    alignItems:    "center",
  },
  zoomPill: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               5,
    backgroundColor:   "rgba(0,0,0,0.55)",
    borderRadius:      20,
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderWidth:       1,
    borderColor:       `${SCANNER_GLOW}44`,
  },
  zoomText: {
    fontSize:      12,
    fontFamily:    "Inter_700Bold",
    color:         SCANNER_GLOW,
    letterSpacing: 0.4,
  },
  anonPill: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               5,
    paddingHorizontal: 10,
    paddingVertical:   6,
    borderRadius:      20,
    backgroundColor:   "rgba(245,158,11,0.1)",
    borderWidth:       1,
    borderColor:       "rgba(245,166,35,0.28)",
  },
  anonPillText: {
    fontSize:   11,
    fontFamily: "Inter_600SemiBold",
    color:      "#F5A623",
  },

  // Control row
  controlRow: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    width:          "100%",
  },

  btnGroup: {
    alignItems: "center",
    gap:        8,
    width:      72,
  },

  // Secondary glassmorphism button (Flip, Flash)
  glassBtn: {
    width:           58,
    height:          58,
    borderRadius:    29,
    backgroundColor: "rgba(0,0,0,0.32)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.16)",
  },
  glassBtnActive: {
    backgroundColor: `${SCANNER_GLOW}1A`,
    borderColor:     `${SCANNER_GLOW}55`,
  },
  glassBtnFlash: {
    backgroundColor: "rgba(255,214,10,0.1)",
    borderColor:     "rgba(255,214,10,0.38)",
  },
  glassBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  glassBtnDisabled: {
    opacity: 0.38,
  },

  // Primary CTA button (Gallery) — slightly larger
  primaryBtn: {
    width:           68,
    height:          68,
    borderRadius:    34,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1.5,
    borderColor:     "rgba(255,255,255,0.22)",
  },
  primaryBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.14)",
  },

  btnLabel: {
    fontSize:      11,
    fontFamily:    "Inter_500Medium",
    color:         "rgba(255,255,255,0.48)",
    letterSpacing: 0.2,
  },
  btnLabelDim: {
    color: "rgba(255,255,255,0.2)",
  },

  // Private mode toggle
  anonRow: { alignItems: "center" },
  anonToggle: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               6,
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderRadius:      20,
    backgroundColor:   "rgba(0,0,0,0.28)",
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.1)",
  },
  anonToggleOn: {
    backgroundColor: "rgba(245,158,11,0.08)",
    borderColor:     "rgba(245,166,35,0.3)",
  },
  anonTogglePressed: {
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  anonLabel: {
    fontSize:   12,
    fontFamily: "Inter_500Medium",
    color:      "rgba(255,255,255,0.42)",
  },
  anonLabelOn: { color: "#F5A623" },
  anonDot: {
    width:           5,
    height:          5,
    borderRadius:    3,
    backgroundColor: "rgba(255,255,255,0.22)",
    marginLeft:      2,
  },
  anonDotOn: { backgroundColor: "#F5A623" },
});
