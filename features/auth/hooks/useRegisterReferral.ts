import { useState, useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import * as Haptics from "@/shared/utils/haptics";
import {
  verifyReferralCode,
  getPendingReferralCode,
  savePendingReferralCode,
  clearPendingReferralCode,
} from "@/services/referrals";

export interface RegisterReferralState {
  referralCode: string;
  isReferralExpanded: boolean;
  setIsReferralExpanded: (v: boolean) => void;
  isReferralEditing: boolean;
  setIsReferralEditing: (v: boolean) => void;
  tempReferralInput: string;
  setTempReferralInput: (v: string) => void;
  referralValidating: boolean;
  referralError: string;
  setReferralError: (v: string) => void;
  editReferralInput: string;
  setEditReferralInput: (v: string) => void;
  editValidating: boolean;
  editError: string;
  setEditError: (v: string) => void;
  handleApplyReferral: (rawInput: string) => Promise<void>;
  handleApplyEditReferral: (rawInput: string) => Promise<void>;
  handleRemoveReferral: () => Promise<void>;
}

export function useRegisterReferral(): RegisterReferralState {
  const params = useLocalSearchParams<{ ref?: string; referral?: string; code?: string }>();
  const [referralCode, setReferralCode] = useState("");
  const [isReferralExpanded, setIsReferralExpanded] = useState(false);
  const [isReferralEditing, setIsReferralEditing] = useState(false);
  const [tempReferralInput, setTempReferralInput] = useState("");
  const [referralValidating, setReferralValidating] = useState(false);
  const [referralError, setReferralError] = useState("");
  const [editReferralInput, setEditReferralInput] = useState("");
  const [editValidating, setEditValidating] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    const paramRef = params?.ref || params?.referral || params?.code;
    if (paramRef && typeof paramRef === "string") {
      const clean = paramRef.trim().replace(/[^a-zA-Z0-9]/g, "").slice(0, 7).toLowerCase();
      if (clean.length === 7) {
        verifyReferralCode(clean)
          .then((res) => {
            if (res.valid) {
              setReferralCode(clean);
              setTempReferralInput(clean);
              setEditReferralInput(clean);
              savePendingReferralCode(clean).catch(() => {});
            }
          })
          .catch(() => {});
        return;
      }
    }

    getPendingReferralCode()
      .then((saved) => {
        if (saved) {
          const clean = saved.trim().toLowerCase();
          setReferralCode(clean);
          setTempReferralInput(clean);
          setEditReferralInput(clean);
        }
      })
      .catch(() => {});
  }, [params?.ref, params?.referral, params?.code]);

  async function handleApplyReferral(rawInput: string) {
    const clean = rawInput.trim().replace(/[^a-zA-Z0-9]/g, "").slice(0, 7).toLowerCase();
    if (clean.length !== 7) {
      setReferralError("Referral code must be 7 characters.");
      return;
    }

    setReferralValidating(true);
    setReferralError("");

    try {
      const result = await verifyReferralCode(clean);
      if (result.valid) {
        setReferralCode(clean);
        setEditReferralInput(clean);
        setIsReferralExpanded(false);
        setReferralError("");
        await savePendingReferralCode(clean);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setReferralError(result.error || "Invalid referral code.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      setReferralError("Invalid referral code.");
    } finally {
      setReferralValidating(false);
    }
  }

  async function handleApplyEditReferral(rawInput: string) {
    const clean = rawInput.trim().replace(/[^a-zA-Z0-9]/g, "").slice(0, 7).toLowerCase();

    if (!clean) {
      setReferralCode("");
      setTempReferralInput("");
      setEditReferralInput("");
      setIsReferralEditing(false);
      setEditError("");
      await clearPendingReferralCode();
      return;
    }

    if (clean.length !== 7) {
      setEditError("Referral code must be 7 characters.");
      return;
    }

    setEditValidating(true);
    setEditError("");

    try {
      const result = await verifyReferralCode(clean);
      if (result.valid) {
        setReferralCode(clean);
        setEditReferralInput(clean);
        setIsReferralEditing(false);
        setEditError("");
        await savePendingReferralCode(clean);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setEditError(result.error || "Invalid referral code.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      setEditError("Invalid referral code.");
    } finally {
      setEditValidating(false);
    }
  }

  async function handleRemoveReferral() {
    setReferralCode("");
    setTempReferralInput("");
    setEditReferralInput("");
    setIsReferralEditing(false);
    setReferralError("");
    setEditError("");
    await clearPendingReferralCode();
  }

  return {
    referralCode,
    isReferralExpanded,
    setIsReferralExpanded,
    isReferralEditing,
    setIsReferralEditing,
    tempReferralInput,
    setTempReferralInput,
    referralValidating,
    referralError,
    setReferralError,
    editReferralInput,
    setEditReferralInput,
    editValidating,
    editError,
    setEditError,
    handleApplyReferral,
    handleApplyEditReferral,
    handleRemoveReferral,
  };
}
