import { useState, useEffect } from "react";
import { Alert } from "react-native";
import * as Haptics from "@/shared/utils/haptics";
import {
  getGuardLink, updateGuardLinkDestination,
  getStandardLink, updateStandardLinkRawContent, updateDisplayDestination,
  updateSavedQrContent,
  type GeneratedQrItem, type GuardLink,
} from "@/lib/firestore-service";
import { scanUrl } from "@/services/analysis/url-scanner";
import { useAuth } from "@/shared/contexts/AuthContext";

type SetQrItem = (item: GeneratedQrItem) => void;

export function useQrDestination(
  qrItem: GeneratedQrItem | null,
  setQrItem: SetQrItem
) {
  const { user } = useAuth();
  const [guardLink, setGuardLink] = useState<GuardLink | null>(null);
  const [standardLink, setStandardLink] = useState<{ rawContent: string; contentType: string; ownerId: string; ownerName: string; isActive: boolean } | null>(null);

  const [editingDestination, setEditingDestination] = useState(false);
  const [newDestination, setNewDestination] = useState("");
  const [savingDestination, setSavingDestination] = useState(false);
  const [destinationError, setDestinationError] = useState<string | null>(null);

  const [editingSavedContent, setEditingSavedContent] = useState(false);
  const [newSavedContent, setNewSavedContent] = useState("");
  const [savingSavedContent, setSavingSavedContent] = useState(false);
  const [savedContentError, setSavedContentError] = useState<string | null>(null);

  const [isValidating, setIsValidating] = useState(false);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingConfirmAction, setPendingConfirmAction] = useState<(() => Promise<void>) | null>(null);
  const [confirmModalMessage, setConfirmModalMessage] = useState("");

  useEffect(() => {
    if (!qrItem?.guardUuid) { setGuardLink(null); return; }
    getGuardLink(qrItem.guardUuid).then((link) => {
      setGuardLink(link);
      if (link) setNewDestination(link.currentDestination);
    });
  }, [qrItem?.guardUuid]);

  useEffect(() => {
    const content = qrItem?.content || "";
    const isStandardRedirect =
      qrItem?.qrType === "individual" &&
      !qrItem?.guardUuid &&
      (content.includes("/go/") || content.includes("/q/"));
    if (!isStandardRedirect || !qrItem?.uuid) { setStandardLink(null); return; }
    getStandardLink(qrItem.uuid).then((link) => {
      setStandardLink(link);
      if (link) setNewDestination(link.rawContent);
    });
  }, [qrItem?.uuid, qrItem?.guardUuid, qrItem?.qrType, qrItem?.content]);

  async function handleUpdateDestination() {
    if (!newDestination.trim()) return;
    const dest = newDestination.trim().startsWith("http")
      ? newDestination.trim()
      : `https://${newDestination.trim()}`;

    setIsValidating(true);
    setDestinationError(null);
    let scanResult;
    try {
      scanResult = await scanUrl(dest);
    } catch {
      scanResult = { valid: true };
    } finally {
      setIsValidating(false);
    }

    if (!scanResult.valid) {
      setDestinationError(scanResult.error ?? "URL failed security check. Please try a different URL.");
      return;
    }

    setConfirmModalMessage(
      `Updating will redirect all future scans to:\n\n${dest}\n\nThis cannot be undone instantly — scanners will see a 24-hour caution notice while trust rebuilds.`
    );
    setPendingConfirmAction(() => async () => {
      if (!user || !qrItem?.guardUuid) return;
      setSavingDestination(true);
      try {
        await updateGuardLinkDestination(qrItem.guardUuid!, dest, user.id);
        const refreshed = await getGuardLink(qrItem.guardUuid!);
        setGuardLink(refreshed);
        setNewDestination(refreshed?.currentDestination || dest);
        setEditingDestination(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Updated!", "Destination changed. Scanners will see a 24-hour caution notice while trust rebuilds.");
      } catch (err: any) {
        Alert.alert("Error", err?.message || "Could not update destination. Try again.");
      } finally {
        setSavingDestination(false);
      }
    });
    setConfirmModalOpen(true);
  }

  async function handleUpdateRawContent(content: string) {
    if (!content.trim() || !user || !qrItem?.uuid) return;
    const dest = content.trim();

    if (dest.startsWith("http://") || dest.startsWith("https://")) {
      setIsValidating(true);
      setDestinationError(null);
      let scanResult: any;
      try {
        scanResult = await scanUrl(dest);
      } catch {
        scanResult = { valid: true };
      } finally {
        setIsValidating(false);
      }
      if (!scanResult.valid) {
        setDestinationError(scanResult.error ?? "URL failed security check. Please try a different link.");
        return;
      }
    }

    setSavingDestination(true);
    setDestinationError(null);
    try {
      await updateStandardLinkRawContent(qrItem.uuid, dest, user.id);
      if ((qrItem as any).docId) {
        await updateDisplayDestination(user.id, (qrItem as any).docId, dest).catch(() => {});
      }
      const refreshed = await getStandardLink(qrItem.uuid);
      setStandardLink(refreshed);
      setNewDestination(refreshed?.rawContent || dest);
      setEditingDestination(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Updated!", "QR content has been saved.");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not save content. Try again.");
    } finally {
      setSavingDestination(false);
    }
  }

  async function handleUpdateStandardDestination() {
    if (!newDestination.trim() || !user || !qrItem?.uuid) return;
    const raw = newDestination.trim();
    const NON_URL_SCHEMES = ["tel:", "upi://", "WIFI:", "BEGIN:", "SMSTO:", "sms:", "mailto:", "bitcoin:", "ethereum:", "litecoin:", "solana:", "geo:", "market:"];
    const isNonUrl = NON_URL_SCHEMES.some((s) => raw.startsWith(s));
    const dest = isNonUrl || raw.startsWith("http") ? raw : `https://${raw}`;

    setIsValidating(true);
    setDestinationError(null);
    let scanResult: any;
    try {
      scanResult = await scanUrl(dest);
    } catch {
      scanResult = { valid: true };
    } finally {
      setIsValidating(false);
    }

    if (!scanResult.valid) {
      setDestinationError(scanResult.error ?? "URL failed security check. Please try a different URL.");
      return;
    }

    setConfirmModalMessage(
      `Updating will redirect all future scans to:\n\n${dest}\n\nThe QR code pattern stays the same — only the destination changes.`
    );
    setPendingConfirmAction(() => async () => {
      if (!user || !qrItem?.uuid) return;
      setSavingDestination(true);
      try {
        await updateStandardLinkRawContent(qrItem.uuid, dest, user.id);
        if (qrItem.docId) {
          await updateDisplayDestination(user.id, qrItem.docId, dest).catch(() => {});
        }
        const refreshed = await getStandardLink(qrItem.uuid);
        setStandardLink(refreshed);
        setNewDestination(refreshed?.rawContent || dest);
        setEditingDestination(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Updated!", "The QR code now redirects to the new destination.");
      } catch (err: any) {
        Alert.alert("Error", err?.message || "Could not update destination. Try again.");
      } finally {
        setSavingDestination(false);
      }
    });
    setConfirmModalOpen(true);
  }

  async function handleRequestSavedContentUpdate() {
    if (!newSavedContent.trim()) return;
    const raw = newSavedContent.trim();
    const looksLikeUrl = raw.startsWith("http") || raw.startsWith("www.") || /^[\w-]+\.\w{2,}/.test(raw);

    if (looksLikeUrl) {
      setIsValidating(true);
      setSavedContentError(null);
      let scanResult;
      try {
        scanResult = await scanUrl(raw);
      } catch {
        scanResult = { valid: true };
      } finally {
        setIsValidating(false);
      }
      if (!scanResult.valid) {
        setSavedContentError(scanResult.error ?? "URL failed security check. Please try a different URL.");
        return;
      }
    }

    setSavedContentError(null);
    setConfirmModalMessage(
      `Updating will change this QR code's content to:\n\n${raw}\n\nNote: Any previously printed copies of this QR code will be outdated and should be reprinted.`
    );
    setPendingConfirmAction(() => async () => {
      if (!user || !qrItem?.docId) return;
      setSavingSavedContent(true);
      try {
        await updateSavedQrContent(user.id, qrItem.docId, raw);
        setQrItem({ ...qrItem, content: raw });
        setNewSavedContent(raw);
        setEditingSavedContent(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Updated!", "QR content updated. Reprint any physical copies.");
      } catch (err: any) {
        Alert.alert("Error", err?.message || "Could not update content. Try again.");
      } finally {
        setSavingSavedContent(false);
      }
    });
    setConfirmModalOpen(true);
  }

  async function handleConfirmPendingAction() {
    setConfirmModalOpen(false);
    if (pendingConfirmAction) {
      await pendingConfirmAction();
      setPendingConfirmAction(null);
    }
  }

  function handleCancelPendingAction() {
    setConfirmModalOpen(false);
    setPendingConfirmAction(null);
  }

  return {
    guardLink, standardLink,
    editingDestination, setEditingDestination,
    newDestination, setNewDestination,
    savingDestination, destinationError, setDestinationError,
    editingSavedContent, setEditingSavedContent,
    newSavedContent, setNewSavedContent,
    savingSavedContent, savedContentError, setSavedContentError,
    isValidating,
    confirmModalOpen, confirmModalMessage,
    handleUpdateDestination, handleUpdateRawContent,
    handleUpdateStandardDestination, handleRequestSavedContentUpdate,
    handleConfirmPendingAction, handleCancelPendingAction,
  };
}
