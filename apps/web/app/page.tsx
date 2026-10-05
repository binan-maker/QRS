"use client";

import React from "react";
import { HomeHeader, HeroScanCard, RecentScans } from "@/components/home";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import styles from "./home.module.css";

export default function HomePage() {
  return (
    <main className={styles.appFrame}>
      <div className={styles.page}>
        <HomeHeader />

        <div className={styles.homeGrid}>
          <HeroScanCard />
          <RecentScans />
        </div>
      </div>

      <BottomTabBar activeTab="home" />
    </main>
  );
}
