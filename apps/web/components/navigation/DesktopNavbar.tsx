"use client";

// ─── Desktop & Tablet Top Navigation Bar ────────────────────────────────────
// Eye-catching, pixel-aligned top navigation bar for Tablet & Desktop (>= 640px)
// Seamless background when at top, soft blurred background when content scrolls.
// Navigation items: Home | Scan | Profile
// Right controls: Theme Toggle (Dark / Light) with hydration safety

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import { useTheme } from "@/lib/theme-context";
import styles from "./DesktopNavbar.module.css";

export function DesktopNavbar() {
  const pathname = usePathname();
  const { isDark, toggleTheme } = useTheme();
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

        {/* Center: Navigation Links — Home, Scan, Profile */}
        <nav className={styles.navLinks} aria-label="Primary navigation">
          <Link
            href="/"
            className={`${styles.navItem} ${isHome ? styles.navItemActive : ""}`}
            aria-current={isHome ? "page" : undefined}
          >
            <Ionicons
              name={isHome ? "home" : "home-outline"}
              size={16}
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
              size={16}
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
              size={16}
              color="currentColor"
            />
            <span>Profile</span>
          </Link>
        </nav>

        {/* Right: Theme Toggle with hydration mismatch protection */}
        <div className={styles.navRight}>
          <button
            type="button"
            onClick={toggleTheme}
            className={styles.themeBtn}
            title={mounted ? (isDark ? "Switch to light theme" : "Switch to dark theme") : "Toggle theme"}
            aria-label={mounted ? (isDark ? "Switch to light theme" : "Switch to dark theme") : "Toggle theme"}
            suppressHydrationWarning
          >
            <Ionicons
              name={mounted && isDark ? "sunny-outline" : "moon-outline"}
              size={18}
              color="currentColor"
            />
          </button>
        </div>
      </div>
    </header>
  );
}
