import React from "react";
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { formatCompactNumber } from "@/lib/number-format";
import { formatRelativeTime, smartName } from "@/lib/utils/formatters";
import { useTheme } from "@/contexts/ThemeContext";
import type { CommentItem as CommentItemType } from "@/hooks/useQrDetail";

interface Props {
  comment: CommentItemType;
  isReply?: boolean;
  currentUserLike: "like" | "dislike" | null;
  isMenuOpen: boolean;
  isDeleting: boolean;
  isRevealed: boolean;
  isCommentOwner: boolean;
  canDelete: boolean;
  descendants: CommentItemType[];
  expandedReplies: Record<string, boolean>;
  visibleRepliesCount: Record<string, number>;
  onLike: (id: string, action: "like" | "dislike") => void;
  onReply: (comment: CommentItemType) => void;
  onMenuOpen: (id: string, isOwner: boolean) => void;
  onMenuClose: () => void;
  onDelete: (id: string) => void;
  onReport: (id: string) => void;
  onReveal: (id: string) => void;
  onToggleReplies: (id: string) => void;
  onShowMoreReplies: (id: string) => void;
  allComments: CommentItemType[];
  userLikes: Record<string, "like" | "dislike">;
  commentMenuId: string | null;
  deletingCommentId: string | null;
  revealedComments: Set<string>;
  userId?: string;
}

const REPLIES_PER_PAGE = 10;

