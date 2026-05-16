/**
 * Web-only QR code decoding from an image URI using jsQR + Canvas API.
 * Extracted from useScanProcessor so the hook stays free of browser APIs.
 */
export async function decodeQrFromImageUri(imageUri: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new (window as any).Image() as HTMLImageElement;
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      try {
        const canvas = document.createElement("canvas");
        const maxDim = 1200;
        const scale =
          img.naturalWidth > maxDim || img.naturalHeight > maxDim
            ? maxDim / Math.max(img.naturalWidth, img.naturalHeight)
            : 1;
        canvas.width  = Math.round(img.naturalWidth  * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const jsQR = (await import("jsqr")).default;
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
        });
        resolve(code ? code.data : null);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageUri;
  });
}
