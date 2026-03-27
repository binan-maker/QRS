import React from "react";
import {
  View, Text, StyleSheet, Pressable, Modal, ScrollView,
  ActivityIndicator, TextInput, Platform, KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import type { QrOwnerInfo, QrMessage } from "@/lib/firestore-service";

interface Props {
  visible: boolean;
  isQrOwner: boolean;
  ownerInfo: QrOwnerInfo | null;
  messages: QrMessage[];
  messageText: string;
  sendingMessage: boolean;
  user: { id: string } | null;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onMarkRead: (msgId: string) => void;
  onClose: () => void;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const MessagesModal = React.memo(function MessagesModal({
  visible, isQrOwner, ownerInfo, messages, messageText,
  sendingMessage, user, onChangeText, onSend, onMarkRead, onClose,
}: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={[styles.sheet, { maxHeight: "80%" }]} onPress={() => {}}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.title}>{isQrOwner ? "Inbox" : "Message Owner"}</Text>
              <Text style={styles.sub}>
                {isQrOwner
                  ? "Private messages sent to this QR code"
                  : ownerInfo
                  ? `Send a private message to ${ownerInfo.ownerName}`
                  : "Private messaging — branded QRs only"}
              </Text>
            </View>

            {isQrOwner ? (
              messages.length === 0 ? (
                <View style={styles.center}>
                  <Ionicons name="mail-outline" size={40} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>No messages yet</Text>
                  <Text style={styles.emptySub}>Messages from people scanning this QR will appear here</Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 350 }}>
                  {messages.map((msg) => (
                    <Pressable
                      key={msg.id}
                      onPress={() => onMarkRead(msg.id)}
                      style={[styles.msgRow, !msg.read && styles.msgRowUnread]}
                    >
                      <View style={styles.msgAvatar}>
                        <Text style={styles.msgAvatarText}>{msg.fromDisplayName.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={styles.msgSender}>{msg.fromDisplayName}</Text>
                          {!msg.read && <View style={styles.unreadDot} />}
                        </View>
                        <Text style={styles.msgText} numberOfLines={2}>{msg.message}</Text>
                        <Text style={styles.msgTime}>{formatRelative(msg.createdAt)}</Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              )
            ) : ownerInfo ? (
              <View style={styles.composeArea}>
                <Text style={styles.privacyNote}>
                  Your message will be sent privately to {ownerInfo.ownerName}. They will see your name.
                </Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="Write your message..."
                    placeholderTextColor={colors.textMuted}
                    value={messageText}
                    onChangeText={onChangeText}
                    multiline
                    maxLength={500}
                  />
                </View>
                <Pressable
                  onPress={onSend}
                  disabled={sendingMessage || !messageText.trim() || !user}
                  style={({ pressed }) => [styles.sendBtn, { opacity: sendingMessage || !messageText.trim() || !user || pressed ? 0.6 : 1 }]}
                >
                  {sendingMessage ? (
                    <ActivityIndicator size="small" color={colors.primaryText} />
                  ) : (
                    <>
                      <Ionicons name="send" size={18} color={colors.primaryText} />
                      <Text style={styles.sendBtnText}>Send Message</Text>
                    </>
                  )}
                </Pressable>
                {!user && (
                  <Pressable onPress={() => { onClose(); router.push("/(auth)/login"); }} style={styles.signInBtn}>
                    <Text style={styles.signInBtnText}>Sign in to send a message</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <View style={styles.center}>
                <Ionicons name="lock-closed-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { textAlign: "center" }]}>
                  Private messaging is only available for branded QR codes
                </Text>
              </View>
            )}

            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
});

export default MessagesModal;

function makeStyles(c: ReturnType<typeof import("@/contexts/ThemeContext").useTheme>["colors"]) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "transparent", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 20, paddingBottom: 32, borderWidth: 1, borderColor: c.surfaceBorder,
    },
    handle: { width: 40, height: 4, backgroundColor: c.surfaceLight, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
    header: { marginBottom: 16 },
    title: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.text },
    sub: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary, marginTop: 3 },
    center: { padding: 40, alignItems: "center", gap: 10 },
    emptyTitle: { color: c.textMuted, fontFamily: "Inter_500Medium", fontSize: 15 },
    emptySub: { color: c.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" },
    msgRow: {
      flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: c.surfaceBorder,
    },
    msgRowUnread: { backgroundColor: c.primaryDim + "33", borderRadius: 10 },
    msgAvatar: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: c.primaryDim, alignItems: "center", justifyContent: "center",
    },
    msgAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold", color: c.primary },
    msgSender: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.text },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary },
    msgText: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary, marginTop: 3, lineHeight: 18 },
    msgTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: c.textMuted, marginTop: 3 },
    composeArea: { gap: 12, paddingBottom: 8 },
    privacyNote: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary, lineHeight: 19 },
    inputRow: {
      backgroundColor: c.surfaceLight, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
      borderWidth: 1, borderColor: c.surfaceBorder,
    },
    input: { fontSize: 15, fontFamily: "Inter_400Regular", color: c.text, minHeight: 80 },
    sendBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      backgroundColor: c.primary, borderRadius: 14, paddingVertical: 14,
    },
    sendBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: c.primaryText },
    signInBtn: { alignItems: "center", paddingVertical: 10 },
    signInBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.primary },
    closeBtn: {
      marginTop: 16, backgroundColor: c.surfaceLight, borderRadius: 14,
      paddingVertical: 14, alignItems: "center",
    },
    closeBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.textSecondary },
  });
}
