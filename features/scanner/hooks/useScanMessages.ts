import { useState } from "react";

export type ScanMsgType = "error" | "warning" | "info";

/**
 * Manages all transient message / banner state for the scanner UI.
 * Extracted from useScanner so the facade stays focused on wiring hooks together.
 */
export function useScanMessages() {
  const [galleryErrorMsg,     setGalleryErrorMsg]     = useState<string | null>(null);
  const [scannerMsg,          setScannerMsg]           = useState<string | null>(null);
  const [scannerMsgType,      setScannerMsgType]       = useState<ScanMsgType>("error");
  const [conversionBannerMsg, setConversionBannerMsg] = useState<string | null>(null);

  function showScannerMsg(msg: string, type: ScanMsgType = "error") {
    setScannerMsg(msg);
    setScannerMsgType(type);
  }

  function showGalleryError(msg: string)    { setGalleryErrorMsg(msg); }
  function dismissGalleryError()             { setGalleryErrorMsg(null); }
  function dismissScannerMsg()               { setScannerMsg(null); }
  function dismissConversionBanner()         { setConversionBannerMsg(null); }

  return {
    galleryErrorMsg,
    scannerMsg,
    scannerMsgType,
    conversionBannerMsg,
    setConversionBannerMsg,
    showScannerMsg,
    showGalleryError,
    dismissGalleryError,
    dismissScannerMsg,
    dismissConversionBanner,
  };
}
