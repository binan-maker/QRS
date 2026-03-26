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

function getInitialColor(name: string): [string, string] {
  const palettes: [string, string][] = [
    ["#006FFF", "#00CFFF"],
    ["#8B5CF6", "#EC4899"],
    ["#10B981", "#06B6D4"],
    ["#F59E0B", "#F97316"],
    ["#EF4444", "#F97316"],
    ["#3B82F6", "#6366F1"],
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
            style={[styles.sensitiveCard, { backgroundColor: colors.warningDim, borderColor: colors.warning + "40" }]}
          >
            <View style={[styles.sensitiveIcon, { backgroundColor: colors.warning + "20" }]}>
              <Ionicons name="eye-outline" size={16} color={colors.warning} />
            </View>
            <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: colors.warning }}>
              Sensitive content — tap to reveal
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  const avatarSize = isReply ? 30 : 36;

  return (
    <View key={comment.id}>
      <Animated.View entering={FadeIn.duration(300)}>
        <View style={[
          styles.commentCard,
          isReply
            ? { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.surfaceBorder, marginLeft: 10 }
            : { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
        ]}>
          {comment.isHidden && isRevealed && (
            <View style={[styles.sensitiveTag, { backgroundColor: colors.warningDim }]}>
              <Ionicons name="warning-outline" size={10} color={colors.warning} />
              <Text style={[styles.sensitiveTagText, { color: colors.warning }]}>Reported sensitive</Text>
            </View>
          )}

          <View style={styles.commentHeader}>
            {/* Avatar */}
            <Pressable onPress={navigateToProfile} disabled={!navigateToProfile}>
              {comment.userPhotoURL ? (
                <Image
                  source={{ uri: comment.userPhotoURL }}
                  style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
                />
              ) : (
                <LinearGradient
                  colors={avatarGradient}
                  style={[styles.avatarGradient, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={[styles.avatarInitial, { fontSize: isReply ? 12 : 14 }]}>
                    {displayName.charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
              )}
            </Pressable>

            <View style={styles.headerMeta}>
              <Pressable onPress={navigateToProfile} disabled={!navigateToProfile}>
                <Text style={[styles.authorName, { color: comment.userUsername ? avatarGradient[0] : colors.text }]} numberOfLines={1}>
                  {displayName}
                </Text>
              </Pressable>
              <Text style={[styles.commentTime, { color: colors.textMuted }]}>{formatRelativeTime(comment.createdAt)}</Text>
            </View>

            <Pressable
              onPress={() => isMenuOpen ? onMenuClose() : onMenuOpen(comment.id, isCommentOwner)}
              style={styles.menuBtn}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
              )}
            </Pressable>
          </View>

          <Text style={[styles.commentText, { color: colors.text }]}>{comment.text}</Text>

          {/* Actions */}
          <View style={styles.actionRow}>
            <Pressable onPress={() => onLike(comment.id, "like")} style={styles.actionBtn}>
              {currentUserLike === "like" ? (
                <LinearGradient colors={["#10B981", "#06B6D4"]} style={styles.activeActionBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Ionicons name="thumbs-up" size={13} color="#fff" />
                  {comment.likeCount > 0 && <Text style={styles.activeActionCount}>{formatCompactNumber(comment.likeCount)}</Text>}
                </LinearGradient>
              ) : (
                <View style={[styles.inactiveActionBg, { backgroundColor: colors.surfaceLight }]}>
                  <Ionicons name="thumbs-up-outline" size={13} color={colors.textMuted} />
                  {comment.likeCount > 0 && <Text style={[styles.inactiveActionCount, { color: colors.textMuted }]}>{formatCompactNumber(comment.likeCount)}</Text>}
                </View>
              )}
            </Pressable>

            <Pressable onPress={() => onLike(comment.id, "dislike")} style={styles.actionBtn}>
              {currentUserLike === "dislike" ? (
                <LinearGradient colors={["#EF4444", "#DC2626"]} style={styles.activeActionBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Ionicons name="thumbs-down" size={13} color="#fff" />
                  {comment.dislikeCount > 0 && <Text style={styles.activeActionCount}>{formatCompactNumber(comment.dislikeCount)}</Text>}
                </LinearGradient>
              ) : (
                <View style={[styles.inactiveActionBg, { backgroundColor: colors.surfaceLight }]}>
                  <Ionicons name="thumbs-down-outline" size={13} color={colors.textMuted} />
                  {comment.dislikeCount > 0 && <Text style={[styles.inactiveActionCount, { color: colors.textMuted }]}>{formatCompactNumber(comment.dislikeCount)}</Text>}
                </View>
              )}
            </Pressable>

            <Pressable onPress={() => onReply(comment)} style={styles.actionBtn}>
              <View style={[styles.inactiveActionBg, { backgroundColor: colors.surfaceLight }]}>
                <Ionicons name="return-down-forward-outline" size={13} color={colors.textMuted} />
                <Text style={[styles.inactiveActionCount, { color: colors.textMuted }]}>Reply</Text>
              </View>
            </Pressable>
          </View>

          {/* Inline menu */}
          {isMenuOpen && (
            <View style={[styles.inlineMenu, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
              {canDelete && (
                <Pressable onPress={() => onDelete(comment.id)} style={styles.inlineMenuItem}>
                  <Ionicons name="trash-outline" size={14} color={colors.danger} />
                  <Text style={[styles.inlineMenuText, { color: colors.danger }]}>Delete</Text>
                </Pressable>
              )}
              {!isCommentOwner && (
                <Pressable onPress={() => onReport(comment.id)} style={styles.inlineMenuItem}>
                  <Ionicons name="flag-outline" size={14} color={colors.warning} />
                  <Text style={[styles.inlineMenuText, { color: colors.warning }]}>Report</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </Animated.View>

      {/* Replies toggle */}
      {!isReply && replyCount > 0 && (
        <Pressable onPress={() => onToggleReplies(comment.id)} style={styles.repliesToggle}>
          <View style={[styles.replyLine, { backgroundColor: colors.surfaceBorder }]} />
          <View style={[styles.repliesToggleInner, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={12} color={colors.primary} />
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
  sensitiveCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1,
  },
  sensitiveIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  commentCard: { borderRadius: 18, padding: 14, marginBottom: 8, borderWidth: 1, gap: 10 },
  sensitiveTag: {
    flexDirection: "row", alignItems: "center", gap: 5,
    alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  sensitiveTagText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { flexShrink: 0 },
  avatarGradient: { flexShrink: 0, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontFamily: "Inter_700Bold", color: "#fff" },
  headerMeta: { flex: 1 },
  authorName: { fontSize: 13, fontFamily: "Inter_700Bold" },
  commentTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  menuBtn: { padding: 4 },
  commentText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionBtn: {},
  activeActionBg: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100,
  },
  activeActionCount: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
  inactiveActionBg: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100,
  },
  inactiveActionCount: { fontSize: 11, fontFamily: "Inter_500Medium" },
  inlineMenu: {
    flexDirection: "row", gap: 14, borderRadius: 12, padding: 12,
    borderWidth: 1, marginTop: 4,
  },
  inlineMenuItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  inlineMenuText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  repliesToggle: { flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 20, marginBottom: 4 },
  replyLine: { width: 20, height: 1 },
  repliesToggleInner: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, borderWidth: 1,
  },
  repliesToggleText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  repliesContainer: { paddingLeft: 20, gap: 0 },
  showMoreBtn: { alignItems: "center", paddingVertical: 10 },
  showMoreText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
