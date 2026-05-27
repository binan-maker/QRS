import Animated, { FadeInDown } from "react-native-reanimated";
import CommentsSection from "@/features/qr-detail/components/CommentsSection";

interface Props {
  user: any;
  offlineMode: boolean;
  q: any;
  delay?: number;
}

export function QrCommentSection({ user, offlineMode, q, delay = 110 }: Props) {
  if (offlineMode) return null;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(260)}>
      <CommentsSection
        user={user}
        totalComments={q.totalComments}
        commentsList={q.commentsList as any}
        topLevelComments={q.topLevelComments as any}
        hasMoreComments={q.hasMoreComments}
        commentsLoading={q.commentsLoading}
        newComment={q.newComment}
        setNewComment={q.setNewComment}
        replyTo={q.replyTo}
        setReplyTo={q.setReplyTo}
        commentMenuId={q.commentMenuId}
        setCommentMenuId={q.setCommentMenuId}
        setCommentMenuOwner={q.setCommentMenuOwner}
        submitting={q.submitting}
        commentInputRef={q.commentInputRef}
        userLikes={q.userLikes}
        deletingCommentId={q.deletingCommentId}
        revealedComments={q.revealedComments}
        setRevealedComments={q.setRevealedComments}
        expandedReplies={q.expandedReplies as any}
        visibleRepliesCount={q.visibleRepliesCount}
        handleSubmitComment={q.handleSubmitComment}
        handleCommentLike={q.handleCommentLike as any}
        handleDeleteComment={q.handleDeleteComment}
        setCommentReportModal={q.setCommentReportModal}
        getAllDescendants={q.getAllDescendants as any}
        getRootCommentId={q.getRootCommentId}
        toggleReplies={q.toggleReplies}
        showMoreReplies={q.showMoreReplies}
        loadMoreComments={q.loadMoreComments}
      />
    </Animated.View>
  );
}
