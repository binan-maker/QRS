"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Ionicons } from "@/lib/mobile-icons";
import styles from "./BottomTabBar.module.css";

interface Props {
  activeTab?: "home" | "scan" | "rewards" | "profile";
}

export function BottomTabBar({ activeTab }: Props) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // When on tablet or desktop (>= 640px), the bottom tab bar is completely unmounted
  if (isDesktop) {
    return null;
  }

  return (
    <nav className={styles.tabBar} aria-label="Main navigation">
      <div className={styles.tabBarInner}>
        {/* Home Tab */}
        <Link
          href="/"
          className={`${styles.tabItem} ${activeTab === "home" ? styles.tabItemActive : ""}`}
        >
          <div className={activeTab === "home" ? styles.activeIconWrap : styles.iconWrap}>
            <Ionicons
              name={activeTab === "home" ? "home" : "home-outline"}
              size={22}
              color="currentColor"
            />
          </div>
          <span className={styles.label}>Home</span>
        </Link>

        {/* Scan Tab */}
        <Link
          href="/scanner"
          className={`${styles.tabItem} ${activeTab === "scan" ? styles.tabItemActive : ""}`}
        >
          <div className={activeTab === "scan" ? styles.activeIconWrap : styles.iconWrap}>
            <Ionicons
              name={activeTab === "scan" ? "scan" : "scan-outline"}
              size={22}
              color="currentColor"
            />
          </div>
          <span className={styles.label}>Scan</span>
        </Link>

        {/* Rewards Tab */}
        <Link
          href="/rewards"
          className={`${styles.tabItem} ${activeTab === "rewards" ? styles.tabItemActive : ""}`}
        >
          <div className={activeTab === "rewards" ? styles.activeIconWrap : styles.iconWrap}>
            <Ionicons
              name={activeTab === "rewards" ? "gift" : "gift-outline"}
              size={22}
              color="currentColor"
            />
          </div>
          <span className={styles.label}>Rewards</span>
        </Link>

        {/* Profile Tab */}
        <Link
          href="/profile"
          className={`${styles.tabItem} ${activeTab === "profile" ? styles.tabItemActive : ""}`}
        >
          <div className={activeTab === "profile" ? styles.activeIconWrap : styles.iconWrap}>
            <Ionicons
              name={activeTab === "profile" ? "person" : "person-outline"}
              size={22}
              color="currentColor"
            />
          </div>
          <span className={styles.label}>Profile</span>
        </Link>
      </div>
    </nav>
  );
}
