import { useEffect, useState, useCallback } from "react";
import { Alert } from "react-native";
import * as Haptics from "@/shared/utils/haptics";
import {
  subscribeToQrMessages,
  sendMessageToQrOwner,
  getScanVelocity,
  type QrOwnerInfo,
  type QrMessage,
  type ScanVelocityBucket,
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
  }, [isQrOwner, userId, id]);

  const handleSendMessage = useCallback(async () => {
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
  }, [userId, ownerInfo, messageText, userDisplayName, id]);

  return {
    messagesModalOpen, setMessagesModalOpen,
    messages,
    messageText, setMessageText,
    sendingMessage,
    unreadMessages,
    scanVelocity,
    velocityLoading,
    handleSendMessage,
  };
}
