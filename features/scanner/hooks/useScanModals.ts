// ─── Scan Modals ──────────────────────────────────────────────────────────────
// Single responsibility: all post-scan modal state and their handler logic.
// Covers two independent modal groups:
//   1. Verified branded QR modal
//   2. Unverified branded QR modal (countdown timer)
// Contains zero camera state and zero database calls.
//
// NOTE: The Safety Modal was removed. openSafetyModal() now navigates directly
// to /qr-detail/:id so the user reaches the result immediately without an
// extra confirmation step.

import { useState, useRef, useEffect } from "react";
import { router } from "expo-router";

export interface ScanModalControls {
  openSafetyModal:       (qrId: string) => void;
  openVerifiedModal:     (qrId: string, ownerName: string) => void;
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

  const controls: ScanModalControls = {
    openSafetyModal,
    openVerifiedModal,
  };

  return {
    controls,
    verifiedModal,
    verifiedOwnerName,
    unverifiedModal,
    unverifiedCountdown,
    handleUnverifiedProceed,
    handleUnverifiedBack,
  };
}
