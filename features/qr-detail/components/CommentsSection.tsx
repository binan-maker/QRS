import React, { useCallback, type RefObject } from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { makeStyles } from "@/features/qr-detail/styles";
import { SectionHeader } from "@/shared/components/ui/SectionHeader";
import CommentItem from "@/features/qr-detail/components/CommentItem";
import { formatCompactNumber } from "@/shared/utils/number-format";
import { smartName } from "@/shared/utils/formatters";

interface ReplyTo {
  id: string;
  author: string;
  rootId: string;
  isNested: boolean;
}

interface CommentData {
  id: string;
  userId: string;
  parentId?: string | null;
  user: { displayName: string };
  userUsername?: string;
  [key: string]: any;
}

interface Props {
  user: { id: string; displayName?: string } | null;
  totalComments: number;
  commentsList: CommentData[];
  topLevelComments: CommentData[];
  hasMoreComments: boolean;
  commentsLoading: boolean;
  newComment: string;
  setNewComment: (v: string) => void;
  replyTo: ReplyTo | null;
  setReplyTo: (r: ReplyTo | null) => void;
  commentMenuId: string | null;
  setCommentMenuId: (id: string | null) => void;
  setCommentMenuOwner: (v: boolean) => void;
  submitting: boolean;
  commentInputRef: RefObject<TextInput>;
  userLikes: Record<string, string | null>;
  deletingCommentId: string | null;
  revealedComments: Set<string>;
  setRevealedComments: (fn: (prev: Set<string>) => Set<string>) => void;
  expandedReplies: Set<string>;
  visibleRepliesCount: Record<string, number>;
  handleSubmitComment: () => void;
  handleCommentLike: (id: string, currentLike: string | null) => void;
  handleDeleteComment: (id: string) => void;
  setCommentReportModal: (id: string) => void;
  getAllDescendants: (id: string) => CommentData[];
  getRootCommentId: (id: string) => string;
  toggleReplies: (id: string) => void;
  showMoreReplies: (id: string) => void;
  loadMoreComments: () => void;
}

