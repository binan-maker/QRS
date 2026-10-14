import React, { memo, useState, type ReactNode } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { formatCompactNumber, formatRelativeTime } from "@/shared/utils/formatters";
import { useTheme } from "@/shared/contexts/ThemeContext";
import type { CommentItem as CommentItemType } from "@/features/qr-detail/types";
import { REPLIES_PER_PAGE, READ_MORE_THRESHOLD, getInitialColor } from "@/shared/utils/qr-detail-rules";

interface Props {
  comment: CommentItemType;
  isReply?: boolean;
  currentUserLike: "like" | "dislike" | null;
  isMenuOpen: boolean;
  isDeleting: boolean;
  isCommentOwner: boolean;
  descendants: CommentItemType[];
  expandedReplies: Record<string, boolean>;
  visibleRepliesCount: Record<string, number>;
  onLike: (id: string, action: "like" | "dislike") => void;
  onReply: (comment: CommentItemType) => void;
  onMenuOpen: (id: string, isOwner: boolean) => void;
  onMenuClose: () => void;
  onToggleReplies: (id: string) => void;
  onShowMoreReplies: (id: string) => void;
  userLikes: Record<string, "like" | "dislike">;
  commentMenuId: string | null;
  deletingCommentId: string | null;
  userId?: string;
}

