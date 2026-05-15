import React from "react";
import {
  View, Text, StyleSheet, Pressable, Modal, ScrollView, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import type { Notification } from "@/lib/firestore-service";

interface Props {
  visible: boolean;
  notifications: Notification[];
  markingRead: boolean;
  onClose: () => void;
  onClearAll: () => void;
}

function getNotifIcon(type: string): any {
  if (type === "new_comment") return "chatbubble";
  if (type === "mention") return "at";
  if (type === "new_follow") return "person-add";
  return "warning";
}

function getNotifColor(type: string): string {
  if (type === "new_comment") return Colors.dark.primary;
  if (type === "mention") return Colors.dark.accent;
  if (type === "new_follow") return Colors.dark.safe;
  return Colors.dark.warning;
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const NotificationsModal = React.memo(function NotificationsModal({
  visible, notifications, markingRead, onClose, onClearAll,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.page, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
          </Pressable>
          <Text style={styles.title}>Notifications</Text>
          {notifications.length > 0 ? (
            <Pressable onPress={onClearAll} style={styles.clearBtn}>
              <Text style={styles.clearText}>Clear All</Text>
            </Pressable>
          ) : (
            <View style={{ width: 76 }} />
          )}
        </View>

        {markingRead && (
          <View style={styles.markingRow}>
            <ActivityIndicator size="small" color={Colors.dark.primary} />
            <Text style={styles.markingText}>Marking as read…</Text>
          </View>
        )}

        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {notifications.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="notifications-off-outline" size={40} color={Colors.dark.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySub}>
                Follow QR codes to get notified when there's new activity
              </Text>
            </View>
          ) : (
            notifications.map((notif) => (
              <Pressable
                key={notif.id}
                onPress={() => {
                  onClose();
                  router.push({ pathname: "/qr-detail/[id]", params: { id: notif.qrCodeId } });
                }}
                style={({ pressed }) => [
                  styles.item,
                  !notif.read && styles.itemUnread,
                  { opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <View style={[styles.itemIcon, { backgroundColor: getNotifColor(notif.type) + "22" }]}>
                  <Ionicons name={getNotifIcon(notif.type)} size={18} color={getNotifColor(notif.type)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemText}>{notif.message}</Text>
                  <Text style={styles.itemTime}>{formatRelativeTime(notif.createdAt)}</Text>
                </View>
                {!notif.read && <View style={styles.unreadDot} />}
              </Pressable>
            ))
          )}
          <View style={{ height: insets.bottom + 32 }} />
        </ScrollView>
      </View>
    </Modal>
  );
});

export default NotificationsModal;

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.dark.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.dark.surface, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  clearBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    backgroundColor: Colors.dark.dangerDim,
  },
  clearText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.danger },
  markingRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 8, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder,
  },
  markingText: { fontSize: 12, color: Colors.dark.textMuted, fontFamily: "Inter_400Regular" },
  list: { flex: 1, paddingHorizontal: 16 },
  empty: {
    flex: 1, alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 60,
  },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.dark.surface, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder, marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary },
  emptySub: {
    fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted,
    textAlign: "center", paddingHorizontal: 20,
  },
  item: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder,
  },
  itemUnread: { backgroundColor: Colors.dark.primaryDim + "20" },
  itemIcon: {
    width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center",
  },
  itemText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.text, lineHeight: 20 },
  itemTime: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.dark.primary },
});
