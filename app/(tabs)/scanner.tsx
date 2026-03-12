import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { router, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import Animated, { FadeIn } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";

const ZOOM_HINTS = [
  { min: 0, max: 0.1, label: "Move closer" },
  { min: 0.1, max: 0.4, label: "Good distance" },
  { min: 0.4, max: 0.7, label: "Optimal range" },
  { min: 0.7, max: 1.0, label: "Move back" },
];

function getZoomHint(zoom: number) {
  for (const h of ZOOM_HINTS) {
    if (zoom >= h.min && zoom <= h.max) return h.label;
  }
  return "";
}

export default function ScannerScreen() {
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [zoom, setZoom] = useState(0.3);
  const [showZoom, setShowZoom] = useState(false);
  const scanLockRef = useRef(false);
  const zoomTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      scanLockRef.current = false;
    }, [])
  );

  function handleZoomChange(val: number) {
    setZoom(val);
    setShowZoom(true);
    if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
    zoomTimeoutRef.current = setTimeout(() => setShowZoom(false), 2000);
  }

  const handleBarCodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (scanLockRef.current || scanned) return;
      scanLockRef.current = true;
      setScanned(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await processScan(data);
    },
    [scanned, anonymousMode, token]
  );

  async function processScan(content: string) {
    setProcessing(true);
    try {
      const baseUrl = getApiUrl();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${baseUrl}api/qr/scan`, {
        method: "POST",
        headers,
        body: JSON.stringify({ content, isAnonymous: anonymousMode }),
      });
      const data = await res.json();

      if (!anonymousMode) {
        const scanEntry = {
          id: Crypto.randomUUID(),
          content,
          contentType: data.qrCode?.contentType || "text",
          scannedAt: new Date().toISOString(),
          qrCodeId: data.qrCode?.id,
        };
        const stored = await AsyncStorage.getItem("local_scan_history");
        const history = stored ? JSON.parse(stored) : [];
        history.unshift(scanEntry);
        if (history.length > 100) history.pop();
        await AsyncStorage.setItem("local_scan_history", JSON.stringify(history));
      }

      if (data.qrCode?.id) {
        router.push({
          pathname: "/qr-detail/[id]",
          params: { id: data.qrCode.id },
        });
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to process scan");
      setScanned(false);
      scanLockRef.current = false;
    } finally {
      setProcessing(false);
    }
  }

  async function handlePickImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        base64: true,
      });
      if (result.canceled || !result.assets[0]) return;
      setProcessing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      let base64 = result.assets[0].base64;
      if (!base64 && result.assets[0].uri) {
        base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
      if (!base64) {
        Alert.alert("Error", "Could not read image");
        setProcessing(false);
        return;
      }

      const baseUrl = getApiUrl();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${baseUrl}api/qr/decode-image`, {
        method: "POST",
        headers,
        body: JSON.stringify({ imageBase64: base64 }),
      });
      const data = await res.json();
      if (!res.ok || !data.content) {
        Alert.alert("No QR Found", "No QR code was detected in the selected image");
        setProcessing(false);
        return;
      }
      await processScan(data.content);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to process image");
      setProcessing(false);
    }
  }

  if (!permission) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <ActivityIndicator color={Colors.dark.primary} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.permissionBox}>
          <View style={styles.permIconCircle}>
            <Ionicons name="camera" size={48} color={Colors.dark.primary} />
          </View>
          <Text style={styles.permTitle}>Camera Access Required</Text>
          <Text style={styles.permSubtitle}>
            Allow camera access to scan QR codes directly
          </Text>
          {permission.status === "denied" && !permission.canAskAgain ? (
            <View style={styles.permDeniedBox}>
              <Ionicons name="information-circle" size={18} color={Colors.dark.warning} />
              <Text style={styles.permDeniedText}>
                Camera permission was denied. Enable it in your device settings.
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                requestPermission();
              }}
              style={({ pressed }) => [styles.permButton, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Ionicons name="camera" size={20} color="#000" />
              <Text style={styles.permButtonText}>Enable Camera</Text>
            </Pressable>
          )}
          <Text style={styles.orText}>or</Text>
          <Pressable
            onPress={handlePickImage}
            style={({ pressed }) => [styles.galleryAltBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Ionicons name="images" size={20} color={Colors.dark.primary} />
            <Text style={styles.galleryAltText}>Pick from Gallery</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  const zoomHint = getZoomHint(zoom);

  return (
    <View style={styles.container}>
      {Platform.OS !== "web" && <StatusBar hidden />}

      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={flashOn}
        zoom={zoom}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      <View style={StyleSheet.absoluteFillObject}>
        <View style={[styles.topBar, { paddingTop: topInset + 8 }]}>
          <Pressable onPress={() => router.back()} style={styles.topBarBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.scanTitle}>Scan QR Code</Text>
          <Pressable
            onPress={() => {
              setFlashOn(!flashOn);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={styles.topBarBtn}
          >
            <Ionicons name={flashOn ? "flash" : "flash-off"} size={22} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.middleRow}>
          <View style={styles.sideDim} />
          <View style={styles.finderFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.sideDim} />
        </View>

        <View style={styles.belowFinder}>
          {showZoom && (
            <Animated.Text entering={FadeIn.duration(200)} style={styles.zoomHint}>
              {zoomHint}
            </Animated.Text>
          )}
          {!showZoom && (
            <Text style={styles.finderHint}>Position QR code within the frame</Text>
          )}
        </View>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.zoomRow}>
            <Pressable
              onPress={() => handleZoomChange(Math.max(0, zoom - 0.1))}
              style={styles.zoomBtn}
            >
              <Ionicons name="remove" size={20} color="#fff" />
            </Pressable>
            <View style={styles.zoomTrack}>
              <View style={[styles.zoomFill, { width: `${zoom * 100}%` as any }]} />
            </View>
            <Pressable
              onPress={() => handleZoomChange(Math.min(0.9, zoom + 0.1))}
              style={styles.zoomBtn}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </Pressable>
            <Text style={styles.zoomLabel}>{(1 + zoom * 5).toFixed(1)}x</Text>
          </View>

          {user ? (
            <Pressable
              onPress={() => {
                setAnonymousMode(!anonymousMode);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[styles.anonToggle, anonymousMode && styles.anonToggleActive]}
            >
              <Ionicons
                name={anonymousMode ? "eye-off" : "eye"}
                size={18}
                color={anonymousMode ? Colors.dark.warning : "#fff"}
              />
              <Text style={[styles.anonText, anonymousMode && { color: Colors.dark.warning }]}>
                {anonymousMode ? "Anonymous mode" : "Normal mode"}
              </Text>
            </Pressable>
          ) : null}

          <View style={styles.bottomActions}>
            <Pressable
              onPress={handlePickImage}
              style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={styles.actionBtnCircle}>
                <Ionicons name="images" size={24} color="#fff" />
              </View>
              <Text style={styles.actionLabel}>Gallery</Text>
            </Pressable>

            <View style={styles.mainScanArea}>
              {scanned ? (
                <Pressable
                  onPress={() => {
                    setScanned(false);
                    scanLockRef.current = false;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                  style={styles.rescanBtn}
                >
                  <Ionicons name="refresh" size={30} color="#000" />
                </Pressable>
              ) : (
                <View style={styles.scanReadyDot} />
              )}
            </View>

            <Pressable
              onPress={() => {
                setShowZoom(!showZoom);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={styles.actionBtn}
            >
              <View style={styles.actionBtnCircle}>
                <Ionicons name="scan-outline" size={24} color="#fff" />
              </View>
              <Text style={styles.actionLabel}>Zoom</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {processing ? (
        <View style={styles.processingOverlay}>
          <View style={styles.processingBox}>
            <ActivityIndicator color={Colors.dark.primary} size="large" />
            <Text style={styles.processingText}>Analyzing QR code...</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const CORNER_SIZE = 30;
const CORNER_WIDTH = 4;
const FINDER_SIZE = 260;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  scanTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  topBarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  middleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  sideDim: {
    flex: 1,
    height: FINDER_SIZE,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  finderFrame: {
    width: FINDER_SIZE,
    height: FINDER_SIZE,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH,
    borderTopColor: Colors.dark.primary, borderLeftColor: Colors.dark.primary,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH,
    borderTopColor: Colors.dark.primary, borderRightColor: Colors.dark.primary,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH,
    borderBottomColor: Colors.dark.primary, borderLeftColor: Colors.dark.primary,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH,
    borderBottomColor: Colors.dark.primary, borderRightColor: Colors.dark.primary,
    borderBottomRightRadius: 8,
  },
  belowFinder: {
    alignItems: "center",
    paddingVertical: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  finderHint: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
  },
  zoomHint: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.primary,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    gap: 16,
    alignItems: "center",
  },
  zoomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  zoomBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  zoomFill: {
    height: 4,
    backgroundColor: Colors.dark.primary,
    borderRadius: 2,
  },
  zoomLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.primary,
    minWidth: 28,
    textAlign: "right",
  },
  anonToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  anonToggleActive: {
    backgroundColor: Colors.dark.warningDim,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  anonText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  bottomActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 8,
  },
  actionBtn: {
    alignItems: "center",
    gap: 6,
    minWidth: 64,
  },
  actionBtnCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
  },
  mainScanArea: {
    alignItems: "center",
    justifyContent: "center",
    width: 80,
    height: 80,
  },
  rescanBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  scanReadyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.dark.primary,
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  processingBox: {
    backgroundColor: Colors.dark.surface,
    padding: 32,
    borderRadius: 20,
    alignItems: "center",
    gap: 16,
  },
  processingText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.text,
  },
  permissionBox: {
    flex: 1,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  permIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.dark.primaryDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  permTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
    textAlign: "center",
  },
  permSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    textAlign: "center",
    maxWidth: 280,
  },
  permButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  permButtonText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#000",
  },
  permDeniedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dark.warningDim,
    padding: 14,
    borderRadius: 12,
    maxWidth: 300,
  },
  permDeniedText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.warning,
    flex: 1,
  },
  orText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textMuted,
  },
  galleryAltBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.dark.primaryDim,
  },
  galleryAltText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.primary,
  },
});
