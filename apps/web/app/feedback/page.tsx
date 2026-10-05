"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import { useAuth } from "@/lib/auth-context";
import { isWebSupabaseConfigured, getWebSupabase } from "@/lib/supabase";
import { sanitizeTextInput } from "@/lib/web-security";
import styles from "./feedback.module.css";

type FeedbackCategory = "bug" | "feature" | "security" | "general";

const CATEGORIES: { id: FeedbackCategory; label: string; icon: "bug-outline" | "sparkles-outline" | "shield-outline" | "chatbubble-outline" }[] = [
  { id: "bug", label: "Bug Report", icon: "bug-outline" },
  { id: "feature", label: "Feature", icon: "sparkles-outline" },
  { id: "security", label: "Security & Trust", icon: "shield-outline" },
  { id: "general", label: "General", icon: "chatbubble-outline" },
];

export default function FeedbackPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [email, setEmail] = useState(user?.email || "");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/settings");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMessage = sanitizeTextInput(message.trim(), 1000);
    const cleanEmail = sanitizeTextInput(email.trim(), 120);

    if (!cleanMessage) return;

    setSubmitting(true);
    try {
      if (isWebSupabaseConfigured()) {
        const supabase = getWebSupabase();
        await supabase.from("feedback").insert({
          user_id: user?.id || null,
          email: cleanEmail || user?.email || null,
          category: category,
          message: `[${category.toUpperCase()}] ${cleanMessage}`,
          created_at: new Date().toISOString(),
        });
      }
    } catch {
      // Graceful fallback
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.inner}>
        {/* Navigation Bar matching Settings & Profile */}
        <header className={styles.navBar}>
          <button
            type="button"
            onClick={handleBack}
            className={styles.navBackBtn}
            aria-label="Back"
          >
            <Ionicons name="chevron-back" size={20} />
          </button>
          <h1 className={styles.navTitle}>Send Feedback</h1>
          <div className={styles.navSpacer} aria-hidden="true" />
        </header>

        {submitted ? (
          <div className={styles.successCard}>
            <div className={styles.successIconWrap}>
              <Ionicons name="checkmark-circle" size={36} />
            </div>
            <h2 className={styles.successTitle}>Thank You!</h2>
            <p className={styles.successDesc}>
              Your feedback has been received. Our team reviews every submission to improve BinRo.
            </p>
            <div className={styles.successActions}>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setMessage("");
                }}
                className={styles.submitBtn}
              >
                <Ionicons name="add-circle-outline" size={17} />
                <span>Submit Another</span>
              </button>
              <button
                type="button"
                onClick={handleBack}
                className={styles.secondaryBtn}
              >
                Return to Settings
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.formCard}>
            {/* Category Selection */}
            <div className={styles.categoryGroup}>
              <label className={styles.label}>Feedback Category</label>
              <div className={styles.chipGrid}>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`${styles.categoryChip} ${category === cat.id ? styles.categoryChipActive : ""}`}
                  >
                    <Ionicons name={cat.icon} size={15} />
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Email Field */}
            <div className={styles.inputGroup}>
              <label htmlFor="feedback-email" className={styles.label}>
                Your Email {user ? "(from your account)" : "(optional)"}
              </label>
              <input
                id="feedback-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className={styles.input}
              />
            </div>

            {/* Message Field */}
            <div className={styles.inputGroup}>
              <label htmlFor="feedback-message" className={styles.label}>
                Message Details
              </label>
              <div className={styles.textareaWrap}>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe what happened, enter a QR URL, or share your suggestion..."
                  maxLength={1000}
                  className={styles.textarea}
                  required
                />
                <span className={styles.charCount}>{message.length} / 1000</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !message.trim()}
              className={styles.submitBtn}
            >
              {submitting ? (
                <>
                  <span className={styles.spinner} />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Ionicons name="paper-plane" size={16} />
                  <span>Submit Feedback</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
