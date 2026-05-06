import { useEffect, useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "@/lib/haptics";
import {
  subscribeToQrMessages,
  sendMessageToQrOwner,
  getScanVelocity,
  submitVerificationRequest,
  getVerificationStatus,
  type QrOwnerInfo,
  type QrMessage,
  type ScanVelocityBucket,
  type VerificationStatus,
} from "@/lib/firestore-service";

export function useQrOwner(
  id: string,
  userId: string | null,
  userDisplayName: string | null,
  isQrOwner: boolean,
  ownerInfo: QrOwnerInfo | null
) {
  const [messagesModalOpen, setMessagesModalOpen] = useState(false);
  const [messages, setMessages] = useState<QrMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [scanVelocity, setScanVelocity] = useState<ScanVelocityBucket[]>([]);
  const [velocityLoading, setVelocityLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({ status: "none" });
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyBizName, setVerifyBizName] = useState("");
  const [verifyDocBase64, setVerifyDocBase64] = useState<string | null>(null);
  const [verifyDocName, setVerifyDocName] = useState<string | null>(null);
  const [verifySubmitting, setVerifySubmitting] = useState(false);

  useEffect(() => {
    if (!isQrOwner || !userId || !ownerInfo) return;
    const unsub = subscribeToQrMessages(userId, id, (msgs) => {
      setMessages(msgs);
      setUnreadMessages(msgs.filter((m) => !m.read).length);
    });
    return unsub;
  }, [isQrOwner, userId, id, ownerInfo]);

  useEffect(() => {
    if (!isQrOwner || !userId) return;
    setVelocityLoading(true);
    getScanVelocity(id)
      .then((v) => setScanVelocity(v))
      .finally(() => setVelocityLoading(false));
    getVerificationStatus(userId, id).then(setVerificationStatus);
  }, [isQrOwner, userId, id]);

  async function handleSendMessage() {
    if (!userId || !ownerInfo || !messageText.trim()) return;
    if (userId === ownerInfo.ownerId) {
      Alert.alert("Notice", "You can't message yourself as the owner.");
      return;
    }
    setSendingMessage(true);
    try {
      await sendMessageToQrOwner(
        userId, userDisplayName || "User", ownerInfo.ownerId, id,
        ownerInfo.brandedUuid ?? "", messageText.trim()
      );
      setMessageText("");
      Alert.alert("Sent!", "Your message was delivered to the QR code owner.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not send message.");
    } finally {
      setSendingMessage(false);
    }
  }

  async function handlePickVerifyDoc() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], quality: 0.7, base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setVerifyDocBase64(asset.base64 || null);
    const parts = asset.uri.split("/");
    setVerifyDocName(parts[parts.length - 1]);
  }

  async function handleVerifySubmit() {
    if (!userId || !verifyBizName.trim() || !verifyDocBase64) return;
    setVerifySubmitting(true);
    try {
      await submitVerificationRequest(userId, id, verifyBizName.trim(), verifyDocBase64);
      setVerificationStatus({ status: "pending", businessName: verifyBizName.trim() });
      setVerifyModalOpen(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Request Submitted",
        "Your verification request has been submitted for review. We'll update your badge status within 1-3 business days."
      );
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not submit verification request.");
    } finally {
      setVerifySubmitting(false);
    }
  }

  return {
    messagesModalOpen, setMessagesModalOpen,
    messages,
    messageText, setMessageText,
    sendingMessage,
    unreadMessages,
    scanVelocity,
    velocityLoading,
    verificationStatus, setVerificationStatus,
    verifyModalOpen, setVerifyModalOpen,
    verifyBizName, setVerifyBizName,
    verifyDocBase64,
    verifyDocName,
    verifySubmitting,
    handleSendMessage,
    handlePickVerifyDoc,
    handleVerifySubmit,
  };
}
