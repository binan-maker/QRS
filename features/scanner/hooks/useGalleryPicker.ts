import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { scanFromURLAsync } from "expo-camera";
import * as Haptics from "@/shared/utils/haptics";
import { decodeQrFromImageUri } from "@/features/scanner/utils/qr-decode";

export async function pickAndDecodeImage(
  token: string | null | undefined,
  isCameraAvailable: boolean
): Promise<{ success: boolean; content?: string; error?: string }> {
  if (!token) return { success: false, error: "Sign in to scan QR codes from your gallery." };

  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const isAndroid = Platform.OS === "android";
  let result: ImagePicker.ImagePickerResult;

  try {
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      allowsMultipleSelection: false,
      base64: isAndroid,
    });
  } catch {
    return { success: false, error: "Could not open your gallery. Please try again." };
  }

  if (result.canceled || !result.assets?.[0]) return { success: false };

  const asset = result.assets[0];
  let content: string | null = null;

  try {
    if (Platform.OS === "web") {
      content = await decodeQrFromImageUri(asset.uri);
    } else if (isAndroid && !isCameraAvailable && asset.base64) {
      content = await decodeImageViaServer(asset.base64, token);
    } else {
      const results = await scanFromURLAsync(asset.uri, ["qr"]).catch(() => null);
      content = results?.[0]?.data ?? null;
      if (!content && asset.base64) {
        content = await decodeImageViaServer(asset.base64, token);
      }
    }
  } catch {}

  if (!content) return { success: false, error: "No QR code found in this image — try a clearer photo." };
  return { success: true, content };
}

async function decodeImageViaServer(base64: string, token: string): Promise<string | null> {
  try {
    const { getApiUrl } = await import("@/lib/core/query-client");
    const res = await fetch(new URL("/api/qr/decode-image", getApiUrl()).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ imageBase64: base64 }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.content ?? null;
  } catch {
    return null;
  }
}
