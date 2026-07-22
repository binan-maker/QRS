// ─── Scan Modals ──────────────────────────────────────────────────────────────
// Single responsibility: all post-scan modal state and their handler logic.
// Covers three independent modal groups:
//   1. Verified branded QR modal
//   2. Unverified branded QR modal (countdown timer)
//   3. Living Shield modal (dynamic QR codes)
// Contains zero camera state and zero database calls.
//
// NOTE: The Safety Modal was removed. openSafetyModal() now navigates directly
// to /qr-detail/:id so the user reaches the result immediately without an
// extra confirmation step.

import { useState, useRef, useEffect } from "react";
import { router } from "expo-router";
import { Linking } from "react-native";
import type { GuardLink } from "@/lib/firestore-service";

export interface ScanModalControls {
  openSafetyModal:       (qrId: string) => void;
  openVerifiedModal:     (qrId: string, ownerName: string) => void;
  openLivingShieldModal: () => void;
  setLivingShieldData:   (data: GuardLink | null) => void;
  setLivingShieldLoading:(loading: boolean) => void;
}

export function useScanModals(resetScan: () => void) {
  // ── Verified modal ──────────────────────────────────────────────────────────
  const [verifiedModal,     setVerifiedModal]     = useState(false);
  const [verifiedOwnerName, setVerifiedOwnerName] = useState("");
  const [verifiedQrId,      setVerifiedQrId]      = useState<string | null>(null);

  // ── Unverified modal ────────────────────────────────────────────────────────
  const [unverifiedModal,     setUnverifiedModal]     = useState(false);
  const [unverifiedQrId,      setUnverifiedQrId]      = useState<string | null>(null);
  const [unverifiedCountdown, setUnverifiedCountdown] = useState(3);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Living Shield modal ─────────────────────────────────────────────────────
  const [livingShieldModal,   setLivingShieldModal]   = useState(false);
  const [livingShieldData,    setLivingShieldData]    = useState<GuardLink | null>(null);
  const [livingShieldLoading, setLivingShieldLoading] = useState(false);

  // ── Verified modal: auto-navigate after 2.2 s ───────────────────────────────
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
  // Safety modal removed — navigate directly to QR detail instead of interrupting the user.
  function openSafetyModal(qrId: string) {
    router.push(`/qr-detail/${qrId}`);
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
    verifiedModal,
    verifiedOwnerName,
    unverifiedModal,
    unverifiedCountdown,
    livingShieldModal,
    livingShieldData,
    livingShieldLoading,
    handleUnverifiedProceed,
    handleUnverifiedBack,
    handleLivingShieldProceed,
    handleLivingShieldCancel,
  };
}
