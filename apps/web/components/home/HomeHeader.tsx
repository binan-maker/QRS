"use client";

import React from "react";
import Link from "next/link";
import Colors from "@shared/constants/colors";
import { Ionicons } from "@/lib/mobile-icons";
import { useAuth } from "@/lib/auth-context";
import { useAvatar, isUserUploadedPhoto } from "@/lib/avatar-context";
import { useTheme } from "@/lib/theme-context";
import { UserAvatar } from "@/components/avatar/UserAvatar";
import styles from "@/app/home.module.css";

export function HomeHeader() {
  const { user } = useAuth();
  const { cachedUrl, avatarUrl } = useAvatar();
  const { colors } = useTheme();

  const displayName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "";
  const firstName = displayName.trim().split(/\s+/)[0] || "";

  const localCustom =
    typeof window !== "undefined" && user?.id
      ? localStorage.getItem(`user_custom_avatar_${user.id}`) ||
        localStorage.getItem(`user_avatar_${user.id}`)
      : null;

  // Prioritize user's uploaded avatar over provider default avatar
  const photoURL =
    (cachedUrl && isUserUploadedPhoto(cachedUrl) ? cachedUrl : null) ||
    (avatarUrl && isUserUploadedPhoto(avatarUrl) ? avatarUrl : null) ||
    (localCustom && isUserUploadedPhoto(localCustom) ? localCustom : null) ||
    user?.user_metadata?.custom_avatar_url ||
    cachedUrl ||
    avatarUrl ||
    localCustom ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    user?.user_metadata?.photo_url ||
    user?.user_metadata?.photoURL ||
    null;

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        {user ? (
          <h1 className={styles.greeting}>
            {"👋 Hey, "}
            <span className={styles.greetingHighlight}>
              {firstName.length > 14 ? `${firstName.slice(0, 12)}…` : firstName}
            </span>
          </h1>
        ) : (
          <h1 className={styles.greeting}>Welcome</h1>
        )}
      </div>

      <div className={styles.headerRight}>
        {user ? (
          <Link
            href="/profile"
            title={`View Profile (${displayName})`}
            style={{ textDecoration: "none", display: "inline-flex" }}
          >
            <UserAvatar
              src={photoURL}
              name={displayName || firstName}
              size={44}
              showRing={true}
            />
          </Link>
        ) : (
          <Link href="/login" className={styles.signInPill}>
            <Ionicons name="log-in-outline" size={16} color={colors.primary} />
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </header>
  );
}
