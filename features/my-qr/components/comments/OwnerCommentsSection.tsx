import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useScaleFns } from "@/shared/utils/use-scale";
import type { CommentItem } from "@/lib/firestore-service";
import OwnerCommentRow from "./OwnerCommentRow";

interface Props {
  comments: CommentItem[];
  commentsLoading: boolean;
  commentText: string;
  setCommentText: (v: string) => void;
  replyTo: { id: string; author: string } | null;
  setReplyTo: (v: { id: string; author: string } | null) => void;
  submittingComment: boolean;
  expandedReplies: Record<string, boolean>;
  setExpandedReplies: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  topLevelComments: CommentItem[];
  getAllDescendants: (parentId: string) => CommentItem[];
  handleSubmitComment: () => void;
  handleModerateComment: (commentId: string, commentUserId: string) => void;
  commentInputRef: React.RefObject<TextInput>;
  ownerInitials: string;
  commentCount: number;
}

export default function OwnerCommentsSection({
  comments, commentsLoading, commentText, setCommentText,
  replyTo, setReplyTo, submittingComment,
  expandedReplies, setExpandedReplies,
  topLevelComments, getAllDescendants,
  handleSubmitComment, handleModerateComment,
  commentInputRef, ownerInitials, commentCount,
}: Props) {
  const { colors } = useTheme();
  const { rf, sp } = useScaleFns();

  function toggleReplies(commentId: string) {
    setExpandedReplies((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  }

  return (
    <Animated.View entering={FadeInDown.duration(160)}>
      <View style={{ borderRadius: sp(18), borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, padding: sp(16), marginBottom: sp(14) }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp(10), marginBottom: sp(14) }}>
          <View style={{ width: sp(34), height: sp(34), borderRadius: sp(10), backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="chatbubbles-outline" size={rf(16)} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: colors.text }}>Comments</Text>
            <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted }}>Moderate as the owner</Text>
          </View>
          <View style={{ borderRadius: sp(10), paddingHorizontal: sp(8), paddingVertical: sp(3), backgroundColor: colors.primaryDim }}>
            <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.primary }}>{commentCount}</Text>
          </View>
        </View>

        {/* Comment input */}
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: sp(8), marginBottom: sp(12) }}>
          <View style={{ width: sp(30), height: sp(30), borderRadius: sp(15), backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Text style={{ fontSize: rf(12), fontFamily: "Inter_700Bold", color: colors.primary }}>{ownerInitials}</Text>
          </View>
          <View style={{ flex: 1, borderRadius: sp(20), borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.background, overflow: "hidden" }}>
            {replyTo && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp(6), paddingHorizontal: sp(12), paddingTop: sp(8), paddingBottom: sp(4) }}>
                <Ionicons name="return-down-forward-outline" size={rf(12)} color={colors.primary} />
                <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.primary, flex: 1 }} numberOfLines={1}>
                  Replying to {replyTo.author}
                </Text>
                <Pressable onPress={() => setReplyTo(null)}>
                  <Ionicons name="close" size={rf(14)} color={colors.textMuted} />
                </Pressable>
              </View>
            )}
            <TextInput
              ref={commentInputRef}
              value={commentText}
              onChangeText={setCommentText}
              placeholder={replyTo ? "Write a reply…" : "Add a comment…"}
              placeholderTextColor={colors.textMuted}
              multiline
              style={{ paddingHorizontal: sp(13), paddingVertical: sp(8), fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.text, maxHeight: sp(80) }}
            />
          </View>
          <Pressable
            onPress={handleSubmitComment}
            disabled={submittingComment || !commentText.trim()}
            style={{ width: sp(34), height: sp(34), borderRadius: sp(17), backgroundColor: commentText.trim() ? colors.primary : colors.surfaceLight, alignItems: "center", justifyContent: "center" }}
          >
            {submittingComment
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={rf(15)} color={commentText.trim() ? "#fff" : colors.textMuted} />
            }
          </Pressable>
        </View>

        {/* Comment list */}
        {commentsLoading ? (
          <View style={{ alignItems: "center", paddingVertical: sp(20) }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : topLevelComments.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: sp(24), gap: sp(6) }}>
            <Ionicons name="chatbubble-outline" size={rf(28)} color={colors.textMuted} />
            <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>No comments yet</Text>
            <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted }}>Comments from scanners will appear here</Text>
          </View>
        ) : (
          <View style={{ gap: sp(6) }}>
            {topLevelComments.map((comment) => {
              const replies = getAllDescendants(comment.id);
              const expanded = expandedReplies[comment.id];
              return (
                <View key={comment.id} style={{ borderRadius: sp(14), borderWidth: 1, borderColor: colors.surfaceBorder, overflow: "hidden" }}>
                  <OwnerCommentRow
                    comment={comment}
                    onReply={(c) => {
                      setReplyTo({ id: c.id, author: c.user?.displayName ?? "" });
                      commentInputRef.current?.focus();
                    }}
                    onModerate={handleModerateComment}
                  />
                  {replies.length > 0 && (
                    <View style={{ borderTopWidth: 1, borderTopColor: colors.surfaceBorder }}>
                      <Pressable
                        onPress={() => toggleReplies(comment.id)}
                        style={{ flexDirection: "row", alignItems: "center", gap: sp(5), paddingVertical: sp(8), paddingHorizontal: sp(12) }}
                      >
                        <Ionicons
                          name={expanded ? "chevron-up" : "chevron-down"}
                          size={rf(13)}
                          color={colors.primary}
                        />
                        <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.primary }}>
                          {expanded ? "Hide" : `${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
                        </Text>
                      </Pressable>
                      {expanded && (
                        <View style={{ paddingBottom: sp(4) }}>
                          {replies.map((reply) => (
                            <View key={reply.id} style={{ flexDirection: "row", paddingHorizontal: sp(10), paddingBottom: sp(4) }}>
                              <View style={{ width: 2, backgroundColor: colors.primaryDim, borderRadius: 1, marginRight: sp(8), marginLeft: sp(8) }} />
                              <View style={{ flex: 1 }}>
                                <OwnerCommentRow
                                  comment={reply}
                                  isReply
                                  onReply={(c) => {
                                    setReplyTo({ id: comment.id, author: c.user?.displayName ?? "" });
                                    commentInputRef.current?.focus();
                                  }}
                                  onModerate={handleModerateComment}
                                />
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </Animated.View>
  );
}
