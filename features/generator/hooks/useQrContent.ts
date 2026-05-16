import { useState, useRef, useEffect } from "react";
import { buildQrContent, validateQrInput } from "@/features/generator/data/qr-builder";
import { computeUrlRisk } from "@/lib/utils/url-risk";
import { buildBusinessContent } from "@/features/generator/data/business-content";
import type { BusinessCategory } from "@/features/generator/components/BusinessTypeSelector";
import type { QrMode } from "@/features/generator/types/form-types";

interface Params {
  inputValue:       string;
  extraFields:      Record<string, string>;
  selectedPreset:   number;
  qrMode:           QrMode;
  businessCategory: BusinessCategory;
  isBranded:        boolean;
  showToast:        (msg: string, type?: "success" | "error") => void;
}

export function useQrContent({
  inputValue,
  extraFields,
  selectedPreset,
  qrMode,
  businessCategory,
  isBranded,
  showToast,
}: Params) {
  const [qrValue,        setQrValue]        = useState("");
  const [generatedUuid,  setGeneratedUuid]  = useState<string | null>(null);
  const [generatedAt,    setGeneratedAt]    = useState<Date | null>(null);
  const [urlRiskScore,   setUrlRiskScore]   = useState(0);
  const [urlRiskReasons, setUrlRiskReasons] = useState<string[]>([]);
  const riskShownFor = useRef<string>("");

  // ── Live content building (debounced 350 ms) ──────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!inputValue.trim()) {
        setQrValue("");
        setGeneratedUuid(null);
        setGeneratedAt(null);
        return;
      }

      if (qrMode === "business" && isBranded) {
        const dest = buildBusinessContent(inputValue, businessCategory, extraFields);
        if (dest) { setQrValue(dest); setGeneratedAt(new Date()); }
        else       { setQrValue(""); }
        return;
      }

      const error = validateQrInput(selectedPreset, inputValue, extraFields);
      if (error) return;

      const built = buildQrContent(selectedPreset, inputValue, extraFields);
      if (built) {
        setQrValue(built);
        setGeneratedUuid(null);
        setGeneratedAt(new Date());
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [inputValue, extraFields, selectedPreset, qrMode, businessCategory, isBranded]);

  // ── URL risk analysis ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!qrValue || qrMode === "business") {
      setUrlRiskScore(0);
      setUrlRiskReasons([]);
      riskShownFor.current = "";
      return;
    }
    const { score, reasons } = computeUrlRisk(qrValue);
    setUrlRiskScore(score);
    setUrlRiskReasons(reasons);
    if (score >= 35 && riskShownFor.current !== qrValue) {
      riskShownFor.current = qrValue;
      const level = score >= 70 ? "High risk" : "Caution";
      setTimeout(
        () => showToast(`${level}: ${reasons[0] ?? "Suspicious content"}`, "error"),
        300,
      );
    }
  }, [qrValue, qrMode, showToast]);

  return {
    qrValue,
    setQrValue,
    generatedUuid,
    setGeneratedUuid,
    generatedAt,
    setGeneratedAt,
    urlRiskScore,
    urlRiskReasons,
  };
}
