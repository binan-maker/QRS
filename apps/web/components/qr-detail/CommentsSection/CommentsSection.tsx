"use client";

import React, { useState, useRef, useMemo } from "react";
import type { User } from "@supabase/supabase-js";
import { Ionicons } from "@/lib/mobile-icons";
import { useTheme } from "@/lib/theme-context";
import { formatCompactNumber, formatRelativeTime as formatMobileRelativeTime } from "@shared/utils/formatters";
import { REPLIES_PER_PAGE } from "@shared/utils/qr-detail-rules";
import type { WebQrComment } from "@/lib/qr-client";
import { COMMENT_SORT_OPTIONS, type CommentSortOption, type ReplyTarget } from "../types";
import styles from "@/app/qr/[code]/qr.module.css";

const READ_MORE_THRESHOLD = 200;

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "just now";
  return formatMobileRelativeTime(iso);
}

function getInitialColor(name: string): [string, string] {
  const palettes: [string, string][] = [
    ["#7C3AED", "#A78BFA"],
    ["#059669", "#34D399"],
    ["#E11D48", "#FB7185"],
    ["#D97706", "#FBBF24"],
    ["#475569", "#94A3B8"],
    ["#0D9488", "#2DD4BF"],
  ];
  const code = (name || "U").charCodeAt(0) || 0;
  return palettes[code % palettes.length];
}

interface CommentsSectionProps {
  commentsList: WebQrComment[];
  user: User | null;
  currentActiveUserAvatar?: string | null;
  commentSort: "top" | "newest" | "oldest";
  onSortChange: (sort: "top" | "newest" | "oldest") => void;
  onAddComment: (text: string, parentId?: string | null) => Promise<void>;
  onEditComment: (commentId: string, text: string) => Promise<void>;
  onDeleteComment: (commentId: string) => void;
  onReactComment: (commentId: string, action: "like" | "dislike") => void;
  onRequestReport: (comment: WebQrComment) => void;
  onRequireLogin: () => void;
  onOpenCommentMenu: (comment: WebQrComment, isOwner: boolean) => void;
}

