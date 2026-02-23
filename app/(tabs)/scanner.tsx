import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import Animated, { FadeIn } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";

export default function ScannerScreen() {
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const scanLockRef = useRef(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const handleBarCodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (scanLockRef.current || scanned) return;
      scanLockRef.current = true;
      setScanned(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await processScan(data);
      scanLockRef.current = false;
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
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${baseUrl}api/qr/scan`, {
        method: "POST",
        headers,
        body: JSON.stringify({ content, isAnonymous: anonymousMode }),
      });
      const data = await res.json();

      const scanEntry = {
        id: Crypto.randomUUID(),
        content,
        contentType: data.qrCode?.contentType || "text",
        scannedAt: new Date().toISOString(),
        qrCodeId: data.qrCode?.id,
      };

      if (!anonymousMode) {
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
        const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        base64 = fileContent;
      }

      if (!base64) {
        Alert.alert("Error", "Could not read image");
        setProcessing(false);
        return;
      }

      const baseUrl = getApiUrl();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
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
                Camera permission was denied. Please enable it in your device settings.
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                requestPermission();
              }}
              style={({ pressed }) => [
                styles.permButton,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Ionicons name="camera" size={20} color="#000" />
              <Text style={styles.permButtonText}>Enable Camera</Text>
            </Pressable>
          )}
          <Text style={styles.orText}>or</Text>
          <Pressable
            onPress={handlePickImage}
            style={({ pressed }) => [
              styles.galleryAltBtn,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Ionicons name="images" size={20} color={Colors.dark.primary} />
            <Text style={styles.galleryAltText}>Pick from Gallery</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={flashOn}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      <View style={[styles.overlay]}>
        <View style={[styles.topBar, { paddingTop: topInset + 8 }]}>
          <Text style={styles.scanTitle}>Scan QR Code</Text>
          <View style={styles.topBarActions}>
            <Pressable
              onPress={() => {
                setFlashOn(!flashOn);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={styles.topBarBtn}
            >
              <Ionicons
                name={flashOn ? "flash" : "flash-off"}
                size={22}
                color="#fff"
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.finderContainer}>
          <View style={styles.finderFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.finderHint}>
            Position QR code within the frame
          </Text>
        </View>

        <View style={[styles.bottomBar, { paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 84 }]}>
          {user ? (
            <Pressable
              onPress={() => {
                setAnonymousMode(!anonymousMode);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                styles.anonToggle,
                anonymousMode && styles.anonToggleActive,
              ]}
            >
              <Ionicons
                name={anonymousMode ? "eye-off" : "eye"}
                size={18}
                color={anonymousMode ? Colors.dark.warning : "#fff"}
              />
              <Text
                style={[
                  styles.anonText,
                  anonymousMode && { color: Colors.dark.warning },
                ]}
              >
                {anonymousMode ? "Anonymous" : "Normal"}
              </Text>
            </Pressable>
          ) : null}

          <View style={styles.bottomActions}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handlePickImage();
              }}
              style={({ pressed }) => [
                styles.actionBtn,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="images" size={24} color="#fff" />
              <Text style={styles.actionLabel}>Gallery</Text>
            </Pressable>

            {scanned ? (
              <Pressable
                onPress={() => {
                  setScanned(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={({ pressed }) => [
                  styles.rescanBtn,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Ionicons name="refresh" size={28} color="#000" />
              </Pressable>
            ) : null}
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

const CORNER_SIZE = 28;
const CORNER_WIDTH = 4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  scanTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  topBarActions: {
    flexDirection: "row",
    gap: 8,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  finderContainer: {
    alignItems: "center",
    gap: 20,
  },
  finderFrame: {
    width: 260,
    height: 260,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderTopColor: Colors.dark.primary,
    borderLeftColor: Colors.dark.primary,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderTopColor: Colors.dark.primary,
    borderRightColor: Colors.dark.primary,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderBottomColor: Colors.dark.primary,
    borderLeftColor: Colors.dark.primary,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderBottomColor: Colors.dark.primary,
    borderRightColor: Colors.dark.primary,
    borderBottomRightRadius: 8,
  },
  finderHint: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    gap: 16,
    alignItems: "center",
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
    gap: 24,
  },
  actionBtn: {
    alignItems: "center",
    gap: 4,
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
  },
  rescanBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
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
    padding: 32,
    alignItems: "center",
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
