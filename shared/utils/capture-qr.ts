/**
 * Robust QR image capture utility.
 *
 * react-native-qrcode-svg exposes toDataURL via the getRef callback,
 * but the callback can fire with undefined if the SVG hasn't been
 * fully painted yet. This helper:
 *  1. Verifies the ref and toDataURL are ready.
 *  2. Waits two animation frames so the component is fully rendered.
 *  3. Applies a hard 10-second timeout.
 *  4. Normalises the result — strips data-URI prefix if present.
 */

function waitFrames(n: number): Promise<void> {
  return new Promise((resolve) => {
    let remaining = n;
    function tick() {
      if (--remaining <= 0) resolve();
      else requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

export async function captureQrImage(
  svgRef: React.MutableRefObject<any>
): Promise<string> {
  if (!svgRef.current) {
    throw new Error("QR code is not ready. Please wait for it to appear and try again.");
  }

  if (typeof svgRef.current.toDataURL !== "function") {
    throw new Error("QR code is still loading. Please wait a moment and try again.");
  }

  await waitFrames(2);

  const dataUrl: string = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("QR image capture timed out. Please try again.")),
      10000
    );

    try {
      svgRef.current.toDataURL((url: string | null | undefined) => {
        clearTimeout(timer);
        if (!url || typeof url !== "string" || url.trim() === "") {
          reject(
            new Error("Could not capture QR image. Make sure the QR code is visible on screen and try again.")
          );
        } else {
          resolve(url);
        }
      });
    } catch (err) {
      clearTimeout(timer);
      reject(err);
    }
  });

  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  if (!base64 || base64.trim() === "") {
    throw new Error("QR image data was empty. Please try again.");
  }
  return base64;
}
