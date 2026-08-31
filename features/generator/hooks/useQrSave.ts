import { useState, useCallback, useEffect, useRef } from "react";
import * as Crypto from "expo-crypto";
import * as Haptics from "@/shared/utils/haptics";
import {
  saveGeneratedQr,
  type QrType,
} from "@/lib/firestore-service";
import { createUnifiedQr } from "@/services/qr/qr-unified";
import { checkQrNameExists, buildNameSuggestions } from "@/services/generator/crud";
import { buildQrContent, validateQrInput } from "@/features/generator/data/qr-builder";
import { QR_PRESETS } from "@/features/generator/data/presets";
import { QR_REGISTRY } from "@/features/generator/data/registry";
import { resolveExpiryDate, type AdvancedSettings } from "@/features/generator/components/AdvancedSettingsPanel";
import type { QrMode } from "@/features/generator/types/form-types";
import { appendToLocalScanHistory } from "@/features/scanner/utils/scan-history";
import { clearCache } from "@/services/cache/local-cache";
import { ENV } from "@/config/env";
import { DEFAULT_QR_URL } from "@/config/app";

function myQrsCacheKey(userId: string) { return `myqrs_v1_${userId}`; }

function getFirestoreContentType(presetIdx: number): string {
  return QR_PRESETS[presetIdx]?.contentType ?? "text";
}

