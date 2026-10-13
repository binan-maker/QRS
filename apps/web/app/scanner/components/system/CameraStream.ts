"use client";

let sharedMediaStream: MediaStream | null = null;

export async function acquireCameraStream(facing: "back" | "front" = "back"): Promise<MediaStream> {
  if (sharedMediaStream && sharedMediaStream.active) {
    return sharedMediaStream;
  }
  const facingMode = facing === "front" ? "user" : { ideal: "environment" };
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode,
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  });
  sharedMediaStream = stream;
  return stream;
}

export function stopSharedCameraStream(): void {
  if (sharedMediaStream) {
    sharedMediaStream.getTracks().forEach((t) => {
      try { t.stop(); } catch {}
    });
    sharedMediaStream = null;
  }
}

export async function applyTrackTorch(stream: MediaStream | null, enabled: boolean): Promise<void> {
  if (!stream) return;
  const track = stream.getVideoTracks()[0];
  if (!track) return;
  const capabilities = (track.getCapabilities?.() as any) ?? {};
  if (capabilities.torch) {
    try {
      await (track.applyConstraints as any)({ advanced: [{ torch: enabled }] });
    } catch {}
  }
}

export async function applyTrackZoom(stream: MediaStream | null, zoomFactor: number): Promise<void> {
  if (!stream) return;
  const track = stream.getVideoTracks()[0];
  if (!track) return;
  const capabilities = (track.getCapabilities?.() as any) ?? {};
  if (capabilities.zoom) {
    try {
      const min = capabilities.zoom.min || 1;
      const max = capabilities.zoom.max || 3;
      const target = Math.min(max, Math.max(min, 1 + zoomFactor * (max - 1)));
      await (track.applyConstraints as any)({ advanced: [{ zoom: target }] });
    } catch {}
  }
}
