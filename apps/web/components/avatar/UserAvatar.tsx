"use client";

import React, { useState, useEffect } from "react";
import styles from "./UserAvatar.module.css";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  showRing?: boolean;
  className?: string;
  onClick?: () => void;
  alt?: string;
}

export function UserAvatar({
  src,
  name,
  size = 40,
  showRing = false,
  className = "",
  onClick,
  alt = "User avatar",
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  // Reset error when src changes
  useEffect(() => {
    setImgError(false);
  }, [src]);

  // Compute initials
  const cleanName = (name || "").trim();
  const initials = cleanName
    ? cleanName
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p.charAt(0).toUpperCase())
        .join("")
    : "?";

  // When ring is shown, match Profile page outline: 2px border + 2px padding each side = 8px
  const innerSize = showRing ? Math.max(size - 8, 16) : size;
  const fontSize = Math.max(Math.round(innerSize * 0.44), 11);

  const cleanSrc = (src || "").trim();

  const innerContent = (
    <div
      className={styles.avatarInner}
      style={{
        width: `${innerSize}px`,
        height: `${innerSize}px`,
        borderRadius: `${innerSize / 2}px`,
        backgroundColor: "var(--surface-light)",
      }}
    >
      {cleanSrc && !imgError ? (
        <img
          src={cleanSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={styles.avatarImg}
        />
      ) : (
        <span
          className={styles.avatarInitial}
          style={{ fontSize: `${fontSize}px` }}
        >
          {initials}
        </span>
      )}
    </div>
  );

  if (showRing) {
    return (
      <div
        className={`${styles.avatarRing} ${className}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${size / 2}px`,
        }}
        onClick={onClick}
        role={onClick ? "button" : undefined}
      >
        {innerContent}
      </div>
    );
  }

  return (
    <div
      className={`${styles.avatarWrap} ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${size / 2}px`,
      }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      {innerContent}
    </div>
  );
}