const CommentItem = React.memo(function CommentItem({
  comment, isReply = false, currentUserLike, isMenuOpen, isDeleting, isRevealed,
  isCommentOwner, canDelete, descendants, expandedReplies, visibleRepliesCount,
  onLike, onReply, onMenuOpen, onMenuClose, onDelete, onReport, onReveal, onToggleReplies, onShowMoreReplies,
  allComments, userLikes, commentMenuId, deletingCommentId, revealedComments, userId,
}: Props) {
  const { colors } = useTheme();
  const replyCount = descendants.length;
  const isExpanded = expandedReplies[comment.id] ?? false;
  const showCount = visibleRepliesCount[comment.id] || REPLIES_PER_PAGE;
  const visibleReplies = descendants.slice(0, showCount);
  const hasMore = replyCount > showCount;

  if (comment.isHidden && !isRevealed) {
    return (
      <View key={comment.id}>
        <Animated.View entering={FadeIn.duration(300)}>
          <Pressable
            onPress={() => onReveal(comment.id)}
            style={[
              styles.commentItem,
              isReply && styles.replyItem,
              { flexDirection: "row", alignItems: "center", gap: 8,
                backgroundColor: colors.warningDim, borderColor: colors.warning + "40",
                borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1 },
            ]}
          >
            <Ionicons name="eye-outline" size={16} color={colors.warning} />
            <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: colors.warning }}>This comment has been reported as sensitive content</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View key={comment.id}>
      <Animated.View entering={FadeIn.duration(300)}>
        <View style={[
          styles.commentItem,
          isReply
            ? { backgroundColor: colors.surfaceLight, borderColor: "transparent", marginLeft: 0 }
            : { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
        ]}>
          {comment.isHidden && isRevealed ? (
            <View style={[styles.sensitiveRevealedTag, { backgroundColor: colors.warningDim }]}>
              <Ionicons name="warning-outline" size={11} color={colors.warning} />
              <Text style={[styles.sensitiveRevealedTagText, { color: colors.warning }]}>Reported sensitive</Text>
            </View>
          ) : null}

          <View style={styles.commentHeader}>
            <View style={[styles.commentAvatar, isReply && styles.replyAvatar, { backgroundColor: colors.primaryDim }]}>
              {comment.userPhotoURL ? (
                <Image source={{ uri: comment.userPhotoURL }} style={[styles.commentAvatarImg, isReply && { width: 28, height: 28, borderRadius: 14 }]} />
              ) : (
                <Text style={[styles.commentAvatarText, { color: colors.primary }, isReply && { fontSize: 12 }]}>
                  {(comment.userUsername || comment.user.displayName).charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.commentMeta}>
              <Text style={[styles.commentAuthor, { color: colors.text }]} numberOfLines={1}>
                {comment.userUsername ? (
                  <Text style={{ color: colors.primary }}>@{comment.userUsername}</Text>
                ) : smartName(comment.user.displayName)}
                <Text style={{ color: colors.textMuted, fontFamily: "Inter_400Regular" }}>  ·  </Text>
                <Text style={[styles.commentTimeInline, { color: colors.textMuted }]}>{formatRelativeTime(comment.createdAt)}</Text>
              </Text>
            </View>
            <Pressable onPress={() => isMenuOpen ? onMenuClose() : onMenuOpen(comment.id, isCommentOwner)} style={styles.commentMenuBtn}>
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
              )}
            </Pressable>
          </View>

          <Text style={[styles.commentText, { color: colors.text }]}>{comment.text}</Text>

          <View style={styles.commentActions}>
            <Pressable onPress={() => onLike(comment.id, "like")} style={styles.commentActionBtn}>
              <Ionicons
                name={currentUserLike === "like" ? "thumbs-up" : "thumbs-up-outline"}
                size={15}
                color={currentUserLike === "like" ? colors.safe : colors.textMuted}
              />
              {comment.likeCount > 0 ? (
                <Text style={[styles.commentActionCount, { color: currentUserLike === "like" ? colors.safe : colors.textMuted }]}>
                  {formatCompactNumber(comment.likeCount)}
                </Text>
              ) : null}
            </Pressable>
            <Pressable onPress={() => onLike(comment.id, "dislike")} style={styles.commentActionBtn}>
              <Ionicons
                name={currentUserLike === "dislike" ? "thumbs-down" : "thumbs-down-outline"}
                size={15}
                color={currentUserLike === "dislike" ? colors.danger : colors.textMuted}
              />
              {comment.dislikeCount > 0 ? (
                <Text style={[styles.commentActionCount, { color: currentUserLike === "dislike" ? colors.danger : colors.textMuted }]}>
                  {formatCompactNumber(comment.dislikeCount)}
                </Text>
              ) : null}
            </Pressable>
            <Pressable onPress={() => onReply(comment)} style={styles.commentActionBtn}>
              <Ionicons name="return-down-forward-outline" size={15} color={colors.textMuted} />
              <Text style={[styles.commentActionCount, { color: colors.textMuted }]}>Reply</Text>
            </Pressable>
          </View>

          {isMenuOpen ? (
            <View style={[styles.inlineMenu, { backgroundColor: colors.surfaceLight }]}>
              {canDelete ? (
                <Pressable onPress={() => onDelete(comment.id)} style={styles.inlineMenuItem}>
                  <Ionicons name="trash-outline" size={14} color={colors.danger} />
                  <Text style={[styles.inlineMenuText, { color: colors.danger }]}>Delete</Text>
                </Pressable>
              ) : null}
              {!isCommentOwner ? (
                <Pressable onPress={() => onReport(comment.id)} style={styles.inlineMenuItem}>
                  <Ionicons name="flag-outline" size={14} color={colors.warning} />
                  <Text style={[styles.inlineMenuText, { color: colors.warning }]}>Report</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </Animated.View>

      {!isReply && replyCount > 0 ? (
        <View style={styles.repliesToggleRow}>
          <View style={[styles.repliesConnector, { backgroundColor: colors.surfaceBorder }]} />
          <Pressable onPress={() => onToggleReplies(comment.id)} style={styles.repliesToggleBtn}>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={13} color={colors.primary} />
            <Text style={[styles.repliesToggleText, { color: colors.primary }]}>
              {isExpanded ? "Hide replies" : `Show ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {!isReply && isExpanded ? (
        <View style={styles.repliesContainer}>
          {visibleReplies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              isReply={true}
              currentUserLike={userLikes[reply.id] ?? null}
              isMenuOpen={commentMenuId === reply.id}
              isDeleting={deletingCommentId === reply.id}
              isRevealed={revealedComments.has(reply.id)}
              isCommentOwner={userId === reply.userId}
              canDelete={userId === reply.userId}
              descendants={[]}
              expandedReplies={{}}
              visibleRepliesCount={{}}
              onLike={onLike}
              onReply={onReply}
              onMenuOpen={onMenuOpen}
              onMenuClose={onMenuClose}
              onDelete={onDelete}
              onReport={onReport}
              onReveal={onReveal}
              onToggleReplies={onToggleReplies}
              onShowMoreReplies={onShowMoreReplies}
              allComments={allComments}
              userLikes={userLikes}
              commentMenuId={commentMenuId}
              deletingCommentId={deletingCommentId}
              revealedComments={revealedComments}
              userId={userId}
            />
          ))}
          {hasMore ? (
            <Pressable onPress={() => onShowMoreReplies(comment.id)} style={styles.showMoreRepliesBtn}>
              <Text style={[styles.showMoreRepliesText, { color: colors.primary }]}>Show {replyCount - showCount} more replies</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

export default CommentItem;

const styles = StyleSheet.create({
  commentItem: { borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1 },
  replyItem: { borderColor: "transparent", marginLeft: 0 },
  sensitiveRevealedTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
    alignSelf: "flex-start", marginBottom: 8,
  },
  sensitiveRevealedTagText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  commentHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 10 },
  commentAvatar: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  replyAvatar: { width: 28, height: 28, borderRadius: 14 },
  commentAvatarImg: { width: 34, height: 34, borderRadius: 17 },
  commentAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  commentMeta: { flex: 1 },
  commentAuthor: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  commentTimeInline: { fontSize: 12, fontFamily: "Inter_400Regular" },
  commentMenuBtn: { padding: 4 },
  commentText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 10 },
  commentActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  commentActionBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  commentActionCount: { fontSize: 12, fontFamily: "Inter_500Medium" },
  inlineMenu: { flexDirection: "row", gap: 12, marginTop: 10, borderRadius: 10, padding: 10 },
  inlineMenuItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  inlineMenuText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  repliesToggleRow: { flexDirection: "row", alignItems: "center", marginBottom: 4, paddingLeft: 20 },
  repliesConnector: { width: 24, height: 1, marginRight: 8 },
  repliesToggleBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6 },
  repliesToggleText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  repliesContainer: { paddingLeft: 20 },
  showMoreRepliesBtn: { alignItems: "center", paddingVertical: 10 },
  showMoreRepliesText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
