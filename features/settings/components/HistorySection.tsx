import { View, Text, FlatList, Pressable, Platform, ActionSheetIOS, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { settingsStyles as styles } from "@/features/settings/styles";
import SkeletonBox from "@/components/ui/SkeletonBox";

function SkeletonListRow() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder }}>
      <SkeletonBox width={40} height={40} borderRadius={12} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBox width="70%" height={12} />
        <SkeletonBox width="40%" height={10} />
      </View>
    </View>
  );
}

function getContentIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "url":       return "link";
    case "phone":     return "call";
    case "email":     return "mail";
    case "wifi":      return "wifi";
    case "location":  return "location";
    case "payment":   return "card";
    case "sms":       return "chatbubble";
    case "contact":   return "person";
    case "event":     return "calendar";
    case "otp":       return "lock-closed";
    case "app":       return "apps";
    case "social":    return "people";
    case "media":     return "play-circle";
    case "document":  return "document";
    case "boarding":  return "airplane";
    case "product":   return "barcode";
    default:          return "document-text";
  }
}

function formatDate(d: string): string {
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

interface Props {
  loading: boolean;
  history: any[];
  onDelete: (item: any) => void;
  onDeleteAll: () => void;
}

function HistoryRow({ item, onDelete }: { item: any; onDelete: (item: any) => void }) {
  function handleThreeDot() {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "Delete"], destructiveButtonIndex: 1, cancelButtonIndex: 0 },
        (idx) => { if (idx === 1) onDelete(item); }
      );
    } else {
      Alert.alert("Delete Scan", "Remove this scan from your history?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => onDelete(item) },
      ]);
    }
  }

  const sourceBadgeColor =
    item.source === "favorite" ? Colors.dark.dangerDim
    : item.source === "cloud" ? Colors.dark.accentDim
    : Colors.dark.surfaceLight;
  const sourceBadgeText =
    item.source === "favorite" ? "Favorite"
    : item.source === "cloud" ? "Synced"
    : "Local";
  const sourceBadgeIconColor =
    item.source === "favorite" ? Colors.dark.danger
    : item.source === "cloud" ? Colors.dark.accent
    : Colors.dark.textMuted;

  return (
    <View style={{
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: Colors.dark.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.dark.surfaceBorder,
      padding: 14,
      marginBottom: 8,
    }}>
      <View style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.dark.primaryDim,
        alignItems: "center",
        justifyContent: "center",
      }}>
        <Ionicons name={getContentIcon(item.contentType)} size={18} color={Colors.dark.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.dark.text }}
          numberOfLines={1}
        >
          {item.content}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted }}>
            {formatDate(item.scannedAt)}
          </Text>
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: sourceBadgeColor,
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 8,
          }}>
            <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: sourceBadgeIconColor }}>
              {sourceBadgeText}
            </Text>
          </View>
        </View>
      </View>
      <Pressable
        onPress={handleThreeDot}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <Ionicons name="ellipsis-vertical" size={20} color={Colors.dark.textMuted} />
      </Pressable>
    </View>
  );
}

export default function HistorySection({ loading, history, onDelete, onDeleteAll }: Props) {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <SkeletonListRow />
        <SkeletonListRow />
        <SkeletonListRow />
        <SkeletonListRow />
      </View>
    );
  }

  if (history.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 }}>
        <Ionicons name="time-outline" size={48} color={Colors.dark.textMuted} />
        <Text style={{ fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary }}>
          No history yet
        </Text>
        <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, textAlign: "center" }}>
          Scanned QR codes will appear here
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={history}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <Pressable
          onPress={onDeleteAll}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingVertical: 10,
            paddingHorizontal: 4,
            marginBottom: 8,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="trash" size={16} color={Colors.dark.danger} />
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.danger }}>
            Delete All History
          </Text>
        </Pressable>
      }
      renderItem={({ item }) => <HistoryRow item={item} onDelete={onDelete} />}
    />
  );
}
