import React from "react";
import {
  View, Text, StyleSheet, Pressable, Modal, ScrollView, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
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
  if (type === "owner_comment") return "chatbubble-ellipses";
  if (type === "comment_reply") return "return-down-forward";
  if (type === "mention") return "at";
  if (type === "new_follow") return "person-add";
  return "warning";
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
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  function getNotifColor(type: string): string {
    if (type === "new_comment") return colors.primary;
    if (type === "owner_comment") return colors.primary;
    if (type === "comment_reply") return colors.accent;
    if (type === "mention") return colors.accent;
    if (type === "new_follow") return colors.safe;
    return colors.warning;
  }

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.page, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.surfaceBorder }]}>
          <Pressable onPress={onClose} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
          {notifications.length > 0 ? (
            <Pressable onPress={onClearAll} style={[styles.clearBtn, { backgroundColor: colors.dangerDim }]}>
              <Text style={[styles.clearText, { color: colors.danger }]}>Clear All</Text>
            </Pressable>
          ) : (
            <View style={{ width: 76 }} />
          )}
        </View>

        {markingRead && (
          <View style={[styles.markingRow, { borderBottomColor: colors.surfaceBorder }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.markingText, { color: colors.textMuted }]}>Marking as read…</Text>
          </View>
        )}

        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {notifications.length === 0 ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <Ionicons name="notifications-off-outline" size={40} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>All caught up!</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
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
                  { borderBottomColor: colors.surfaceBorder },
                  !notif.read && { backgroundColor: colors.primaryDim + "20" },
                  { opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <View style={[styles.itemIcon, { backgroundColor: getNotifColor(notif.type) + "22" }]}>
                  <Ionicons name={getNotifIcon(notif.type)} size={18} color={getNotifColor(notif.type)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemText, { color: colors.text }]}>{notif.message}</Text>
                  <Text style={[styles.itemTime, { color: colors.textMuted }]}>{formatRelativeTime(notif.createdAt)}</Text>
                </View>
                {!notif.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
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
  page: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  clearText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  markingRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1,
  },
  markingText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  list: { flex: 1, paddingHorizontal: 16 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 60 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center", borderWidth: 1, marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 20 },
  item: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, borderBottomWidth: 1,
  },
  itemIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  itemText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  itemTime: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
});
