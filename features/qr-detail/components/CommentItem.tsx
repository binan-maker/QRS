import React from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";
import { router } from "expo-router";
import { formatCompactNumber } from "@/shared/utils/number-format";
import { formatRelativeTime } from "@/shared/utils/formatters";
import { useTheme } from "@/shared/contexts/ThemeContext";
import type { CommentItem as CommentItemType } from "@/features/qr-detail/hooks/comment-types";

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
    ["#7C3AED", "#A78BFA"],
    ["#059669", "#34D399"],
    ["#E11D48", "#FB7185"],
    ["#D97706", "#FBBF24"],
    ["#475569", "#94A3B8"],
    ["#0D9488", "#2DD4BF"],
  ];
  const idx = name.charCodeAt(0) % palettes.length;
  return palettes[idx];
}

// ── Avatar component (shared between top-level and reply) ──────────────────
function CommentAvatar({ size, photoURL, initial, gradient }: {
  size: number;
  photoURL?: string | null;
  initial: string;
  gradient: [string, string];
}) {
  if (photoURL) {
    return (
      <Image
        source={{ uri: photoURL }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        cachePolicy="memory-disk"
        contentFit="cover"
        transition={150}
      />
    );
  }
  return (
    <LinearGradient
      colors={gradient}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Text style={{ fontFamily: "Inter_700Bold", color: "#fff", fontSize: size < 32 ? 11 : 13 }}>
        {initial}
      </Text>
    </LinearGradient>
  );
}

// ── Like / Dislike pill ────────────────────────────────────────────────────
function ActionPill({
  icon, count, active, activeColor, onPress, surfaceBg,
}: {
  icon: string; count: number; active: boolean;
  activeColor: string; onPress: () => void; surfaceBg: string;
}) {
  return (
    <Pressable onPress={onPress} style={styles.actionBtn} hitSlop={6}>
      <View style={[styles.actionPill, { backgroundColor: surfaceBg }]}>
        <Ionicons
          name={icon as any}
          size={13}
          color={active ? activeColor : "#94A3B8"}
        />
        {count > 0 && (
          <Text style={[styles.actionCount, { color: active ? activeColor : "#94A3B8" }]}>
            {formatCompactNumber(count)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const CommentItem = React.memo(function CommentItem({
  comment, isReply = false, currentUserLike, isMenuOpen, isDeleting, isRevealed,
  isCommentOwner, canDelete, descendants, expandedReplies, visibleRepliesCount,
  onLike, onReply, onMenuOpen, onMenuClose, onDelete, onReport, onReveal,
  onToggleReplies, onShowMoreReplies,
  allComments, userLikes, commentMenuId, deletingCommentId, revealedComments, userId,
}: Props) {
  const { colors, isDark } = useTheme();
  const [textExpanded, setTextExpanded] = React.useState(false);

  const replyCount   = descendants.length;
  const isExpanded   = expandedReplies[comment.id] ?? false;
  const showCount    = visibleRepliesCount[comment.id] || REPLIES_PER_PAGE;
  const visibleReplies = descendants.slice(0, showCount);
  const hasMore      = replyCount > showCount;

  const displayName = comment.userUsername
    ? `@${comment.userUsername}`
    : comment.userId
      ? `@user_${comment.userId.slice(-5)}`
      : "@user";
  const avatarInitial  = comment.userUsername
    ? comment.userUsername.charAt(0).toUpperCase()
    : "U";
  const avatarGradient = getInitialColor(displayName);
  const navigateToProfile = comment.userUsername
    ? () => router.push(`/profile/${comment.userUsername}` as any)
    : undefined;

  const avatarSize  = isReply ? 28 : 34;
  const surfaceBg   = isDark ? colors.surfaceLight : colors.background;
  const threadColor = isDark ? "rgba(148,163,184,0.25)" : "rgba(148,163,184,0.35)";

  // ── Sensitive placeholder ─────────────────────────────────────────────────
  if (comment.isHidden && !isRevealed) {
    return (
      <Animated.View entering={FadeIn.duration(260)}>
        <Pressable onPress={() => onReveal(comment.id)} style={styles.sensitiveRow}>
          <Ionicons name="eye-off-outline" size={14} color={colors.textMuted} />
          <Text style={{ flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textMuted, fontStyle: "italic" }}>
            Sensitive content — tap to reveal
          </Text>
          <Ionicons name="chevron-forward" size={12} color={colors.textMuted} />
        </Pressable>
      </Animated.View>
    );
  }

  // ── Comment body (shared between top-level and reply) ─────────────────────
  function renderBody() {
    const isLong = comment.text.length > READ_MORE_THRESHOLD;
    const displayText = isLong && !textExpanded
      ? comment.text.slice(0, READ_MORE_THRESHOLD)
      : comment.text;

    return (
      <View style={styles.commentBody}>
        {/* Header row */}
        <View style={styles.commentHeader}>
          <Pressable onPress={navigateToProfile} disabled={!navigateToProfile} style={styles.authorPressable}>
            <Text
              style={[styles.authorName, { color: comment.userUsername ? colors.primary : colors.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {displayName}
            </Text>
          </Pressable>
          <Text style={[styles.commentTime, { color: colors.textMuted }]} numberOfLines={1}>
            {formatRelativeTime(comment.createdAt)}
          </Text>
          {comment.isHidden && isRevealed && (
            <View style={[styles.sensitiveTag, { backgroundColor: colors.warningDim }]}>
              <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: colors.warning }}>
                Sensitive
              </Text>
            </View>
          )}
          <Pressable
            onPress={() => isMenuOpen ? onMenuClose() : onMenuOpen(comment.id, isCommentOwner)}
            style={[styles.menuBtn, { marginLeft: "auto" as any }]}
            hitSlop={8}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Ionicons name="ellipsis-horizontal" size={16} color={colors.textMuted} />
            )}
          </Pressable>
        </View>

        {/* Comment text — leading @mention rendered in primary colour */}
        <View>
          <Text style={[styles.commentText, { color: colors.text }]}>
            {((): React.ReactNode => {
              // Detect a leading @mention (e.g. "@username rest of reply")
              if (displayText.startsWith("@")) {
                const si = displayText.indexOf(" ");
                if (si > 0) {
                  return (
                    <>
                      <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
                        {displayText.slice(0, si)}
                      </Text>
                      {displayText.slice(si)}
                    </>
                  );
                }
              }
              return displayText;
            })()}
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
            >
              Show less
            </Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <ActionPill
            icon={currentUserLike === "like" ? "thumbs-up" : "thumbs-up-outline"}
            count={comment.likeCount}
            active={currentUserLike === "like"}
            activeColor={colors.primary}
            onPress={() => onLike(comment.id, "like")}
            surfaceBg={surfaceBg}
          />
          <ActionPill
            icon={currentUserLike === "dislike" ? "thumbs-down" : "thumbs-down-outline"}
            count={comment.dislikeCount}
            active={currentUserLike === "dislike"}
            activeColor={colors.danger}
            onPress={() => onLike(comment.id, "dislike")}
            surfaceBg={surfaceBg}
          />
          <Pressable onPress={() => onReply(comment)} style={styles.actionBtn} hitSlop={6}>
            <View style={[styles.actionPill, { backgroundColor: surfaceBg }]}>
              <Ionicons name="return-down-forward-outline" size={13} color={colors.textMuted} />
              <Text style={[styles.actionCount, { color: colors.textMuted }]}>Reply</Text>
            </View>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Top-level comment ─────────────────────────────────────────────────────
  if (!isReply) {
    return (
      <View>
        <Animated.View entering={FadeIn.duration(260)}>
          <View style={styles.commentRow}>
            {/* Left column: avatar + optional vertical thread stem */}
            <View style={styles.avatarColumn}>
              <Pressable
                onPress={navigateToProfile}
                disabled={!navigateToProfile}
                style={{ flexShrink: 0 }}
              >
                <CommentAvatar
                  size={avatarSize}
                  photoURL={comment.userPhotoURL}
                  initial={avatarInitial}
                  gradient={avatarGradient}
                />
              </Pressable>
              {/* Vertical thread stem — shown when replies are expanded */}
              {replyCount > 0 && isExpanded && (
                <View style={[styles.threadStem, { backgroundColor: threadColor }]} />
              )}
            </View>
            {renderBody()}
          </View>
        </Animated.View>

        {/* Replies toggle ─────────────────────────────────────────────────── */}
        {replyCount > 0 && (
          <Pressable
            onPress={() => onToggleReplies(comment.id)}
            style={styles.repliesToggle}
          >
            {/* Short connector line from stem to toggle label */}
            <View style={[styles.toggleConnector, { backgroundColor: threadColor }]} />
            <View style={[styles.repliesToggleInner, {
              backgroundColor: colors.primaryDim,
              borderColor: colors.primary + "30",
            }]}>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={11}
                color={colors.primary}
              />
              <Text style={[styles.repliesToggleText, { color: colors.primary }]}>
                {isExpanded
                  ? "Hide replies"
                  : `${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
              </Text>
            </View>
          </Pressable>
        )}

        {/* Threaded replies ──────────────────────────────────────────────── */}
        {isExpanded && (
          <View style={styles.repliesWrapper}>
            {visibleReplies.map((reply, idx) => {
              const isLast = idx === visibleReplies.length - 1 && !hasMore;
              return (
                <View key={reply.id} style={styles.replyThreadRow}>
                  {/* Vertical continuation line + L-elbow connector */}
                  <View style={styles.replyConnectorCol}>
                    {/* Vertical segment — runs full height; hidden on last reply */}
                    {!isLast && (
                      <View style={[styles.replyVertLine, { backgroundColor: threadColor }]} />
                    )}
                    {/* L-elbow: top half vertical + horizontal arm */}
                    <View style={styles.replyElbow}>
                      <View style={[styles.elbowV, { backgroundColor: threadColor }]} />
                      <View style={[styles.elbowH, { backgroundColor: threadColor }]} />
                    </View>
                  </View>

                  {/* Reply comment */}
                  <View style={{ flex: 1 }}>
                    <CommentItem
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
                  </View>
                </View>
              );
            })}

            {hasMore && (
              <Pressable onPress={() => onShowMoreReplies(comment.id)} style={styles.showMoreBtn}>
                <Ionicons name="arrow-down-circle-outline" size={14} color={colors.primary} />
                <Text style={[styles.showMoreText, { color: colors.primary }]}>
                  Show {replyCount - showCount} more {replyCount - showCount === 1 ? "reply" : "replies"}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  }

  // ── Reply comment (rendered inside a thread row by the parent) ────────────
  return (
    <Animated.View entering={FadeIn.duration(220)}>
      <View style={styles.replyCommentRow}>
        <Pressable
          onPress={navigateToProfile}
          disabled={!navigateToProfile}
          style={{ flexShrink: 0, marginTop: 2 }}
        >
          <CommentAvatar
            size={avatarSize}
            photoURL={comment.userPhotoURL}
            initial={avatarInitial}
            gradient={avatarGradient}
          />
        </Pressable>
        {renderBody()}
      </View>
    </Animated.View>
  );
});

export default CommentItem;

// ── Dimensions ─────────────────────────────────────────────────────────────
// Parent avatar: 34px → center at 17px from left edge of commentRow
// Thread stem runs from below parent avatar down through the reply list
// Reply connector col is 17px wide, matching the avatar centre
const AVATAR_CENTER = 17; // px from left of commentRow to avatar centre (34/2)
const ELBOW_H_WIDTH = 16; // horizontal arm of the L-connector

const styles = StyleSheet.create({
  // ── Sensitive row ──────────────────────────────────────────────────────
  sensitiveRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 10, paddingHorizontal: 2,
  },

  // ── Top-level comment row ──────────────────────────────────────────────
  commentRow: {
    flexDirection: "row", gap: 10,
    paddingTop: 12, paddingBottom: 6, paddingHorizontal: 2,
  },
  avatarColumn: {
    flexShrink: 0,
    alignItems: "center",
    width: 34,
  },
  threadStem: {
    width: 2,
    flex: 1,
    borderRadius: 1,
    marginTop: 4,
    minHeight: 8,
  },

  // ── Reply comment row (inside thread container) ────────────────────────
  replyCommentRow: {
    flexDirection: "row", gap: 8,
    paddingTop: 8, paddingBottom: 6,
  },

  // ── Comment body ──────────────────────────────────────────────────────
  commentBody:   { flex: 1, gap: 4 },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  authorPressable: { flex: 1, minWidth: 0 },
  authorName: { fontSize: 12, fontFamily: "Inter_700Bold" },
  commentTime: { fontSize: 11, fontFamily: "Inter_400Regular", flexShrink: 0 },
  readMoreText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sensitiveTag: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  menuBtn: { padding: 2 },
  commentText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },

  // ── Action pills ──────────────────────────────────────────────────────
  actionRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  actionBtn: {},
  actionPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 100,
  },
  actionCount: { fontSize: 12, fontFamily: "Inter_500Medium" },

  // ── Replies toggle ────────────────────────────────────────────────────
  repliesToggle: {
    flexDirection: "row", alignItems: "center", gap: 0,
    paddingLeft: AVATAR_CENTER - 1,   // aligns with avatar centre / stem
    paddingVertical: 4, paddingBottom: 6,
  },
  toggleConnector: {
    width: ELBOW_H_WIDTH + 2,
    height: 2,
    borderRadius: 1,
    marginRight: 6,
  },
  repliesToggleInner: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 100, borderWidth: 1,
  },
  repliesToggleText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // ── Threaded replies wrapper ──────────────────────────────────────────
  repliesWrapper: {
    paddingLeft: AVATAR_CENTER - 1,   // align thread with avatar centre
    paddingBottom: 4,
  },

  // ── Each reply row: connector column + reply item ─────────────────────
  replyThreadRow: {
    flexDirection: "row",
  },
  replyConnectorCol: {
    width: ELBOW_H_WIDTH + 2,
    alignItems: "flex-start",
    position: "relative",
  },
  // Full-height vertical continuation line (hidden for last reply)
  replyVertLine: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    borderRadius: 1,
  },
  // L-elbow: the corner + horizontal arm
  replyElbow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 20,   // pushes elbow down to avatar mid-height
    height: 2,
    width: "100%",
  },
  elbowV: {
    width: 2,
    height: 14,
    position: "absolute",
    left: 0,
    bottom: 0,
    borderRadius: 1,
  },
  elbowH: {
    flex: 1,
    height: 2,
    marginLeft: 2,
    borderRadius: 1,
  },

  // ── Show more replies ──────────────────────────────────────────────────
  showMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingLeft: ELBOW_H_WIDTH + 4,
  },
  showMoreText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
