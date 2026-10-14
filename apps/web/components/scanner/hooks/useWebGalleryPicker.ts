"use client";

import { decodeQrFromImageUri } from "../utils/qr-decode";

export function pickWebGalleryImage(
  token: string | null | undefined,
  showError: (msg: string) => void,
  onDecoded: (content: string) => Promise<void>
): void {
  if (!token) {
    showError("Sign in to scan QR codes from your gallery.");
    return;
  }
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const uri = reader.result as string;
      try {
        const decoded = await decodeQrFromImageUri(uri);
        if (decoded) {
          await onDecoded(decoded);
        } else {
          showError("No QR code found in this image — try a clearer photo.");
        }
      } catch {
        showError("Failed to decode image. Please try again.");
      }
    };
    reader.readAsDataURL(file);
  };
  input.click();
}
