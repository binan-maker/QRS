"use client";

// ─── Desktop & Tablet Top Navigation Bar ────────────────────────────────────
// iPhone-style glassmorphism top navigation bar for Tablet & Desktop (>= 640px)
// Navigation items: Home | Scan | Profile
// Right controls: Theme Toggle only (Dark / Light)

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import { useTheme } from "@/lib/theme-context";
import styles from "./DesktopNavbar.module.css";

export function DesktopNavbar() {
  const pathname = usePathname();
  const { isDark, toggleTheme } = useTheme();

  // On the camera scanner page, the camera is full-screen and has its own overlay bar
  if (pathname === "/scanner") {
    return null;
  }

  const isHome = pathname === "/";
  const isScan = pathname === "/scanner";
  const isProfile = pathname.startsWith("/profile");

  return (
    <header className={styles.navbar} aria-label="Desktop navigation">
      <div className={styles.navContainer}>
        {/* Left: Official BinRo Logo + Brand name (No "Web" badge) */}
        <Link href="/" className={styles.brandLink} aria-label="BinRo Home">
          <img
            src="/icon1.png"
            alt="BinRo Logo"
            width={34}
            height={34}
            className={styles.brandLogoImg}
          />
          <span className={styles.brandText}>BinRo</span>
        </Link>

        {/* Center: Navigation Links — ONLY Home, Scan, Profile */}
        <nav className={styles.navLinks} aria-label="Primary navigation">
          <Link
            href="/"
            className={`${styles.navItem} ${isHome ? styles.navItemActive : ""}`}
            aria-current={isHome ? "page" : undefined}
          >
            <Ionicons
              name={isHome ? "home" : "home-outline"}
              size={17}
              color="currentColor"
            />
            <span>Home</span>
          </Link>

          <Link
            href="/scanner"
            className={`${styles.navItem} ${isScan ? styles.navItemActive : ""}`}
            aria-current={isScan ? "page" : undefined}
          >
            <Ionicons
              name={isScan ? "scan" : "scan-outline"}
              size={17}
              color="currentColor"
            />
            <span>Scan</span>
          </Link>

          <Link
            href="/profile"
            className={`${styles.navItem} ${isProfile ? styles.navItemActive : ""}`}
            aria-current={isProfile ? "page" : undefined}
          >
            <Ionicons
              name={isProfile ? "person" : "person-outline"}
              size={17}
              color="currentColor"
            />
            <span>Profile</span>
          </Link>
        </nav>

        {/* Right: Theme Toggle Only (No profile avatar or username) */}
        <div className={styles.navRight}>
          <button
            type="button"
            onClick={toggleTheme}
            className={styles.themeBtn}
            title={isDark ? "Switch to light theme" : "Switch to dark theme"}
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
          >
            <Ionicons
              name={isDark ? "sunny-outline" : "moon-outline"}
              size={18}
              color="currentColor"
            />
          </button>
        </div>
      </div>
    </header>
  );
}