export function CommentsSection({
  commentsList,
  user,
  currentActiveUserAvatar,
  commentSort,
  onSortChange,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onReactComment,
  onRequestReport,
  onRequireLogin,
  onOpenCommentMenu,
}: CommentsSectionProps) {
  const { colors } = useTheme();

  // Internal UI states
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [visibleRepliesCount, setVisibleRepliesCount] = useState<Record<string, number>>({});
  const [expandedCommentText, setExpandedCommentText] = useState<Record<string, boolean>>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  // Close sort menu on click outside
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setSortMenuOpen(false);
      }
    }
    if (sortMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [sortMenuOpen]);

  // Reply trees
  const getRootCommentId = (commentId: string): string => {
    const parent = commentsList.find((c) => c.id === commentId);
    if (!parent || !parent.parentId) return commentId;
    return getRootCommentId(parent.parentId);
  };

  const getAllDescendants = (commentId: string): WebQrComment[] => {
    const directChildren = commentsList.filter((c) => c.parentId === commentId);
    let all: WebQrComment[] = [];
    for (const child of directChildren) {
      all.push(child);
      all = all.concat(getAllDescendants(child.id));
    }
    return all.sort(
      (a, b) =>
        (a.createdAt ? new Date(a.createdAt).getTime() : 0) -
        (b.createdAt ? new Date(b.createdAt).getTime() : 0)
    );
  };

  const topLevelComments = useMemo(() => {
    const roots = commentsList.filter((c) => !c.parentId);
    if (commentSort === "newest") {
      return [...roots].sort(
        (a, b) =>
          (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
          (a.createdAt ? new Date(a.createdAt).getTime() : 0)
      );
    }
    if (commentSort === "oldest") {
      return [...roots].sort(
        (a, b) =>
          (a.createdAt ? new Date(a.createdAt).getTime() : 0) -
          (b.createdAt ? new Date(b.createdAt).getTime() : 0)
      );
    }
    // "top": sort by net positive votes (likes - dislikes), then newest
    return [...roots].sort((a, b) => {
      const scoreA = (a.likes || 0) - (a.dislikes || 0);
      const scoreB = (b.likes || 0) - (b.dislikes || 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (
        (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
        (a.createdAt ? new Date(a.createdAt).getTime() : 0)
      );
    });
  }, [commentsList, commentSort]);

  const handleReplyClick = (comment: WebQrComment) => {
    if (!user) {
      onRequireLogin();
      return;
    }
    const rootId = getRootCommentId(comment.id);
    const rawAuthor = (comment.userUsername || comment.userName || "user")
      .replace(/^@/, "")
      .replace(/\s+/g, "")
      .replace(/[^a-zA-Z0-9_]/g, "")
      .toLowerCase() || "user";
    const author = `@${rawAuthor}`;
    setReplyTo({
      id: comment.id,
      author,
      rootId,
      isNested: Boolean(comment.parentId),
    });
    if (comment.parentId) {
      setNewComment(`${author} `);
    }
    window.setTimeout(() => commentInputRef.current?.focus(), 60);
  };

  const handleSubmit = async () => {
    const trimmed = newComment.trim();
    if (trimmed.length < 2 || trimmed.length > 1000) return;
    setSubmittingComment(true);
    try {
      const parentId = replyTo?.rootId || replyTo?.id || null;
      await onAddComment(trimmed, parentId);
      setNewComment("");
      if (parentId) {
        setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));
      }
      setReplyTo(null);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSaveEdit = async (commentId: string) => {
    const trimmed = editingText.trim();
    if (trimmed.length < 2 || trimmed.length > 1000) return;
    setSavingEdit(true);
    try {
      await onEditComment(commentId, trimmed);
      setEditingCommentId(null);
      setEditingText("");
    } finally {
      setSavingEdit(false);
    }
  };

  const renderFormattedCommentText = (rawText: string) => {
    let text = rawText;
    for (const c of commentsList) {
      if (c.userUsername) {
        const clean = c.userUsername.toLowerCase();
        const mentionMatches = text.match(/(?:^|\s)@([a-zA-Z0-9_\s]{2,40})/g);
        if (mentionMatches) {
          for (const m of mentionMatches) {
            const trimmedM = m.trim();
            const inner = trimmedM.slice(1);
            if (inner.includes(" ") && inner.replace(/\s+/g, "").toLowerCase() === clean) {
              text = text.replace(trimmedM, `@${clean}`);
            }
          }
        }
      }
    }

    const tokens = text.split(/(https?:\/\/[^\s]+|@[a-zA-Z0-9_]+)/g);
    return tokens.map((tok, i) => {
      if (/^https?:\/\//i.test(tok)) {
        return (
          <a
            key={i}
            href={tok}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.commentUrl}
            onClick={(e) => e.stopPropagation()}
          >
            {tok}
          </a>
        );
      }
      if (/^@[a-zA-Z0-9_]+/i.test(tok)) {
        return (
          <span key={i} className={styles.commentMentionPill}>
            {tok}
          </span>
        );
      }
      return <React.Fragment key={i}>{tok}</React.Fragment>;
    });
  };

  const renderCommentBody = (comment: WebQrComment, isReply: boolean) => {
    const cleanAuthor = (comment.userUsername || comment.userName || "user")
      .replace(/^@/, "")
      .replace(/\s+/g, "")
      .replace(/[^a-zA-Z0-9_]/g, "")
      .toLowerCase() || "user";
    const authorHandle = `@${cleanAuthor}`;
    const isLong = comment.text.length > READ_MORE_THRESHOLD;
    const isTextExpanded = Boolean(expandedCommentText[comment.id]);
    const displayText =
      isLong && !isTextExpanded
        ? comment.text.slice(0, READ_MORE_THRESHOLD)
        : comment.text;
    const isOwner = Boolean(user && user.id === comment.userId);
    const isEditingThis = editingCommentId === comment.id;

    return (
      <div className={styles.commentBody}>
        <div className={styles.commentHeader}>
          <span className={styles.authorName}>{authorHandle}</span>
          {comment.isPinned && (
            <span className={styles.commentPinnedBadge} title="Pinned comment">
              <Ionicons name="pin" size={10} />
              <span>Pinned</span>
            </span>
          )}
          <span className={styles.commentTime}>{formatRelativeTime(comment.createdAt)}</span>
          {comment.isEdited && (
            <span className={styles.commentEditedBadge}>(edited)</span>
          )}

          <button
            type="button"
            className={styles.commentMenuBtn}
            aria-label="Comment options"
            title="Comment options"
            onClick={() => onOpenCommentMenu(comment, isOwner)}
          >
            <Ionicons name="ellipsis-horizontal" size={15} color={colors.textMuted} />
          </button>
        </div>

        {isEditingThis ? (
          <div className={styles.inlineEditBox}>
            <textarea
              className={styles.inlineEditTextArea}
              value={editingText}
              onChange={(e) => setEditingText(e.target.value.slice(0, 1000))}
              maxLength={1000}
              placeholder="Edit your comment..."
              autoFocus
            />
            <div className={styles.inlineEditFooter}>
              <span className={styles.inlineEditCharCount}>
                {editingText.length}/1000
              </span>
              <div className={styles.inlineEditBtnGroup}>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCommentId(null);
                    setEditingText("");
                  }}
                  disabled={savingEdit}
                  className={styles.inlineEditCancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveEdit(comment.id)}
                  disabled={savingEdit || editingText.trim().length < 2}
                  className={styles.inlineEditSaveBtn}
                >
                  {savingEdit ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.commentTextWrap}>
            <p className={styles.commentText}>
              {renderFormattedCommentText(displayText)}
              {isLong && !isTextExpanded && (
                <button
                  type="button"
                  className={styles.readMoreInline}
                  onClick={() =>
                    setExpandedCommentText((prev) => ({ ...prev, [comment.id]: true }))
                  }
                >
                  {" "}... Read more
                </button>
              )}
            </p>
            {isLong && isTextExpanded && (
              <button
                type="button"
                className={styles.readMoreInline}
                onClick={() =>
                  setExpandedCommentText((prev) => ({ ...prev, [comment.id]: false }))
                }
              >
                Show less
              </button>
            )}
          </div>
        )}

        <div className={styles.commentActionRow}>
          <button
            type="button"
            onClick={() => onReactComment(comment.id, "like")}
            className={`${styles.actionPill} ${comment.userLike === "like" ? styles.actionPillLiked : ""}`}
            aria-label="Like comment"
          >
            <Ionicons
              name={comment.userLike === "like" ? "thumbs-up" : "thumbs-up-outline"}
              size={13}
              color={comment.userLike === "like" ? colors.primary : colors.textMuted}
            />
            {comment.likes > 0 && <span>{formatCompactNumber(comment.likes)}</span>}
          </button>

          <button
            type="button"
            onClick={() => onReactComment(comment.id, "dislike")}
            className={`${styles.actionPill} ${comment.userLike === "dislike" ? styles.actionPillDisliked : ""}`}
            aria-label="Dislike comment"
          >
            <Ionicons
              name={comment.userLike === "dislike" ? "thumbs-down" : "thumbs-down-outline"}
              size={13}
              color={comment.userLike === "dislike" ? colors.danger : colors.textMuted}
            />
            {comment.dislikes > 0 && <span>{formatCompactNumber(comment.dislikes)}</span>}
          </button>

          <button
            type="button"
            onClick={() => handleReplyClick(comment)}
            className={styles.actionPill}
          >
            <Ionicons name="return-down-forward-outline" size={13} color={colors.textMuted} />
            <span>Reply</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className={styles.commentsContainer} aria-label="Comments">
      <div className={styles.commentsHeader}>
        <div className={styles.commentsTitleRow}>
          <h2 className={styles.commentsTitle}>Comments</h2>
          {commentsList.length > 0 && (
            <span className={styles.commentCountBadge}>
              {formatCompactNumber(commentsList.length)}
            </span>
          )}
        </div>

        {/* Dropdown Menu for Comment Sorting */}
        <div className={styles.sortDropdownContainer} ref={sortMenuRef}>
          <button
            type="button"
            className={`${styles.sortDropdownTrigger} ${sortMenuOpen ? styles.sortDropdownTriggerOpen : ""}`}
            onClick={() => setSortMenuOpen((prev) => !prev)}
            aria-expanded={sortMenuOpen}
            aria-haspopup="menu"
            aria-label={`Sort comments. Current sort: ${commentSort}`}
          >
            <Ionicons
              name={
                commentSort === "top"
                  ? "flame-outline"
                  : commentSort === "oldest"
                    ? "arrow-up-circle-outline"
                    : "time-outline"
              }
              size={13}
              color={colors.primary}
            />
            <span className={styles.sortTriggerText}>
              {commentSort === "top" ? "Top" : commentSort === "newest" ? "Newest" : "Oldest"}
            </span>
            <span
              className={`${styles.sortTriggerChevron} ${sortMenuOpen ? styles.sortTriggerChevronRotated : ""}`}
              aria-hidden="true"
            >
              <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
            </span>
          </button>

          {sortMenuOpen && (
            <div className={styles.sortDropdownMenu} role="menu" aria-label="Sort comments options">
              {COMMENT_SORT_OPTIONS.map((opt) => {
                const isSelected = commentSort === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="menuitem"
                    className={`${styles.sortMenuItem} ${isSelected ? styles.sortMenuItemActive : ""}`}
                    onClick={() => {
                      onSortChange(opt.id);
                      setSortMenuOpen(false);
                    }}
                  >
                    <div className={styles.sortMenuItemLeft}>
                      <Ionicons
                        name={opt.icon}
                        size={15}
                        color={isSelected ? colors.primary : colors.textMuted}
                      />
                      <span
                        className={styles.sortMenuItemLabel}
                        style={{ color: isSelected ? colors.primary : "inherit" }}
                      >
                        {opt.label}
                      </span>
                    </div>
                    {isSelected && (
                      <Ionicons name="checkmark" size={15} color={colors.primary} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Comment input / auth prompt */}
      {!user ? (
        <button
          type="button"
          onClick={onRequireLogin}
          className={styles.inlineCommentBarBtn}
        >
          <div className={styles.commentInputRow}>
            <span className={styles.commentPlaceholder}>Add a comment...</span>
            <span className={styles.sendBtn}>
              <Ionicons name="send" size={15} color="#ffffff" />
            </span>
          </div>
        </button>
      ) : (
        <div className={`${styles.inlineCommentBar} ${newComment.length >= 1000 ? styles.commentBarError : ""}`}>
          {replyTo && (
            <div className={styles.replyBanner}>
              <Ionicons name="return-down-forward-outline" size={13} color={colors.primary} />
              <span className={styles.replyBannerText}>
                Replying to <strong>{replyTo.author}</strong>
              </span>
              <button
                type="button"
                className={styles.replyCloseBtn}
                aria-label="Cancel reply"
                onClick={() => {
                  if (replyTo.isNested) setNewComment("");
                  setReplyTo(null);
                }}
              >
                <Ionicons name="close" size={14} color={colors.textMuted} />
              </button>
            </div>
          )}

          <div className={styles.commentInputRow}>
            <textarea
              ref={commentInputRef}
              rows={1}
              maxLength={1000}
              className={styles.commentTextInput}
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value.slice(0, 1000))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
            />
            <button
              type="button"
              disabled={submittingComment || newComment.trim().length < 2 || newComment.length > 1000}
              onClick={() => void handleSubmit()}
              className={styles.sendBtn}
              aria-label="Send comment"
            >
              <Ionicons name="send" size={15} color="#ffffff" />
            </button>
          </div>

          {newComment.length >= 1000 && (
            <div className={styles.commentLimitIndicator}>
              1000/1000
            </div>
          )}
        </div>
      )}

      {/* Comments list */}
      {topLevelComments.length === 0 ? (
        <div className={styles.noComments}>
          <span className={styles.noCommentsIcon}>
            <Ionicons name="chatbubble-outline" size={36} color={colors.textMuted} />
          </span>
          <p className={styles.noCommentsText}>No comments yet</p>
          <p className={styles.noCommentsSubtext}>Be the first to share your thoughts</p>
        </div>
      ) : (
        <div className={styles.commentsThreadList}>
          {topLevelComments.map((comment) => {
            const descendants = getAllDescendants(comment.id);
            const replyCount = descendants.length;
            const isExpanded = Boolean(expandedReplies[comment.id]);
            const showCount = visibleRepliesCount[comment.id] || REPLIES_PER_PAGE;
            const visibleReplies = descendants.slice(0, showCount);
            const hasMoreReplies = replyCount > showCount;

            const username = comment.userUsername || "U";
            const avatarInitial = username.replace(/^@/, "").charAt(0).toUpperCase() || "U";
            const [gradStart, gradEnd] = getInitialColor(username);

            const commentPhoto =
              user?.id && comment.userId === user.id
                ? (currentActiveUserAvatar || comment.userPhotoURL)
                : comment.userPhotoURL;

            return (
              <div key={comment.id} className={styles.commentThreadBlock}>
                <div className={styles.commentRow}>
                  <div className={styles.avatarColumn}>
                    <div
                      className={styles.commentAvatar}
                      style={{
                        background: `linear-gradient(135deg, ${gradStart}, ${gradEnd})`,
                      }}
                    >
                      {commentPhoto ? (
                        <img
                          src={commentPhoto}
                          alt={username}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                            if ((e.target as HTMLElement).nextElementSibling) {
                              ((e.target as HTMLElement).nextElementSibling as HTMLElement).style.display = "inline";
                            }
                          }}
                          className={styles.commentAvatarImg}
                        />
                      ) : null}
                      <span style={{ display: commentPhoto ? "none" : "inline" }}>{avatarInitial}</span>
                    </div>
                    {replyCount > 0 && isExpanded && <div className={styles.threadStem} />}
                  </div>

                  {renderCommentBody(comment, false)}
                </div>

                {replyCount > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedReplies((prev) => ({
                        ...prev,
                        [comment.id]: !prev[comment.id],
                      }))
                    }
                    className={styles.repliesToggle}
                  >
                    <span className={styles.toggleConnector} />
                    <span className={styles.repliesToggleInner}>
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={11}
                        color={colors.primary}
                      />
                      <span>
                        {isExpanded
                          ? "Hide replies"
                          : `${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
                      </span>
                    </span>
                  </button>
                )}

                {isExpanded && (
                  <div className={styles.repliesWrapper}>
                    {visibleReplies.map((reply, idx) => {
                      const isLast = idx === visibleReplies.length - 1 && !hasMoreReplies;
                      const rUser = reply.userUsername || "U";
                      const rInitial = rUser.replace(/^@/, "").charAt(0).toUpperCase() || "U";
                      const [rGradStart, rGradEnd] = getInitialColor(rUser);

                      const replyPhoto =
                        user?.id && reply.userId === user.id
                          ? (currentActiveUserAvatar || reply.userPhotoURL)
                          : reply.userPhotoURL;

                      return (
                        <div key={reply.id} className={styles.replyThreadRow}>
                          <div className={styles.replyConnectorCol}>
                            {!isLast && <div className={styles.replyVertLine} />}
                            <div className={styles.replyElbow}>
                              <div className={styles.elbowV} />
                              <div className={styles.elbowH} />
                            </div>
                          </div>

                          <div className={styles.replyCommentRow}>
                            <div
                              className={`${styles.commentAvatar} ${styles.commentAvatarReply}`}
                              style={{
                                background: `linear-gradient(135deg, ${rGradStart}, ${rGradEnd})`,
                              }}
                            >
                              {replyPhoto ? (
                                <img
                                  src={replyPhoto}
                                  alt={rUser}
                                  referrerPolicy="no-referrer"
                                  crossOrigin="anonymous"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                    if ((e.target as HTMLElement).nextElementSibling) {
                                      ((e.target as HTMLElement).nextElementSibling as HTMLElement).style.display = "inline";
                                    }
                                  }}
                                  className={styles.commentAvatarImg}
                                />
                              ) : null}
                              <span style={{ display: replyPhoto ? "none" : "inline" }}>{rInitial}</span>
                            </div>
                            {renderCommentBody(reply, true)}
                          </div>
                        </div>
                      );
                    })}

                    {hasMoreReplies && (
                      <button
                        type="button"
                        onClick={() =>
                          setVisibleRepliesCount((prev) => ({
                            ...prev,
                            [comment.id]: (prev[comment.id] || REPLIES_PER_PAGE) + REPLIES_PER_PAGE,
                          }))
                        }
                        className={styles.showMoreRepliesBtn}
                      >
                        <Ionicons
                          name="arrow-down-circle-outline"
                          size={14}
                          color={colors.primary}
                        />
                        <span>
                          Show {replyCount - showCount} more{" "}
                          {replyCount - showCount === 1 ? "reply" : "replies"}
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