export default function CommentsSection({
  user,
  totalComments,
  commentsList,
  topLevelComments,
  hasMoreComments,
  commentsLoading,
  newComment,
  setNewComment,
  replyTo,
  setReplyTo,
  commentMenuId,
  setCommentMenuId,
  setCommentMenuOwner,
  submitting,
  commentInputRef,
  userLikes,
  deletingCommentId,
  revealedComments,
  setRevealedComments,
  expandedReplies,
  visibleRepliesCount,
  handleSubmitComment,
  handleCommentLike,
  handleDeleteComment,
  setCommentReportModal,
  getAllDescendants,
  getRootCommentId,
  toggleReplies,
  showMoreReplies,
  loadMoreComments,
}: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const onLike = useCallback(
    (id: string, action: "like" | "dislike") => {
      if (!user) { router.push("/(auth)/login"); return; }
      handleCommentLike(id, action);
    },
    [user, handleCommentLike],
  );

  const onReply = useCallback(
    (c: CommentData) => {
      if (!user) { router.push("/(auth)/login"); return; }
      const rootId = getRootCommentId(c.id);
      const author = c.userUsername ? `@${c.userUsername}` : smartName(c.user.displayName);
      setReplyTo({
        id: c.id,
        author,
        rootId,
        isNested: !!c.parentId,
      });
      // YouTube-style: when replying to a reply (not the root comment),
      // pre-fill the @mention so the flat thread shows who was replied to.
      if (c.parentId) {
        setNewComment(`${author} `);
      }
    },
    [user, getRootCommentId, setReplyTo, setNewComment],
  );

  const onMenuOpen = useCallback(
    (cid: string, isOwner: boolean) => { setCommentMenuId(cid); setCommentMenuOwner(isOwner); },
    [setCommentMenuId, setCommentMenuOwner],
  );

  const onMenuClose = useCallback(
    () => setCommentMenuId(null),
    [setCommentMenuId],
  );

  const onReveal = useCallback(
    (cid: string) => setRevealedComments((prev) => { const next = new Set(prev); next.add(cid); return next; }),
    [setRevealedComments],
  );

  const onDelete = useCallback(handleDeleteComment, [handleDeleteComment]);
  const onReport = useCallback(
    (cid: string) => setCommentReportModal(cid),
    [setCommentReportModal],
  );
  const onToggleReplies = useCallback(toggleReplies, [toggleReplies]);
  const onShowMoreReplies = useCallback(showMoreReplies, [showMoreReplies]);

  return (
    <View>
      {/* Header */}
      <View style={styles.commentsHeader}>
        <View style={styles.commentsTitleRow}>
          <SectionHeader icon="chatbubbles-outline" label="Comments" gradient={[colors.primary, colors.primaryShade]} inline />
          {totalComments > 0 && (
            <View style={[styles.commentCountBadge, { marginLeft: 6 }]}>
              <Text style={styles.commentCountText}>{formatCompactNumber(totalComments)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Comment input / auth prompt */}
      {!user ? (
        <Pressable onPress={() => router.push("/(auth)/login")} style={[styles.commentInput, { marginBottom: 10 }]}>
          <Text style={[styles.commentTextInput, { color: colors.textMuted, paddingTop: 4 }]}>
            Add a comment…
          </Text>
        </Pressable>
      ) : (
        <View style={styles.inlineCommentBar}>
          {replyTo && (
            <View style={styles.replyBanner}>
              <Ionicons name="return-down-forward-outline" size={13} color={colors.primary} />
              <Text style={styles.replyBannerText} numberOfLines={1}>
                Replying to <Text style={{ color: colors.text }}>{replyTo.author}</Text>
              </Text>
              <Pressable
                onPress={() => {
                  setReplyTo(null);
                  // Clear the auto-filled @mention if dismissing a nested reply
                  if (replyTo?.isNested) setNewComment("");
                }}
                style={{ marginLeft: "auto" as any }}
              >
                <Ionicons name="close" size={14} color={colors.textMuted} />
              </Pressable>
            </View>
          )}
          <View style={styles.commentInput}>
            <TextInput
              ref={commentInputRef}
              style={styles.commentTextInput}
              placeholder={replyTo ? `Reply to ${replyTo.author}...` : "Add a comment..."}
              placeholderTextColor={colors.textMuted}
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
            />
            <Pressable
              onPress={() => { Keyboard.dismiss(); handleSubmitComment(); }}
              disabled={submitting || !newComment.trim()}
              style={({ pressed }) => [
                styles.sendBtn,
                { opacity: (pressed || submitting || !newComment.trim()) ? 0.4 : 1 },
              ]}
            >
              <Ionicons name="send" size={15} color="#000" />
            </Pressable>
          </View>
        </View>
      )}

      {/* Comment list — plain View map instead of FlatList to avoid the
          nested-VirtualizedList "property is not configurable" crash.
          Parent ScrollView already owns all scrolling; scrollEnabled=false
          on a FlatList still triggers the VirtualizedList property-redefinition
          bug in React Native's Fabric renderer. */}
      <View>
        {topLevelComments.length === 0 ? (
          <View style={styles.noComments}>
            <Ionicons name="chatbubbles-outline" size={36} color={colors.textMuted} />
            <Text style={styles.noCommentsText}>No comments yet</Text>
            <Text style={styles.noCommentsSubtext}>Be the first to share your thoughts</Text>
          </View>
        ) : (
          topLevelComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment as any}
              isReply={false}
              currentUserLike={(userLikes[comment.id] ?? null) as any}
              isMenuOpen={commentMenuId === comment.id}
              isDeleting={deletingCommentId === comment.id}
              isRevealed={revealedComments.has(comment.id)}
              isCommentOwner={user?.id === comment.userId}
              canDelete={user?.id === comment.userId}
              descendants={getAllDescendants(comment.id) as any}
              expandedReplies={expandedReplies as any}
              visibleRepliesCount={visibleRepliesCount}
              allComments={commentsList as any}
              userLikes={userLikes as any}
              commentMenuId={commentMenuId}
              deletingCommentId={deletingCommentId}
              revealedComments={revealedComments}
              userId={user?.id}
              onLike={onLike}
              onReply={onReply}
              onMenuOpen={onMenuOpen}
              onMenuClose={onMenuClose}
              onDelete={onDelete}
              onReport={onReport}
              onReveal={onReveal}
              onToggleReplies={onToggleReplies}
              onShowMoreReplies={onShowMoreReplies}
            />
          ))
        )}

        {hasMoreComments && (
          <Pressable onPress={loadMoreComments} disabled={commentsLoading} style={styles.loadMoreBtn}>
            {commentsLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.loadMoreText}>Load More Comments</Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}
