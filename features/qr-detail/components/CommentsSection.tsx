import React, { useCallback, useMemo } from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator, Keyboard, FlatList } from "react-native";
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
  commentInputRef: React.RefObject<TextInput>;
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

  // ── Stable callbacks so CommentItem.memo actually skips re-renders ──────────
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
      setReplyTo({
        id: c.id,
        author: c.userUsername ? `@${c.userUsername}` : smartName(c.user.displayName),
        rootId,
        isNested: !!c.parentId,
      });
    },
    [user, getRootCommentId, setReplyTo],
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

  // extraData tells FlatList to re-render items when volatile state changes
  const extraData = useMemo(
    () => ({ commentMenuId, deletingCommentId, userLikes, expandedReplies, revealedComments, user }),
    [commentMenuId, deletingCommentId, userLikes, expandedReplies, revealedComments, user],
  );

  const keyExtractor = useCallback((item: CommentData) => item.id, []);

  const renderItem = useCallback(
    ({ item: comment }: { item: CommentData }) => (
      <CommentItem
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
    ),
    [
      commentMenuId, deletingCommentId, revealedComments, expandedReplies,
      visibleRepliesCount, commentsList, userLikes, user,
      getAllDescendants,
      onLike, onReply, onMenuOpen, onMenuClose, onDelete, onReport,
      onReveal, onToggleReplies, onShowMoreReplies,
    ],
  );

  const ListEmptyComponent = useMemo(
    () => (
      <View style={styles.noComments}>
        <Ionicons name="chatbubbles-outline" size={36} color={colors.textMuted} />
        <Text style={styles.noCommentsText}>No comments yet</Text>
        <Text style={styles.noCommentsSubtext}>Be the first to share your thoughts</Text>
      </View>
    ),
    [colors.textMuted, styles.noComments, styles.noCommentsText, styles.noCommentsSubtext],
  );

  const ListFooterComponent = useMemo(
    () =>
      hasMoreComments ? (
        <Pressable onPress={loadMoreComments} disabled={commentsLoading} style={styles.loadMoreBtn}>
          {commentsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.loadMoreText}>Load More Comments</Text>
          )}
        </Pressable>
      ) : null,
    [hasMoreComments, commentsLoading, loadMoreComments, colors.primary, styles.loadMoreBtn, styles.loadMoreText],
  );

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
              <Pressable onPress={() => setReplyTo(null)} style={{ marginLeft: "auto" as any }}>
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

      {/* Comment list — FlatList with scrollEnabled=false so the parent ScrollView
          handles scrolling; view recycling + stable callbacks keep memo effective */}
      <FlatList
        data={topLevelComments}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        extraData={extraData}
        scrollEnabled={false}
        removeClippedSubviews
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        windowSize={5}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
      />
    </View>
  );
}
