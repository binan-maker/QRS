"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import styles from "@/app/legal.module.css";

interface LegalBackButtonProps {
  fallbackUrl?: string;
  ariaLabel?: string;
}

export function LegalBackButton({
  fallbackUrl = "/settings",
  ariaLabel = "Go back",
}: LegalBackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackUrl);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={styles.backBtn}
      aria-label={ariaLabel}
    >
      <Ionicons name="chevron-back" size={20} />
    </button>
  );
}
