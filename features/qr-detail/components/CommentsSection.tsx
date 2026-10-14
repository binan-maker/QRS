import React, { useCallback, type RefObject } from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { makeStyles } from "@/features/qr-detail/styles";
import { SectionHeader } from "@/shared/components/ui/SectionHeader";
import CommentItem from "@/features/qr-detail/components/CommentItem";
import type { CommentItem as CommentItemType } from "@/features/qr-detail/types";
import { formatCompactNumber, smartName } from "@/shared/utils/formatters";

interface ReplyTo {
  id: string;
  author: string;
  rootId: string;
  isNested: boolean;
}

interface Props {
  user: { id: string; displayName?: string } | null;
  totalComments: number;
  commentsList: CommentItemType[];
  topLevelComments: CommentItemType[];
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
  expandedReplies: Record<string, boolean>;
  visibleRepliesCount: Record<string, number>;
  handleSubmitComment: () => void;
  handleCommentLike: (id: string, currentLike: string | null) => void;
  handleDeleteComment: (id: string) => void;
  getAllDescendants: (id: string) => CommentItemType[];
  getRootCommentId: (id: string) => string;
  toggleReplies: (id: string) => void;
  showMoreReplies: (id: string) => void;
  loadMoreComments: () => void;
  onReport?: (id: string) => void;
}

export default function CommentsSection({
  user, totalComments, commentsList, topLevelComments, hasMoreComments, commentsLoading,
  newComment, setNewComment, replyTo, setReplyTo, commentMenuId, setCommentMenuId,
  setCommentMenuOwner, submitting, commentInputRef, userLikes, deletingCommentId,
  revealedComments, setRevealedComments, expandedReplies, visibleRepliesCount,
  handleSubmitComment, handleCommentLike, handleDeleteComment, getAllDescendants,
  getRootCommentId, toggleReplies, showMoreReplies, loadMoreComments,
}: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const onLike = useCallback(
    (id: string, action: "like" | "dislike") => {
      if (!user) { router.push("/(auth)/login"); return; }
      handleCommentLike(id, action);
    },
    [user, handleCommentLike]
  );

  const onReply = useCallback(
    (c: CommentItemType) => {
      if (!user) { router.push("/(auth)/login"); return; }
      const rootId = getRootCommentId(c.id);
      const author = c.userUsername ? `@${c.userUsername}` : smartName(c.user.displayName);
      setReplyTo({ id: c.id, author, rootId, isNested: !!c.parentId });
      if (c.parentId) setNewComment(`${author} `);
    },
    [user, getRootCommentId, setReplyTo, setNewComment]
  );

  return (
    <View>
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

      {!user ? (
        <Pressable onPress={() => router.push("/(auth)/login")} style={styles.inlineCommentBar}>
          <View style={styles.commentInput}>
            <Text style={[styles.commentTextInput, { color: colors.textMuted, paddingTop: 9 }]}>
              Add a comment…
            </Text>
            <View style={styles.sendBtn}>
              <Ionicons name="send" size={15} color="#000" />
            </View>
          </View>
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
                { opacity: pressed || submitting || !newComment.trim() ? 0.4 : 1 },
              ]}
            >
              <Ionicons name="send" size={15} color="#000" />
            </Pressable>
          </View>
        </View>
      )}

      <View>
        {topLevelComments.length === 0 ? (
          commentsLoading ? (
            <View style={{ paddingVertical: 24, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <View style={styles.noComments}>
              <Ionicons name="chatbubbles-outline" size={36} color={colors.textMuted} />
              <Text style={styles.noCommentsText}>No comments yet</Text>
              <Text style={styles.noCommentsSubtext}>Be the first to share your thoughts</Text>
            </View>
          )
        ) : (
          topLevelComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              isReply={false}
              currentUserLike={(userLikes[comment.id] ?? null) as any}
              isMenuOpen={commentMenuId === comment.id}
              isDeleting={deletingCommentId === comment.id}
              isCommentOwner={user?.id === comment.userId}
              descendants={getAllDescendants(comment.id)}
              expandedReplies={expandedReplies}
              visibleRepliesCount={visibleRepliesCount}
              userLikes={userLikes as any}
              commentMenuId={commentMenuId}
              deletingCommentId={deletingCommentId}
              userId={user?.id}
              onLike={onLike}
              onReply={onReply}
              onMenuOpen={(cid, isOwner) => { setCommentMenuId(cid); setCommentMenuOwner(isOwner); }}
              onMenuClose={() => setCommentMenuId(null)}
              onToggleReplies={toggleReplies}
              onShowMoreReplies={showMoreReplies}
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
