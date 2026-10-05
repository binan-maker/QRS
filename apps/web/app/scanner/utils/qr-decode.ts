import { loadJsQr, isValidDecodedQr } from "../components/system/CameraView";

/**
 * Web QR code decoding from an image URI using jsQR + Canvas API with
 * native BarcodeDetector fallback.
 * Safe across all ESM/CJS bundlers and browser environments.
 */
export async function decodeQrFromImageUri(imageUri: string): Promise<string | null> {
  if (typeof window === "undefined" || !imageUri) return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = async () => {
      try {
        const naturalWidth = img.naturalWidth || img.width;
        const naturalHeight = img.naturalHeight || img.height;

        if (!naturalWidth || !naturalHeight) {
          resolve(null);
          return;
        }

        // 1. Try native BarcodeDetector first if available (faster & hardware accelerated)
        if ("BarcodeDetector" in window) {
          try {
            const DetectorApi = (window as any).BarcodeDetector;
            const detector = new DetectorApi({ formats: ["qr_code"] });
            const results = await detector.detect(img);
            const match = results.find(
              (r: any) => r.rawValue && isValidDecodedQr(r.rawValue)
            );
            if (match?.rawValue) {
              resolve(match.rawValue.trim());
              return;
            }
          } catch {}
        }

        // 2. Fall back to jsQR with multi-pass canvas decoding
        const engine = await loadJsQr();
        if (!engine) {
          resolve(null);
          return;
        }

        const canvas = document.createElement("canvas");
        const maxDim = 1200;
        const scale =
          naturalWidth > maxDim || naturalHeight > maxDim
            ? maxDim / Math.max(naturalWidth, naturalHeight)
            : 1;

        canvas.width = Math.max(1, Math.round(naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(naturalHeight * scale));

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const code = engine(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
        });

        if (code?.data && isValidDecodedQr(code.data)) {
          resolve(code.data.trim());
          return;
        }

        resolve(null);
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => {
      resolve(null);
    };

    img.src = imageUri;
  });
}
