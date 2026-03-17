import React from "react";
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { formatCompactNumber } from "@/lib/number-format";
import { formatRelativeTime, smartName } from "@/lib/utils/formatters";
import Colors from "@/constants/colors";
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
  const replyCount = descendants.length;
  const isExpanded = expandedReplies[comment.id] ?? false;
  const showCount = visibleRepliesCount[comment.id] || REPLIES_PER_PAGE;
  const visibleReplies = descendants.slice(0, showCount);
  const hasMore = replyCount > showCount;

  if (comment.isHidden && !isRevealed) {
    return (
      <View key={comment.id}>
        <Animated.View entering={FadeIn.duration(300)}>
          <Pressable onPress={() => onReveal(comment.id)} style={[styles.commentItem, isReply && styles.replyItem, styles.sensitiveCommentBanner]}>
            <Ionicons name="eye-outline" size={16} color={Colors.dark.warning} />
            <Text style={styles.sensitiveCommentText}>This comment has been reported as sensitive content</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.dark.textMuted} />
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View key={comment.id}>
      <Animated.View entering={FadeIn.duration(300)}>
        <View style={[styles.commentItem, isReply && styles.replyItem]}>
          {comment.isHidden && isRevealed ? (
            <View style={styles.sensitiveRevealedTag}>
              <Ionicons name="warning-outline" size={11} color={Colors.dark.warning} />
              <Text style={styles.sensitiveRevealedTagText}>Reported sensitive</Text>
            </View>
          ) : null}

          <View style={styles.commentHeader}>
            <View style={[styles.commentAvatar, isReply && styles.replyAvatar]}>
              {comment.userPhotoURL ? (
                <Image source={{ uri: comment.userPhotoURL }} style={[styles.commentAvatarImg, isReply && { width: 28, height: 28, borderRadius: 14 }]} />
              ) : (
                <Text style={[styles.commentAvatarText, isReply && { fontSize: 12 }]}>
                  {(comment.userUsername || comment.user.displayName).charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.commentMeta}>
              <Text style={styles.commentAuthor} numberOfLines={1}>
                {comment.userUsername ? (
                  <Text style={styles.commentUsernameText}>@{comment.userUsername}</Text>
                ) : smartName(comment.user.displayName)}
                <Text style={styles.commentTimeDot}>  ·  </Text>
                <Text style={styles.commentTimeInline}>{formatRelativeTime(comment.createdAt)}</Text>
              </Text>
            </View>
            <Pressable onPress={() => isMenuOpen ? onMenuClose() : onMenuOpen(comment.id, isCommentOwner)} style={styles.commentMenuBtn}>
              {isDeleting ? (
                <ActivityIndicator size="small" color={Colors.dark.danger} />
              ) : (
                <Ionicons name="ellipsis-horizontal" size={18} color={Colors.dark.textMuted} />
              )}
            </Pressable>
          </View>

          <Text style={styles.commentText}>{comment.text}</Text>

          <View style={styles.commentActions}>
            <Pressable onPress={() => onLike(comment.id, "like")} style={styles.commentActionBtn}>
              <Ionicons
                name={currentUserLike === "like" ? "thumbs-up" : "thumbs-up-outline"}
                size={15}
                color={currentUserLike === "like" ? Colors.dark.safe : Colors.dark.textMuted}
              />
              {comment.likeCount > 0 ? (
                <Text style={[styles.commentActionCount, currentUserLike === "like" && { color: Colors.dark.safe }]}>
                  {formatCompactNumber(comment.likeCount)}
                </Text>
              ) : null}
            </Pressable>
            <Pressable onPress={() => onLike(comment.id, "dislike")} style={styles.commentActionBtn}>
              <Ionicons
                name={currentUserLike === "dislike" ? "thumbs-down" : "thumbs-down-outline"}
                size={15}
                color={currentUserLike === "dislike" ? Colors.dark.danger : Colors.dark.textMuted}
              />
              {comment.dislikeCount > 0 ? (
                <Text style={[styles.commentActionCount, currentUserLike === "dislike" && { color: Colors.dark.danger }]}>
                  {formatCompactNumber(comment.dislikeCount)}
                </Text>
              ) : null}
            </Pressable>
            <Pressable onPress={() => onReply(comment)} style={styles.commentActionBtn}>
              <Ionicons name="return-down-forward-outline" size={15} color={Colors.dark.textMuted} />
              <Text style={styles.commentActionCount}>Reply</Text>
            </Pressable>
          </View>

          {isMenuOpen ? (
            <View style={styles.inlineMenu}>
              {canDelete ? (
                <Pressable onPress={() => onDelete(comment.id)} style={styles.inlineMenuItem}>
                  <Ionicons name="trash-outline" size={14} color={Colors.dark.danger} />
                  <Text style={[styles.inlineMenuText, { color: Colors.dark.danger }]}>Delete</Text>
                </Pressable>
              ) : null}
              {!isCommentOwner ? (
                <Pressable onPress={() => onReport(comment.id)} style={styles.inlineMenuItem}>
                  <Ionicons name="flag-outline" size={14} color={Colors.dark.warning} />
                  <Text style={[styles.inlineMenuText, { color: Colors.dark.warning }]}>Report</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </Animated.View>

      {!isReply && replyCount > 0 ? (
        <View style={styles.repliesToggleRow}>
          <View style={styles.repliesConnector} />
          <Pressable onPress={() => onToggleReplies(comment.id)} style={styles.repliesToggleBtn}>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={13} color={Colors.dark.primary} />
            <Text style={styles.repliesToggleText}>
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
              <Text style={styles.showMoreRepliesText}>Show {replyCount - showCount} more replies</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

export default CommentItem;

const styles = StyleSheet.create({
  commentItem: {
    backgroundColor: Colors.dark.surface, borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  replyItem: { backgroundColor: Colors.dark.surfaceLight, borderColor: "transparent", marginLeft: 0 },
  sensitiveCommentBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dark.warningDim, borderColor: Colors.dark.warning + "40",
  },
  sensitiveCommentText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.warning },
  sensitiveRevealedTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.dark.warningDim, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
    alignSelf: "flex-start", marginBottom: 8,
  },
  sensitiveRevealedTagText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.dark.warning },
  commentHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 10 },
  commentAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.dark.primaryDim, alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  replyAvatar: { width: 28, height: 28, borderRadius: 14 },
  commentAvatarImg: { width: 34, height: 34, borderRadius: 17 },
  commentAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.dark.primary },
  commentMeta: { flex: 1 },
  commentAuthor: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.text },
  commentUsernameText: { color: Colors.dark.primary },
  commentTimeDot: { color: Colors.dark.textMuted, fontFamily: "Inter_400Regular" },
  commentTimeInline: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },
  commentMenuBtn: { padding: 4 },
  commentText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.text, lineHeight: 20, marginBottom: 10 },
  commentActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  commentActionBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  commentActionCount: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted },
  inlineMenu: {
    flexDirection: "row", gap: 12, marginTop: 10,
    backgroundColor: Colors.dark.surfaceLight, borderRadius: 10, padding: 10,
  },
  inlineMenuItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  inlineMenuText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  repliesToggleRow: { flexDirection: "row", alignItems: "center", marginBottom: 4, paddingLeft: 20 },
  repliesConnector: { width: 24, height: 1, backgroundColor: Colors.dark.surfaceBorder, marginRight: 8 },
  repliesToggleBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6 },
  repliesToggleText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },
  repliesContainer: { paddingLeft: 20 },
  showMoreRepliesBtn: { alignItems: "center", paddingVertical: 10 },
  showMoreRepliesText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },
});