function getStableQrBase(): string {
  const domain = ENV.DOMAIN;
  if (domain && domain.trim()) {
    let hostname = domain.trim();
    try {
      const parsed = new URL(hostname.startsWith("http") ? hostname : `https://${hostname}`);
      hostname = parsed.hostname;
    } catch {
      hostname = hostname.replace(/^https?:\/\//, "").split(/[/:?#]/)[0];
    }
    if (
      hostname.endsWith(".replit.app") ||
      hostname.endsWith(".replit.dev") ||
      hostname.endsWith(".repl.co") ||
      hostname === "localhost" ||
      hostname.startsWith("localhost:")
    ) {
      return DEFAULT_QR_URL;
    }
    return `https://${hostname}`;
  }
  return DEFAULT_QR_URL;
}

interface Params {
  qrMode:           QrMode;
  isBranded:        boolean;
  privateMode:      boolean;
  selectedPreset:   number;
  inputValue:       string;
  extraFields:      Record<string, string>;
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
  const [saving,           setSaving]           = useState(false);
  const [savedToProfile,   setSavedToProfile]   = useState(false);
  const [savedDocId,       setSavedDocId]       = useState<string | null>(null);
  const [nameSuggestions,  setNameSuggestions]  = useState<string[]>([]);
  const savedProfileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the savedToProfile auto-hide timer on unmount to avoid state
  // updates on an unmounted component.
  useEffect(() => () => {
    if (savedProfileTimerRef.current) clearTimeout(savedProfileTimerRef.current);
  }, []);

  const clearNameSuggestions = useCallback(() => setNameSuggestions([]), []);

  const handleGenerate = useCallback(async () => {
    const isStandardMode = isBranded && !privateMode && !!user;

    // ── Validate ──────────────────────────────────────────────────────────
    const err = validateQrInput(selectedPreset, inputValue, extraFields);
    if (err) {
      showToast(err, "error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // ── Build raw content ─────────────────────────────────────────────────
    const builtContent = buildQrContent(selectedPreset, inputValue, extraFields);

    // ── Generate short UUID ───────────────────────────────────────────────
    const hash      = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      builtContent + Date.now(),
    );
    const shortUuid = hash.slice(0, 16).toUpperCase().match(/.{1,4}/g)?.join("-") ?? hash.slice(0, 16);

    // ── Determine encoded QR value ────────────────────────────────────────
    const base = getStableQrBase();
    let encodedValue = builtContent;
    if (isBranded && !privateMode) encodedValue = `${base}/q/${shortUuid}`;

    setQrValue(encodedValue);
    setGeneratedUuid(isBranded ? shortUuid : null);
    setGeneratedAt(new Date());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // ── Save to Firestore ─────────────────────────────────────────────────
    if (isBranded && user) {
      setSaving(true);
      setSavedToProfile(false);
      setSavedDocId(null);
      setNameSuggestions([]);
      try {
        // ── Duplicate name check ─────────────────────────────────────────
        const nameLabel = advancedSettings.label.trim();
        if (nameLabel) {
          const nameExists = await checkQrNameExists(user.id, nameLabel);
          if (nameExists) {
            const suggestions = buildNameSuggestions(nameLabel);
            setNameSuggestions(suggestions);
            showToast(`"${nameLabel}" already exists. Choose a different name.`, "error");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setSaving(false);
            return;
          }
        }
        const qt: QrType = "individual";
        const savedContentType = getFirestoreContentType(selectedPreset);
        const templateKey = QR_REGISTRY[selectedPreset]?.key ?? null;

        const expiryDate = resolveExpiryDate(advancedSettings.expiryPreset, advancedSettings.expiryCustomDate);
        const scanLimit = advancedSettings.scanLimit ?? null;

        // ── Write unified qrs/{id} doc ────────────────────────────────────
        try {
          await createUnifiedQr({
            id: shortUuid,
            ownerId: user.id,
            ownerName: user.displayName,
            qrType: qt,
            template: templateKey,
            title: advancedSettings.label.trim() || null,
            isDynamic: false,
            destination: encodedValue,
            rawDestination: builtContent,
            contentType: savedContentType,
            businessName: null,
            scanLimit,
            expiryDate,
            expiryPreset: advancedSettings.expiryPreset === "never" ? null : advancedSettings.expiryPreset,
            design: {
              fgColor: qrFgColor,
              bgColor: qrBgColor,
              logoPosition: "center",
              logoUri: null,
              label: advancedSettings.label.trim() || null,
            },
            formValues: { value: inputValue, extra: extraFields },
          });
        } catch (unifiedErr: any) {
          if (__DEV__) console.warn("[save] unified qr write failed (non-fatal):", unifiedErr?.message);
        }

        const docId = await saveGeneratedQr(
          user.id,
          user.displayName,
          encodedValue,
          savedContentType,
          shortUuid,
          true,
          qt,
          null,
          null,
          null,
          {
            fgColor:      qrFgColor,
            bgColor:      qrBgColor,
            scanLimit,
            expiryDate,
            expiryPreset: advancedSettings.expiryPreset === "never" ? null : advancedSettings.expiryPreset,
            label:        advancedSettings.label.trim() || null,
          },
          isStandardMode ? builtContent : null,
          templateKey,
          { value: inputValue, extra: extraFields },
        );
        setSavedDocId(docId);
        setSavedToProfile(true);
        if (savedProfileTimerRef.current) clearTimeout(savedProfileTimerRef.current);
        savedProfileTimerRef.current = setTimeout(() => setSavedToProfile(false), 4000);

        const qrIdHash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          encodedValue,
        );
        const computedQrCodeId = qrIdHash.slice(0, 20);

        appendToLocalScanHistory(user.id, {
          id: `gen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          content: builtContent,
          contentType: savedContentType,
          scannedAt: new Date().toISOString(),
          qrCodeId: computedQrCodeId,
          scanSource: "camera",
        }).catch(() => {});

        clearCache(myQrsCacheKey(user.id)).catch(() => {});
      } catch (err: any) {
        showToast(err?.message || "Could not save QR code. Please try again.", "error");
      } finally {
        setSaving(false);
      }
    }
  }, [
    qrMode, isBranded, privateMode, selectedPreset, inputValue, extraFields,
    user,
    qrFgColor, qrBgColor, advancedSettings,
    setQrValue, setGeneratedUuid, setGeneratedAt, showToast,
  ]);

  return { saving, savedToProfile, savedDocId, handleGenerate, nameSuggestions, clearNameSuggestions };
}
