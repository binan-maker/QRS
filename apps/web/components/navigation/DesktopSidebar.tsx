"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import { useTheme } from "@/lib/theme-context";
import { useSidebar } from "@/contexts";
import styles from "./DesktopSidebar.module.css";

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  activeIcon: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "home",
    label: "Home",
    href: "/",
    icon: "home-outline",
    activeIcon: "home",
  },
  {
    id: "scan",
    label: "Scan",
    href: "/scanner",
    icon: "scan-outline",
    activeIcon: "scan",
  },
  {
    id: "profile",
    label: "Profile",
    href: "/profile",
    icon: "person-outline",
    activeIcon: "person",
  },
  {
    id: "history",
    label: "History",
    href: "/history",
    icon: "time-outline",
    activeIcon: "time",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: "settings-outline",
    activeIcon: "settings",
  },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  const { colors } = useTheme();
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <aside
      className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ""}`}
      aria-label="Desktop navigation sidebar"
      aria-hidden={isCollapsed}
    >
      <div className={styles.topSection}>
        {/* Header Row: BinRo Brand + ChatGPT-style Hamburger collapse button */}
        <div className={styles.headerRow}>
          <Link href="/" className={styles.brandLink} aria-label="BinRo Home">
            <div className={styles.brandIconWrap}>
              <img
                src="/icon1.png"
                alt="BinRo Logo"
                width={28}
                height={28}
                className={styles.brandLogoImg}
              />
            </div>
            <span className={styles.brandTitle}>
              Bin<span className={styles.brandAccent}>Ro</span>
            </span>
          </Link>

          <button
            type="button"
            onClick={toggleSidebar}
            className={styles.collapseBtn}
            aria-label="Collapse sidebar"
            title="Close sidebar"
          >
            <Ionicons name="menu-outline" size={20} />
          </button>
        </div>

        {/* Navigation list matching Image 2 */}
        <nav aria-label="Main navigation">
          <ul className={styles.navList}>
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className={styles.navIconWrap}>
                      <Ionicons
                        name={(isActive ? item.activeIcon : item.icon) as any}
                        size={20}
                        color={isActive ? colors.primary : colors.textSecondary}
                      />
                    </span>
                    <span className={styles.navLabel}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Bottom section with slogan & accent bar (matching Image 2) */}
      <div className={styles.bottomSection}>
        <div className={styles.bottomBrandRow}>
          <img
            src="/icon1.png"
            alt="BinRo"
            width={20}
            height={20}
            className={styles.bottomLogoImg}
          />
          <span className={styles.bottomBrandName}>
            Bin<span style={{ color: colors.primary }}>Ro</span>
          </span>
        </div>
        <p className={styles.bottomTagline}>
          Scan Smarter.
          <br />
          Stay Safer.
        </p>
        <div className={styles.bottomAccentLine} />
      </div>
    </aside>
  );
}
