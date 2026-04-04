import React from "react";
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";
import { router } from "expo-router";
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
const READ_MORE_THRESHOLD = 200;

function getInitialColor(name: string): [string, string] {
  const palettes: [string, string][] = [
    ["#2563EB", "#3B82F6"],
    ["#0052CC", "#4B8EF5"],
    ["#1D4ED8", "#60A5FA"],
    ["#1E40AF", "#93C5FD"],
    ["#3B82F6", "#60A5FA"],
    ["#2D6BC4", "#4B8EF5"],
  ];
  const idx = name.charCodeAt(0) % palettes.length;
  return palettes[idx];
}

const CommentItem = React.memo(function CommentItem({
  comment, isReply = false, currentUserLike, isMenuOpen, isDeleting, isRevealed,
  isCommentOwner, canDelete, descendants, expandedReplies, visibleRepliesCount,
  onLike, onReply, onMenuOpen, onMenuClose, onDelete, onReport, onReveal, onToggleReplies, onShowMoreReplies,
  allComments, userLikes, commentMenuId, deletingCommentId, revealedComments, userId,
}: Props) {
  const { colors, isDark } = useTheme();
  const [textExpanded, setTextExpanded] = React.useState(false);
  const replyCount = descendants.length;
  const isExpanded = expandedReplies[comment.id] ?? false;
  const showCount = visibleRepliesCount[comment.id] || REPLIES_PER_PAGE;
  const visibleReplies = descendants.slice(0, showCount);
  const hasMore = replyCount > showCount;

  const displayName = comment.userUsername ? `@${comment.userUsername}` : smartName(comment.user.displayName);
  const avatarGradient = getInitialColor(displayName);
  const navigateToProfile = comment.userUsername
    ? () => router.push(`/profile/${comment.userUsername}` as any)
    : undefined;

  if (comment.isHidden && !isRevealed) {
    return (
      <View key={comment.id}>
        <Animated.View entering={FadeIn.duration(300)}>
          <Pressable
            onPress={() => onReveal(comment.id)}
            style={styles.sensitiveRow}
          >
            <Ionicons name="eye-off-outline" size={14} color={colors.textMuted} />
            <Text style={{ flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textMuted, fontStyle: "italic" }}>
              Sensitive content — tap to reveal
            </Text>
            <Ionicons name="chevron-forward" size={12} color={colors.textMuted} />
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  const avatarSize = isReply ? 28 : 34;

  return (
    <View key={comment.id}>
      <Animated.View entering={FadeIn.duration(300)}>
        <View style={[
          styles.commentRow,
          isReply && { paddingLeft: 42 },
        ]}>
          {/* Avatar */}
          <Pressable onPress={navigateToProfile} disabled={!navigateToProfile} style={{ flexShrink: 0, marginTop: 1 }}>
            {comment.userPhotoURL ? (
              <Image
                source={{ uri: comment.userPhotoURL }}
                style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }}
              />
            ) : (
              <LinearGradient
                colors={avatarGradient}
                style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, alignItems: "center", justifyContent: "center" }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={{ fontFamily: "Inter_700Bold", color: "#fff", fontSize: isReply ? 11 : 13 }}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            )}
          </Pressable>

          <View style={styles.commentBody}>
            {/* Header row */}
            <View style={styles.commentHeader}>
              <Pressable onPress={navigateToProfile} disabled={!navigateToProfile} style={styles.authorPressable}>
                <Text style={[styles.authorName, { color: comment.userUsername ? colors.primary : colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                  {displayName}
                </Text>
              </Pressable>
              <Text style={[styles.commentTime, { color: colors.textMuted }]} numberOfLines={1}>{formatRelativeTime(comment.createdAt)}</Text>
              {comment.isHidden && isRevealed && (
                <View style={[styles.sensitiveTag, { backgroundColor: colors.warningDim }]}>
                  <Text style={[{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.warning }]}>Sensitive</Text>
                </View>
              )}
              <Pressable
                onPress={() => isMenuOpen ? onMenuClose() : onMenuOpen(comment.id, isCommentOwner)}
                style={[styles.menuBtn, { marginLeft: "auto" as any }]}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={colors.danger} />
                ) : (
                  <Ionicons name="ellipsis-horizontal" size={16} color={colors.textMuted} />
                )}
              </Pressable>
            </View>

            {/* Text */}
            {(() => {
              const isLong = comment.text.length > READ_MORE_THRESHOLD;
              const displayText = isLong && !textExpanded
                ? comment.text.slice(0, READ_MORE_THRESHOLD)
                : comment.text;
              return (
                <View>
                  <Text style={[styles.commentText, { color: colors.text }]}>
                    {displayText}
                    {isLong && !textExpanded && (
                      <Text
                        style={[styles.readMoreText, { color: colors.primary }]}
                        onPress={() => setTextExpanded(true)}
                      >{" "}... Read more</Text>
                    )}
                  </Text>
                  {isLong && textExpanded && (
                    <Text
                      style={[styles.readMoreText, { color: colors.primary, marginTop: 3 }]}
                      onPress={() => setTextExpanded(false)}
                    >Show less</Text>
                  )}
                </View>
              );
            })()}

            {/* Actions */}
            <View style={styles.actionRow}>
              {/* Like */}
              <Pressable onPress={() => onLike(comment.id, "like")} style={styles.actionBtn}>
                <View style={[styles.actionPill, { backgroundColor: isDark ? colors.surfaceLight : colors.background }]}>
                  <Ionicons
                    key={`like-${comment.id}-${currentUserLike}`}
                    name={currentUserLike === "like" ? "thumbs-up" : "thumbs-up-outline"}
                    size={13}
                    color={currentUserLike === "like" ? colors.primary : colors.textMuted}
                  />
                  {comment.likeCount > 0 && (
                    <Text style={[styles.actionCount, { color: currentUserLike === "like" ? colors.primary : colors.textMuted }]}>
                      {formatCompactNumber(comment.likeCount)}
                    </Text>
                  )}
                </View>
              </Pressable>

              {/* Dislike */}
              <Pressable onPress={() => onLike(comment.id, "dislike")} style={styles.actionBtn}>
                <View style={[styles.actionPill, { backgroundColor: isDark ? colors.surfaceLight : colors.background }]}>
                  <Ionicons
                    key={`dislike-${comment.id}-${currentUserLike}`}
                    name={currentUserLike === "dislike" ? "thumbs-down" : "thumbs-down-outline"}
                    size={13}
                    color={currentUserLike === "dislike" ? colors.danger : colors.textMuted}
                  />
                  {comment.dislikeCount > 0 && (
                    <Text style={[styles.actionCount, { color: currentUserLike === "dislike" ? colors.danger : colors.textMuted }]}>
                      {formatCompactNumber(comment.dislikeCount)}
                    </Text>
                  )}
                </View>
              </Pressable>

              {/* Reply */}
              <Pressable onPress={() => onReply(comment)} style={styles.actionBtn}>
                <View style={[styles.actionPill, { backgroundColor: isDark ? colors.surfaceLight : colors.background }]}>
                  <Ionicons name="return-down-forward-outline" size={13} color={colors.textMuted} />
                  <Text style={[styles.actionCount, { color: colors.textMuted }]}>Reply</Text>
                </View>
              </Pressable>
            </View>

          </View>
        </View>
      </Animated.View>

      {/* Replies toggle */}
      {!isReply && replyCount > 0 && (
        <Pressable onPress={() => onToggleReplies(comment.id)} style={styles.repliesToggle}>
          <View style={[styles.replyLine, { backgroundColor: colors.surfaceBorder }]} />
          <View style={[styles.repliesToggleInner, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={11} color={colors.primary} />
            <Text style={[styles.repliesToggleText, { color: colors.primary }]}>
              {isExpanded ? "Hide replies" : `${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
            </Text>
          </View>
        </Pressable>
      )}

      {/* Replies */}
      {!isReply && isExpanded && (
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
          {hasMore && (
            <Pressable onPress={() => onShowMoreReplies(comment.id)} style={styles.showMoreBtn}>
              <Text style={[styles.showMoreText, { color: colors.primary }]}>
                Show {replyCount - showCount} more replies
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
});

export default CommentItem;

const styles = StyleSheet.create({
  sensitiveRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 10, paddingHorizontal: 2,
  },
  commentRow: {
    flexDirection: "row", gap: 10,
    paddingTop: 12, paddingBottom: 10, paddingHorizontal: 2,
  },
  commentBody: { flex: 1, gap: 5 },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  authorPressable: { flex: 1, minWidth: 0 },
  authorName: { fontSize: 13, fontFamily: "Inter_700Bold" },
  commentTime: { fontSize: 12, fontFamily: "Inter_400Regular", flexShrink: 0 },
  readMoreText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sensitiveTag: {
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5,
  },
  menuBtn: { padding: 2 },
  commentText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  actionBtn: {},
  actionPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 100,
  },
  actionCount: { fontSize: 12, fontFamily: "Inter_500Medium" },
  inlineMenu: {
    flexDirection: "row", gap: 14, borderRadius: 10, padding: 10,
    borderWidth: 1, marginTop: 4,
  },
  inlineMenuItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  inlineMenuText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  repliesToggle: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingLeft: 44, paddingVertical: 6,
  },
  replyLine: { width: 16, height: 1 },
  repliesToggleInner: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100, borderWidth: 1,
  },
  repliesToggleText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  repliesContainer: { paddingLeft: 0 },
  showMoreBtn: { alignItems: "center", paddingVertical: 8, paddingLeft: 44 },
  showMoreText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
