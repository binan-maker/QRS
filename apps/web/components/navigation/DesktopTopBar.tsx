"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import { useAuth } from "@/lib/auth-context";
import { useAvatar, isUserUploadedPhoto } from "@/lib/avatar-context";
import { UserAvatar } from "@/components/avatar/UserAvatar";
import styles from "./DesktopTopBar.module.css";

export function DesktopTopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { user, profile, signOut } = useAuth();
  const { cachedUrl, avatarUrl } = useAvatar();

  const [menuOpen, setMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  // Close profile menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Derive User Display Name
  const displayName = useMemo(() => {
    return (
      profile?.displayName ||
      profile?.username ||
      user?.user_metadata?.display_name ||
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      "User"
    );
  }, [profile, user]);

  const firstName = useMemo(() => {
    return displayName.trim().split(/\s+/)[0] || "User";
  }, [displayName]);

  const username = useMemo(() => {
    return profile?.username || user?.user_metadata?.username || user?.email?.split("@")[0] || "";
  }, [profile, user]);

  const photoURL = useMemo(() => {
    return (
      (profile?.photoUrl && isUserUploadedPhoto(profile.photoUrl) ? profile.photoUrl : null) ||
      (cachedUrl && isUserUploadedPhoto(cachedUrl) ? cachedUrl : null) ||
      (avatarUrl && isUserUploadedPhoto(avatarUrl) ? avatarUrl : null) ||
      profile?.photoUrl ||
      user?.user_metadata?.custom_avatar_url ||
      cachedUrl ||
      avatarUrl ||
      user?.user_metadata?.avatar_url ||
      user?.user_metadata?.picture ||
      user?.user_metadata?.photo_url ||
      null
    );
  }, [profile, cachedUrl, avatarUrl, user]);

  const hasControls = Boolean(user || isHome);
  if (!hasControls) {
    return null;
  }

  return (
    <header className={styles.topBar} role="banner">
      {/* ── Left side (empty, no second hamburger button) ── */}
      <div className={styles.leftSection} />

      {/* ── Right: User Profile Pill with Name (Image 3) ── */}
      <div className={styles.rightControls}>
        {user ? (
          <div className={styles.profilePillWrapper} ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className={styles.profilePill}
              aria-expanded={menuOpen}
              aria-label={`User menu for ${firstName}`}
            >
              <UserAvatar
                src={photoURL}
                name={displayName || firstName}
                size={34}
                showRing={true}
              />
              <span className={styles.userName}>{firstName}</span>
              <span
                className={`${styles.chevronIcon} ${menuOpen ? styles.chevronOpen : ""}`}
              >
                <Ionicons name="chevron-down" size={14} />
              </span>
            </button>

            {menuOpen && (
              <div className={styles.profileMenu}>
                <div className={styles.menuHeader}>
                  <div className={styles.menuName}>{displayName}</div>
                  {username && <div className={styles.menuHandle}>@{username}</div>}
                </div>

                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className={styles.menuItem}
                >
                  <Ionicons name="person-outline" size={16} />
                  <span>My Profile</span>
                </Link>

                <Link
                  href="/history"
                  onClick={() => setMenuOpen(false)}
                  className={styles.menuItem}
                >
                  <Ionicons name="time-outline" size={16} />
                  <span>Scan History</span>
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className={styles.menuItem}
                >
                  <Ionicons name="settings-outline" size={16} />
                  <span>Settings</span>
                </Link>

                <div className={styles.menuDivider} />

                <button
                  type="button"
                  onClick={async () => {
                    setMenuOpen(false);
                    await signOut();
                    router.push("/");
                  }}
                  className={`${styles.menuItem} ${styles.menuItemDanger}`}
                >
                  <Ionicons name="log-out-outline" size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : isHome ? (
          <Link href="/login" className={styles.signInBtn}>
            Sign In
          </Link>
        ) : null}
      </div>
    </header>
  );
}
