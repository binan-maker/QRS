/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BINRO API: SERVER-SIDE QR MATRIX DECODER
 * ───────────────────────────────────────────────────────────────────────────────
 * Decodes QR barcode matrices from raw image buffers using Jimp and jsQR.
 * Handles automatic scaling and color buffer normalization for high accuracy.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Decodes a QR code payload from a Base64 encoded image string.
 *
 * @param base64Data Base64 representation of the uploaded image
 * @returns Decoded text content or null if no valid QR matrix is found
 */
export async function decodeQrFromImage(base64Data: string): Promise<string | null> {
  try {
    const { Jimp } = await import("jimp");
    const jsQR = (await import("jsqr")).default;

    const buffer = Buffer.from(base64Data, "base64");
    let image = await Jimp.read(buffer);

    // Downscale oversized images (>1200px) to boost decode speed and minimize memory pressure
    const maxDim = 1200;
    if (image.bitmap.width > maxDim || image.bitmap.height > maxDim) {
      const scale = maxDim / Math.max(image.bitmap.width, image.bitmap.height);
      image = (image as any).resize({
        w: Math.round(image.bitmap.width * scale),
        h: Math.round(image.bitmap.height * scale),
      });
    }

    const { width, height } = image.bitmap;

    // Convert bitmap Buffer to Uint8ClampedArray RGBA pixel sequence
    const bitmapBuf: Buffer = image.bitmap.data as unknown as Buffer;
    const pixelData = new Uint8ClampedArray(bitmapBuf.buffer, bitmapBuf.byteOffset, bitmapBuf.byteLength);

    const code = jsQR(pixelData, width, height, {
      inversionAttempts: "attemptBoth",
    });

    return code ? code.data : null;
  } catch (error) {
    console.error("[image-decode] Decoding error:", error);
    return null;
  }
}
