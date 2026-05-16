import type { useTheme } from "@/contexts/ThemeContext";

export interface LocalScan {
  id: string;
  content: string;
  contentType: string;
  scannedAt: string;
  qrCodeId?: string;
}

export type HomeColors = ReturnType<typeof useTheme>["colors"];
