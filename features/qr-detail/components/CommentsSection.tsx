import { View, Text, Pressable, TextInput, ActivityIndicator, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { makeStyles } from "@/features/qr-detail/styles";
import { SectionHeader } from "@/features/qr-detail/components/SectionHeader";
import CommentItem from "@/features/qr-detail/components/CommentItem";
import { formatCompactNumber } from "@/lib/number-format";
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

      {/* Empty state */}
      {commentsList.length === 0 ? (
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
            onLike={user ? handleCommentLike : () => router.push("/(auth)/login")}
            onReply={user ? (c) => {
              const rootId = getRootCommentId(c.id);
              setReplyTo({
                id: c.id,
                author: c.userUsername ? `@${c.userUsername}` : smartName(c.user.displayName),
                rootId,
                isNested: !!c.parentId,
              });
            } : () => router.push("/(auth)/login")}
            onMenuOpen={(cid, isOwner) => { setCommentMenuId(cid); setCommentMenuOwner(isOwner); }}
            onMenuClose={() => setCommentMenuId(null)}
            onDelete={handleDeleteComment}
            onReport={(cid) => setCommentReportModal(cid)}
            onReveal={(cid) => setRevealedComments((prev) => { const next = new Set(prev); next.add(cid); return next; })}
            onToggleReplies={toggleReplies}
            onShowMoreReplies={showMoreReplies}
          />
        ))
      )}

      {/* Load more */}
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
  );
}
