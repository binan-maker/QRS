import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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

  return (
    <ReAnimated.View
      entering={FadeInUp.delay(40).duration(300)}
      style={[styles.bottomBar, { paddingBottom: Math.max(bottomInset, 12) + 12 }]}
    >
      {/* Status pills row */}
      {(zoom > 0 || anonymousMode) && (
        <ReAnimated.View entering={FadeIn.duration(220)} style={styles.pillRow}>
          {zoom > 0 && (
            <Pressable onPress={onCycleZoom} style={styles.zoomPill}>
              <MaterialCommunityIcons name="magnify-plus-outline" size={13} color={SCANNER_GLOW} />
              <ReAnimated.Text style={styles.zoomText}>{zoomLabel}</ReAnimated.Text>
            </Pressable>
          )}
          {anonymousMode && (
            <ReAnimated.View entering={FadeIn.duration(200)} style={styles.anonPill}>
              <Ionicons name="eye-off" size={12} color="#F5A623" />
              <Text style={styles.anonPillText}>Private</Text>
            </ReAnimated.View>
          )}
        </ReAnimated.View>
      )}

      {/* Main control row */}
      <ReAnimated.View entering={FadeIn.delay(40).duration(260)} style={styles.controlRow}>

        {/* Camera flip */}
        <View style={styles.iconGroup}>
          <Pressable
            onPress={onFlipCamera}
            style={({ pressed }) => [
              styles.iconBtn,
              facing === "front" && styles.iconBtnActive,
              pressed && styles.iconBtnPressed,
            ]}
          >
            <Ionicons
              name="camera-reverse-outline"
              size={23}
              color={facing === "front" ? SCANNER_GLOW : "rgba(255,255,255,0.85)"}
            />
          </Pressable>
          <Text style={styles.iconLabel}>Flip</Text>
        </View>

        {/* Gallery — main CTA */}
        <View style={styles.galleryGroup}>
          <Pressable
            onPress={onPickImage}
            style={({ pressed }) => [styles.galleryBtn, pressed && styles.galleryBtnPressed]}
          >
            <View style={styles.galleryInner}>
              <Ionicons name="images-outline" size={28} color="#fff" />
            </View>
          </Pressable>
          <Text style={styles.galleryLabel}>Gallery</Text>
        </View>

        {/* Flash */}
        <View style={styles.iconGroup}>
          <Pressable
            onPress={facing === "front" ? undefined : onToggleFlash}
            style={({ pressed }) => [
              styles.iconBtn,
              isFlashActive && styles.iconBtnFlashActive,
              pressed && facing !== "front" && styles.iconBtnPressed,
              facing === "front" && styles.iconBtnDisabled,
            ]}
          >
            <Ionicons
              name={isFlashActive ? "flash" : "flash-off-outline"}
              size={23}
              color={
                facing === "front"
                  ? "rgba(255,255,255,0.22)"
                  : isFlashActive
                  ? "#FFD60A"
                  : "rgba(255,255,255,0.85)"
              }
            />
          </Pressable>
          <Text style={[styles.iconLabel, facing === "front" && styles.iconLabelDim]}>Flash</Text>
        </View>
      </ReAnimated.View>

      {/* Private mode toggle — logged-in users only */}
      {user && (
        <ReAnimated.View entering={FadeIn.delay(80).duration(240)} style={styles.anonRow}>
          <Pressable
            onPress={onToggleAnonymous}
            style={({ pressed }) => [
              styles.anonToggle,
              anonymousMode && styles.anonToggleOn,
              pressed && styles.anonTogglePressed,
            ]}
          >
            <Ionicons
              name={anonymousMode ? "eye-off" : "eye-off-outline"}
              size={14}
              color={anonymousMode ? "#F5A623" : "rgba(255,255,255,0.45)"}
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
    gap:               14,
  },

  // Pills
  pillRow: {
    flexDirection: "row",
    gap:           8,
    alignItems:    "center",
  },
  zoomPill: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               5,
    backgroundColor:   "rgba(0,0,0,0.6)",
    borderRadius:      20,
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderWidth:       1,
    borderColor:       `rgba(0,212,255,0.28)`,
  },
  zoomText: {
    fontSize:      12,
    fontFamily:    "Inter_700Bold",
    color:         SCANNER_GLOW,
    letterSpacing: 0.5,
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
    borderColor:       "rgba(245,166,35,0.3)",
  },
  anonPillText: {
    fontSize:   11,
    fontFamily: "Inter_600SemiBold",
    color:      "#F5A623",
  },

  // Main control row
  controlRow: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    width:             "100%",
  },

  iconGroup: {
    alignItems: "center",
    gap:        7,
    width:      64,
  },
  iconBtn: {
    width:           58,
    height:          58,
    borderRadius:    29,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.13)",
  },
  iconBtnActive: {
    backgroundColor: "rgba(0,212,255,0.12)",
    borderColor:     "rgba(0,212,255,0.35)",
  },
  iconBtnFlashActive: {
    backgroundColor: "rgba(255,214,10,0.1)",
    borderColor:     "rgba(255,214,10,0.35)",
  },
  iconBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  iconBtnDisabled: {
    opacity: 0.4,
  },
  iconLabel: {
    fontSize:      11,
    fontFamily:    "Inter_500Medium",
    color:         "rgba(255,255,255,0.5)",
    letterSpacing: 0.2,
  },
  iconLabelDim: {
    color: "rgba(255,255,255,0.22)",
  },

  // Gallery CTA
  galleryGroup: {
    alignItems: "center",
    gap:        8,
  },
  galleryBtn: {
    width:           72,
    height:          72,
    borderRadius:    36,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth:     1.5,
    borderColor:     "rgba(255,255,255,0.2)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  galleryBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  galleryInner: {
    alignItems:     "center",
    justifyContent: "center",
  },
  galleryLabel: {
    fontSize:      12,
    fontFamily:    "Inter_600SemiBold",
    color:         "rgba(255,255,255,0.7)",
    letterSpacing: 0.3,
  },

  // Private toggle
  anonRow: {
    alignItems: "center",
  },
  anonToggle: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               6,
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderRadius:      20,
    backgroundColor:   "rgba(255,255,255,0.05)",
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.1)",
  },
  anonToggleOn: {
    backgroundColor: "rgba(245,158,11,0.08)",
    borderColor:     "rgba(245,166,35,0.3)",
  },
  anonTogglePressed: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  anonLabel: {
    fontSize:   12,
    fontFamily: "Inter_500Medium",
    color:      "rgba(255,255,255,0.45)",
  },
  anonLabelOn: {
    color: "#F5A623",
  },
  anonDot: {
    width:           6,
    height:          6,
    borderRadius:    3,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginLeft:      2,
  },
  anonDotOn: {
    backgroundColor: "#F5A623",
  },
});
