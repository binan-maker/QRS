import { useState, useCallback } from "react";
import * as Crypto from "expo-crypto";
import * as Haptics from "@/lib/haptics";
import {
  saveGeneratedQr,
  saveGuardLink,
  saveStandardLink,
  type QrType,
} from "@/lib/firestore-service";
import { buildQrContent, validateQrInput } from "@/features/generator/data/qr-builder";
import {
  buildBusinessContent,
  validateBusinessInput,
  getBusinessContentType,
} from "@/features/generator/data/business-content";
import { QR_PRESETS } from "@/features/generator/data/presets";
import { QR_REGISTRY } from "@/features/generator/data/registry";
import { resolveExpiryDate, type AdvancedSettings } from "@/features/generator/components/AdvancedSettingsPanel";
import type { BusinessCategory } from "@/features/generator/components/BusinessTypeSelector";
import type { QrMode } from "@/features/generator/types/form-types";
import { appendToLocalScanHistory } from "@/features/scanner/utils/scan-history";
import { clearCache } from "@/lib/cache/local-cache";

function myQrsCacheKey(userId: string) { return `myqrs_v1_${userId}`; }

function getFirestoreContentType(presetIdx: number): string {
  return QR_PRESETS[presetIdx]?.contentType ?? "text";
}

function getStableQrBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain && domain.trim()) return `https://${domain.trim()}`.replace(/\/$/, "");
  return "https://qrguard.app";
}

interface Params {
  qrMode:           QrMode;
  isBranded:        boolean;
  privateMode:      boolean;
  selectedPreset:   number;
  inputValue:       string;
  extraFields:      Record<string, string>;
  businessCategory: BusinessCategory;
  businessName:     string;
  user:             any;
  customLogoBase64: string | null;
  qrFgColor:        string;
  qrBgColor:        string;
  advancedSettings: AdvancedSettings;
  setQrValue:       (v: string) => void;
  setGeneratedUuid: (v: string | null) => void;
  setGeneratedAt:   (v: Date | null) => void;
  showToast:        (msg: string, type?: "success" | "error") => void;
}

export function useQrSave({
  qrMode,
  isBranded,
  privateMode,
  selectedPreset,
  inputValue,
  extraFields,
  businessCategory,
  businessName,
  user,
  customLogoBase64,
  qrFgColor,
  qrBgColor,
  advancedSettings,
  setQrValue,
  setGeneratedUuid,
  setGeneratedAt,
  showToast,
}: Params) {
  const [saving,         setSaving]         = useState(false);
  const [savedToProfile, setSavedToProfile] = useState(false);
  const [savedDocId,     setSavedDocId]     = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    const isBusinessMode = qrMode === "business" && isBranded && !!user;
    const isStandardMode = !isBusinessMode && isBranded && !privateMode && !!user;

    // ── Validate ──────────────────────────────────────────────────────────
    if (qrMode === "business" && isBranded) {
      const err = validateBusinessInput(inputValue, businessCategory);
      if (err) {
        showToast(err, "error");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
    } else {
      const err = validateQrInput(selectedPreset, inputValue, extraFields);
      if (err) {
        showToast(err, "error");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
    }

    // ── Build raw content ─────────────────────────────────────────────────
    const builtContent = (qrMode === "business" && isBranded)
      ? (buildBusinessContent(inputValue, businessCategory, extraFields) ?? "")
      : buildQrContent(selectedPreset, inputValue, extraFields);

    // ── Generate short UUID ───────────────────────────────────────────────
    const hash      = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      builtContent + Date.now(),
    );
    const shortUuid = hash.slice(0, 16).toUpperCase().match(/.{1,4}/g)?.join("-") ?? hash.slice(0, 16);

    // ── Determine encoded QR value ────────────────────────────────────────
    const base = getStableQrBase();
    let encodedValue = builtContent;
    if (isBusinessMode)  encodedValue = `${base}/guard/${shortUuid}`;
    else if (isStandardMode) encodedValue = `${base}/go/${shortUuid}`;

    setQrValue(encodedValue);
    setGeneratedUuid(isBranded ? shortUuid : null);
    setGeneratedAt(new Date());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // ── Save to Firestore ─────────────────────────────────────────────────
    if (isBranded && user) {
      setSaving(true);
      setSavedToProfile(false);
      setSavedDocId(null);
      try {
        const qt: QrType = qrMode === "business" ? "business" : "individual";
        const logoToStore = qrMode === "business" ? (customLogoBase64 ?? null) : null;
        const bName       = qrMode === "business" ? (businessName.trim() || null) : null;
        const savedContentType = isBusinessMode
          ? getBusinessContentType(businessCategory)
          : getFirestoreContentType(selectedPreset);
        const templateKey = isBusinessMode
          ? businessCategory
          : (QR_REGISTRY[selectedPreset]?.key ?? null);

        try {
          if (isBusinessMode) {
            await saveGuardLink(shortUuid, builtContent, bName, user.displayName, user.id, savedContentType, templateKey);
          } else if (isStandardMode) {
            await saveStandardLink(shortUuid, builtContent, savedContentType, user.id, user.displayName, templateKey);
          }
        } catch (linkErr: any) {
          if (__DEV__) console.warn("[save] link registration failed (non-fatal):", linkErr?.message);
        }

        const expiryDate = resolveExpiryDate(advancedSettings.expiryPreset, advancedSettings.expiryCustomDate);
        const docId = await saveGeneratedQr(
          user.id,
          user.displayName,
          encodedValue,
          savedContentType,
          shortUuid,
          true,
          qt,
          bName,
          logoToStore,
          isBusinessMode ? shortUuid : null,
          {
            fgColor:   qrFgColor,
            bgColor:   qrBgColor,
            scanLimit: advancedSettings.scanLimit,
            expiryDate,
            label:     advancedSettings.label.trim() || null,
          },
          isBusinessMode
            ? inputValue.trim()
            : isStandardMode
              ? builtContent
              : null,
          templateKey,
          isBusinessMode ? null : { value: inputValue, extra: extraFields },
        );
        setSavedDocId(docId);
        setSavedToProfile(true);
        setTimeout(() => setSavedToProfile(false), 4000);

        // Compute the qrCodeId (SHA-256 of encodedValue, first 20 chars) so the
        // History page can navigate to the correct QR Detail screen.
        const qrIdHash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          encodedValue,
        );
        const computedQrCodeId = qrIdHash.slice(0, 20);

        // Add to local scan history so this QR appears on the History page.
        appendToLocalScanHistory(user.id, {
          id: `gen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          content: builtContent,
          contentType: savedContentType,
          scannedAt: new Date().toISOString(),
          qrCodeId: computedQrCodeId,
          scanSource: "camera",
        }).catch(() => {});

        // Invalidate the My QR Codes 5-min cache so the new QR appears immediately.
        clearCache(myQrsCacheKey(user.id)).catch(() => {});
      } catch (err: any) {
        showToast(err?.message || "Could not save QR code. Please try again.", "error");
      } finally {
        setSaving(false);
      }
    }
  }, [
    qrMode, isBranded, privateMode, selectedPreset, inputValue, extraFields,
    businessCategory, businessName, user, customLogoBase64,
    qrFgColor, qrBgColor, advancedSettings,
    setQrValue, setGeneratedUuid, setGeneratedAt, showToast,
  ]);

  return { saving, savedToProfile, savedDocId, handleGenerate };
}
