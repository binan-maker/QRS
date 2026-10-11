"use client";

// ─── Desktop & Tablet Top Navigation Bar ────────────────────────────────────
// Eye-catching, pixel-aligned top navigation bar for Tablet & Desktop (>= 640px)
// Seamless background when at top, soft blurred background when content scrolls.
// Navigation items: Home | Scan | Profile
// Right controls: Theme Toggle (Dark / Light) with hydration safety

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useAvatar, isUserUploadedPhoto } from "@/lib/avatar-context";
import { UserAvatar } from "@/components/avatar/UserAvatar";
import styles from "./DesktopNavbar.module.css";

export function DesktopNavbar() {
  const pathname = usePathname();
  const { user, profile, loading: authLoading } = useAuth();
  const { cachedUrl, avatarUrl } = useAvatar();
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      const isScrolled = window.scrollY > 8;
      setScrolled((prev) => (prev !== isScrolled ? isScrolled : prev));
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Only display the top navigation bar on Home ("/") and Profile ("/profile")
  const isHome = pathname === "/";
  const isProfile = pathname === "/profile" || pathname.startsWith("/profile");

  if (!isHome && !isProfile) {
    return null;
  }

  const isScan = pathname === "/scanner";

  const displayName =
    profile?.displayName ||
    profile?.username ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "";
  const firstName = displayName.trim().split(/\s+/)[0] || "";

  const localCustom =
    mounted && typeof window !== "undefined" && user?.id
      ? localStorage.getItem(`user_custom_avatar_${user.id}`) ||
        localStorage.getItem(`user_avatar_${user.id}`)
      : null;

  // Prioritize user's uploaded avatar over provider default avatar
  const photoURL =
    (profile?.photoUrl && isUserUploadedPhoto(profile.photoUrl) ? profile.photoUrl : null) ||
    (cachedUrl && isUserUploadedPhoto(cachedUrl) ? cachedUrl : null) ||
    (avatarUrl && isUserUploadedPhoto(avatarUrl) ? avatarUrl : null) ||
    (localCustom && isUserUploadedPhoto(localCustom) ? localCustom : null) ||
    profile?.photoUrl ||
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
    <header
      className={`${styles.navbar} ${scrolled ? styles.navbarScrolled : ""}`}
      aria-label="Desktop navigation"
    >
      <div className={styles.navContainer}>
        {/* Left: Official BinRo Logo + Eye-Catching Brand typography */}
        <Link href="/" className={styles.brandLink} aria-label="BinRo Home">
          <img
            src="/icon1.png"
            alt="BinRo Logo"
            width={32}
            height={32}
            className={styles.brandLogoImg}
          />
          <span className={styles.brandText}>
            Bin<span className={styles.brandAccent}>Ro</span>
          </span>
        </Link>

        {/* Center: Flat surface Navigation Links — Home, Scan, Profile (Text Only) */}
        <nav className={styles.navLinks} aria-label="Primary navigation">
          <Link
            href="/"
            className={`${styles.navItem} ${isHome ? styles.navItemActive : ""}`}
            aria-current={isHome ? "page" : undefined}
          >
            Home
          </Link>

          <Link
            href="/scanner"
            className={`${styles.navItem} ${isScan ? styles.navItemActive : ""}`}
            aria-current={isScan ? "page" : undefined}
          >
            Scan
          </Link>

          <Link
            href="/profile"
            className={`${styles.navItem} ${isProfile ? styles.navItemActive : ""}`}
            aria-current={isProfile ? "page" : undefined}
          >
            Profile
          </Link>
        </nav>

        {/* Right: User Avatar / Sign In */}
        <div className={styles.navRight}>
          {authLoading ? (
            <div className={styles.avatarSkeleton} aria-hidden="true" />
          ) : user ? (
            <Link
              href="/profile"
              title={`View Profile (${displayName || "Profile"})`}
              className={styles.avatarLink}
            >
              <UserAvatar
                src={photoURL}
                name={displayName || firstName}
                size={36}
                showRing={true}
              />
            </Link>
          ) : (
            <Link href="/login" className={styles.signInBtn}>
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
