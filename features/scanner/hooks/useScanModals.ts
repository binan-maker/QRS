// ─── Scan Modals ──────────────────────────────────────────────────────────────
// Single responsibility: all post-scan modal state and their handler logic.
// Covers four independent modal groups:
//   1. Safety warning modal (insecure HTTP, dangerous URLs)
//   2. Verified branded QR modal
//   3. Unverified branded QR modal (countdown timer)
//   4. Living Shield modal (dynamic QR codes)
// Contains zero camera state and zero database calls.

import { useState, useRef, useEffect } from "react";
import { router } from "expo-router";
import { Linking } from "react-native";
import type { GuardLink } from "@/lib/firestore-service";

export interface ScanModalControls {
  openSafetyModal: (qrId: string, riskLevel: "caution" | "dangerous") => void;
  openVerifiedModal: (qrId: string, ownerName: string) => void;
  openLivingShieldModal: () => void;
  setLivingShieldData: (data: GuardLink | null) => void;
  setLivingShieldLoading: (loading: boolean) => void;
}

export function useScanModals(resetScan: () => void) {
  // ── Safety modal ────────────────────────────────────────────────────────────
  const [safetyModal, setSafetyModal]           = useState(false);
  const [pendingQrId, setPendingQrId]           = useState<string | null>(null);
  const [safetyWarnings, setSafetyWarnings]     = useState<string[]>([]);
  const [safetyRiskLevel, setSafetyRiskLevel]   = useState<"caution" | "dangerous">("caution");

  // ── Verified modal ──────────────────────────────────────────────────────────
  const [verifiedModal, setVerifiedModal]       = useState(false);
  const [verifiedOwnerName, setVerifiedOwnerName] = useState("");
  const [verifiedQrId, setVerifiedQrId]         = useState<string | null>(null);

  // ── Unverified modal ────────────────────────────────────────────────────────
  const [unverifiedModal, setUnverifiedModal]   = useState(false);
  const [unverifiedQrId, setUnverifiedQrId]     = useState<string | null>(null);
  const [unverifiedCountdown, setUnverifiedCountdown] = useState(3);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Living Shield modal ─────────────────────────────────────────────────────
  const [livingShieldModal, setLivingShieldModal]   = useState(false);
  const [livingShieldData, setLivingShieldData]     = useState<GuardLink | null>(null);
  const [livingShieldLoading, setLivingShieldLoading] = useState(false);

  // ── Verified modal: auto-navigate after 2.2s ────────────────────────────────
  useEffect(() => {
    if (!verifiedModal) return;
    const t = setTimeout(() => {
      setVerifiedModal(false);
      if (verifiedQrId) router.push(`/qr-detail/${verifiedQrId}`);
    }, 2200);
    return () => clearTimeout(t);
  }, [verifiedModal, verifiedQrId]);

  // ── Unverified modal: countdown timer ──────────────────────────────────────
  useEffect(() => {
    if (!unverifiedModal) return;
    setUnverifiedCountdown(3);
    countdownRef.current = setInterval(() => {
      setUnverifiedCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownRef.current!);
          setUnverifiedModal(false);
          if (unverifiedQrId) router.push(`/qr-detail/${unverifiedQrId}`);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [unverifiedModal, unverifiedQrId]);

  // ── Control functions exposed to useScanProcessor ──────────────────────────
  function openSafetyModal(qrId: string, riskLevel: "caution" | "dangerous") {
    setPendingQrId(qrId);
    setSafetyRiskLevel(riskLevel);
    setSafetyModal(true);
  }

  function openVerifiedModal(qrId: string, ownerName: string) {
    setVerifiedOwnerName(ownerName);
    setVerifiedQrId(qrId);
    setVerifiedModal(true);
  }

  function openLivingShieldModal() {
    setLivingShieldModal(true);
  }

  // ── User-facing handlers ────────────────────────────────────────────────────
  function handleSafetyModalProceed() {
    if (!pendingQrId) return;
    setSafetyModal(false);
    router.push(`/qr-detail/${pendingQrId}`);
  }

  function handleSafetyModalBack() {
    setSafetyModal(false);
    setPendingQrId(null);
    setSafetyWarnings([]);
    resetScan();
  }

  function handleUnverifiedProceed() {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setUnverifiedModal(false);
    if (unverifiedQrId) router.push(`/qr-detail/${unverifiedQrId}`);
  }

  function handleUnverifiedBack() {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setUnverifiedModal(false);
    setUnverifiedQrId(null);
    resetScan();
  }

  async function handleLivingShieldProceed() {
    if (!livingShieldData?.currentDestination) return;
    const dest = livingShieldData.currentDestination;
    setLivingShieldModal(false);
    setLivingShieldData(null);
    resetScan();
    await Linking.openURL(dest.startsWith("http") ? dest : `https://${dest}`);
  }

  function handleLivingShieldCancel() {
    setLivingShieldModal(false);
    setLivingShieldData(null);
    resetScan();
  }

  const controls: ScanModalControls = {
    openSafetyModal,
    openVerifiedModal,
    openLivingShieldModal,
    setLivingShieldData,
    setLivingShieldLoading,
  };

  return {
    controls,
    safetyModal,
    safetyWarnings,
    safetyRiskLevel,
    verifiedModal,
    verifiedOwnerName,
    unverifiedModal,
    unverifiedCountdown,
    livingShieldModal,
    livingShieldData,
    livingShieldLoading,
    handleSafetyModalProceed,
    handleSafetyModalBack,
    handleUnverifiedProceed,
    handleUnverifiedBack,
    handleLivingShieldProceed,
    handleLivingShieldCancel,
  };
}