function CommentAvatar({ size, photoURL, initial, gradient }: {
  size: number;
  photoURL?: string | null;
  initial: string;
  gradient: [string, string];
}) {
  if (photoURL) {
    return (
      <Image
        source={{ uri: photoURL }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        cachePolicy="memory-disk"
        contentFit="cover"
        transition={150}
      />
    );
  }
  return (
    <LinearGradient
      colors={gradient}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Text style={{ fontFamily: "Inter_700Bold", color: "#fff", fontSize: size < 32 ? 11 : 13 }}>
        {initial}
      </Text>
    </LinearGradient>
  );
}

function ActionPill({
  icon, count, active, activeColor, onPress, surfaceBg,
}: {
  icon: string; count: number; active: boolean; activeColor: string; onPress: () => void; surfaceBg: string;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <View style={[styles.actionPill, { backgroundColor: surfaceBg }]}>
        <Ionicons name={icon as any} size={13} color={active ? activeColor : "#94A3B8"} />
        {count > 0 && (
          <Text style={[styles.actionCount, { color: active ? activeColor : "#94A3B8" }]}>
            {formatCompactNumber(count)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const AVATAR_CENTER = 17;
const ELBOW_H_WIDTH = 16;

const CommentItem = memo(function CommentItem({
  comment, isReply = false, currentUserLike, isMenuOpen, isDeleting,
  isCommentOwner, descendants, expandedReplies, visibleRepliesCount,
  onLike, onReply, onMenuOpen, onMenuClose,
  onToggleReplies, onShowMoreReplies,
  userLikes, commentMenuId, deletingCommentId, userId,
}: Props) {
  const { colors, isDark } = useTheme();
  const [textExpanded, setTextExpanded] = useState(false);

  const replyCount = descendants.length;
  const isExpanded = expandedReplies[comment.id] ?? false;
  const showCount = visibleRepliesCount[comment.id] || REPLIES_PER_PAGE;
  const visibleReplies = descendants.slice(0, showCount);
  const hasMore = replyCount > showCount;

  const displayName = comment.userUsername
    ? `@${comment.userUsername}`
    : comment.userId ? `@user_${comment.userId.slice(-5)}` : "@user";
  const avatarInitial = comment.userUsername ? comment.userUsername.charAt(0).toUpperCase() : "U";
  const avatarGradient = getInitialColor(displayName);
  const avatarSize = isReply ? 28 : 34;
  const surfaceBg = isDark ? colors.surfaceLight : colors.background;
  const threadColor = isDark ? "rgba(148,163,184,0.25)" : "rgba(148,163,184,0.35)";

  const isLong = comment.text.length > READ_MORE_THRESHOLD;
  const displayText = isLong && !textExpanded ? comment.text.slice(0, READ_MORE_THRESHOLD) : comment.text;

  const renderBody = () => (
    <View style={styles.commentBody}>
      <View style={styles.commentHeader}>
        <View style={styles.authorPressable}>
          <Text style={[styles.authorName, { color: colors.text }]} numberOfLines={1}>{displayName}</Text>
        </View>
        <Text style={[styles.commentTime, { color: colors.textMuted }]} numberOfLines={1}>
          {formatRelativeTime(comment.createdAt)}
        </Text>
        <Pressable
          onPress={() => (isMenuOpen ? onMenuClose() : onMenuOpen(comment.id, isCommentOwner))}
          style={[styles.menuBtn, { marginLeft: "auto" as any }]}
          hitSlop={8}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <Ionicons name="ellipsis-horizontal" size={16} color={colors.textMuted} />
          )}
        </Pressable>
      </View>

      <Text style={[styles.commentText, { color: colors.text }]}>
        {displayText.startsWith("@") && displayText.includes(" ") ? (
          <>
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
              {displayText.slice(0, displayText.indexOf(" "))}
            </Text>
            {displayText.slice(displayText.indexOf(" "))}
          </>
        ) : displayText}
        {isLong && !textExpanded && (
          <Text style={[styles.readMoreText, { color: colors.primary }]} onPress={() => setTextExpanded(true)}>
            {" "}... Read more
          </Text>
        )}
      </Text>
      {isLong && textExpanded && (
        <Text style={[styles.readMoreText, { color: colors.primary, marginTop: 3 }]} onPress={() => setTextExpanded(false)}>
          Show less
        </Text>
      )}

      <View style={styles.actionRow}>
        <ActionPill
          icon={currentUserLike === "like" ? "thumbs-up" : "thumbs-up-outline"}
          count={comment.likeCount}
          active={currentUserLike === "like"}
          activeColor={colors.primary}
          onPress={() => onLike(comment.id, "like")}
          surfaceBg={surfaceBg}
        />
        <ActionPill
          icon={currentUserLike === "dislike" ? "thumbs-down" : "thumbs-down-outline"}
          count={comment.dislikeCount}
          active={currentUserLike === "dislike"}
          activeColor={colors.danger}
          onPress={() => onLike(comment.id, "dislike")}
          surfaceBg={surfaceBg}
        />
        <Pressable onPress={() => onReply(comment)} hitSlop={6}>
          <View style={[styles.actionPill, { backgroundColor: surfaceBg }]}>
            <Ionicons name="return-down-forward-outline" size={13} color={colors.textMuted} />
            <Text style={[styles.actionCount, { color: colors.textMuted }]}>Reply</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );

  if (!isReply) {
    return (
      <View>
        <View style={styles.commentRow}>
          <View style={styles.avatarColumn}>
            <CommentAvatar size={avatarSize} photoURL={comment.userPhotoURL} initial={avatarInitial} gradient={avatarGradient} />
            {replyCount > 0 && isExpanded && <View style={[styles.threadStem, { backgroundColor: threadColor }]} />}
          </View>
          {renderBody()}
        </View>

        {replyCount > 0 && (
          <Pressable onPress={() => onToggleReplies(comment.id)} style={styles.repliesToggle}>
            <View style={[styles.toggleConnector, { backgroundColor: threadColor }]} />
            <View style={[styles.repliesToggleInner, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" }]}>
              <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={11} color={colors.primary} />
              <Text style={[styles.repliesToggleText, { color: colors.primary }]}>
                {isExpanded ? "Hide replies" : `${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
              </Text>
            </View>
          </Pressable>
        )}

        {isExpanded && (
          <View style={styles.repliesWrapper}>
            {visibleReplies.map((reply, idx) => {
              const isLast = idx === visibleReplies.length - 1 && !hasMore;
              return (
                <View key={reply.id} style={styles.replyThreadRow}>
                  <View style={styles.replyConnectorCol}>
                    {!isLast && <View style={[styles.replyVertLine, { backgroundColor: threadColor }]} />}
                    <View style={styles.replyElbow}>
                      <View style={[styles.elbowV, { backgroundColor: threadColor }]} />
                      <View style={[styles.elbowH, { backgroundColor: threadColor }]} />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <CommentItem
                      comment={reply}
                      isReply={true}
                      currentUserLike={userLikes[reply.id] ?? null}
                      isMenuOpen={commentMenuId === reply.id}
                      isDeleting={deletingCommentId === reply.id}
                      isCommentOwner={userId === reply.userId}
                      descendants={[]}
                      expandedReplies={{}}
                      visibleRepliesCount={{}}
                      onLike={onLike}
                      onReply={onReply}
                      onMenuOpen={onMenuOpen}
                      onMenuClose={onMenuClose}
                      onToggleReplies={onToggleReplies}
                      onShowMoreReplies={onShowMoreReplies}
                      userLikes={userLikes}
                      commentMenuId={commentMenuId}
                      deletingCommentId={deletingCommentId}
                      userId={userId}
                    />
                  </View>
                </View>
              );
            })}

            {hasMore && (
              <Pressable onPress={() => onShowMoreReplies(comment.id)} style={styles.showMoreBtn}>
                <Ionicons name="arrow-down-circle-outline" size={14} color={colors.primary} />
                <Text style={[styles.showMoreText, { color: colors.primary }]}>
                  Show {replyCount - showCount} more {replyCount - showCount === 1 ? "reply" : "replies"}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.replyCommentRow}>
      <View style={{ flexShrink: 0, marginTop: 2 }}>
        <CommentAvatar size={avatarSize} photoURL={comment.userPhotoURL} initial={avatarInitial} gradient={avatarGradient} />
      </View>
      {renderBody()}
    </View>
  );
});

export default CommentItem;

const styles = StyleSheet.create({
  commentRow: { flexDirection: "row", gap: 10, paddingTop: 12, paddingBottom: 6, paddingHorizontal: 2 },
  avatarColumn: { flexShrink: 0, alignItems: "center", width: 34 },
  threadStem: { width: 2, flex: 1, borderRadius: 1, marginTop: 4, minHeight: 8 },
  replyCommentRow: { flexDirection: "row", gap: 8, paddingTop: 8, paddingBottom: 6 },
  commentBody: { flex: 1, gap: 4 },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  authorPressable: { flex: 1, minWidth: 0 },
  authorName: { fontSize: 12, fontFamily: "Inter_700Bold" },
  commentTime: { fontSize: 11, fontFamily: "Inter_400Regular", flexShrink: 0 },
  readMoreText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  menuBtn: { padding: 2 },
  commentText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  actionPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 100 },
  actionCount: { fontSize: 12, fontFamily: "Inter_500Medium" },
  repliesToggle: { flexDirection: "row", alignItems: "center", paddingLeft: AVATAR_CENTER - 1, paddingVertical: 4, paddingBottom: 6 },
  toggleConnector: { width: ELBOW_H_WIDTH + 2, height: 2, borderRadius: 1, marginRight: 6 },
  repliesToggleInner: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100, borderWidth: 1 },
  repliesToggleText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  repliesWrapper: { paddingLeft: AVATAR_CENTER - 1, paddingBottom: 4 },
  replyThreadRow: { flexDirection: "row" },
  replyConnectorCol: { width: ELBOW_H_WIDTH + 2, alignItems: "flex-start", position: "relative" },
  replyVertLine: { position: "absolute", left: 0, top: 0, bottom: 0, width: 2, borderRadius: 1 },
  replyElbow: { flexDirection: "row", alignItems: "flex-end", marginTop: 20, height: 2, width: "100%" },
  elbowV: { width: 2, height: 14, position: "absolute", left: 0, bottom: 0, borderRadius: 1 },
  elbowH: { flex: 1, height: 2, marginLeft: 2, borderRadius: 1 },
  showMoreBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingLeft: ELBOW_H_WIDTH + 4 },
  showMoreText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
