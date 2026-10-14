"use client";

import React from "react";
import { Ionicons } from "@/lib/mobile-icons";
import { useTheme } from "@/lib/theme-context";
import type { WebQrComment } from "@/lib/qr-client";
import styles from "@/app/qr/[code]/qr.module.css";

interface CommentMenuSheetProps {
  commentMenu: { comment: WebQrComment; isOwner: boolean } | null;
  onClose: () => void;
  onDelete: (commentId: string) => void;
  onReport: (comment: WebQrComment) => void;
}

export function CommentMenuSheet({
  commentMenu,
  onClose,
  onDelete,
  onReport,
}: CommentMenuSheetProps) {
  const { colors } = useTheme();

  if (!commentMenu) return null;

  return (
    <div
      className={styles.sheetBackdrop}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={styles.bottomSheet}
        role="dialog"
        aria-modal="true"
        aria-label="Comment options"
      >
        <div className={styles.sheetHandle} />

        {commentMenu.isOwner ? (
          <button
            type="button"
            className={styles.sheetItem}
            onClick={() => {
              const cid = commentMenu.comment.id;
              onClose();
              onDelete(cid);
            }}
          >
            <span className={styles.sheetIconDanger}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </span>
            <span className={styles.sheetItemCopy}>
              <strong className={styles.dangerText}>Delete comment</strong>
              <small>Remove permanently</small>
            </span>
          </button>
        ) : (
          <button
            type="button"
            className={styles.sheetItem}
            onClick={() => {
              const c = commentMenu.comment;
              onClose();
              onReport(c);
            }}
          >
            <span className={styles.sheetIconDanger}>
              <Ionicons name="flag-outline" size={20} color={colors.danger} />
            </span>
            <span className={styles.sheetItemCopy}>
              <strong className={styles.dangerText}>Report comment</strong>
              <small>Flag as spam, scam, harassment, or abuse</small>
            </span>
          </button>
        )}

        <button
          type="button"
          className={styles.sheetCancelBtn}
          onClick={onClose}
        >
          Cancel
        </button>
      </section>
    </div>
  );
}
