"use client";

import React, { useState } from "react";
import { Ionicons } from "@/lib/mobile-icons";
import { useTheme } from "@/lib/theme-context";
import { isPaymentQr, parseAnyPaymentQr } from "@services/analysis";
import styles from "@/app/qr/[code]/qr.module.css";

interface QrContentCardProps {
  content: string;
  contentType: string;
}

export function QrContentCard({
  content,
  contentType,
}: QrContentCardProps) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const cleanContent = content?.trim() || "";
  const isPayment =
    contentType.toLowerCase() === "payment" ||
    isPaymentQr(cleanContent);

  const isPhone =
    !isPayment &&
    (contentType.toLowerCase() === "phone" ||
      contentType.toLowerCase() === "tel" ||
      /^tel:/i.test(cleanContent) ||
      /^\+?[\d\s\-().]{7,20}$/.test(cleanContent));

  const isEmail =
    !isPayment &&
    (contentType.toLowerCase() === "email" ||
      /^mailto:/i.test(cleanContent));

  const isSms =
    !isPayment &&
    (contentType.toLowerCase() === "sms" ||
      /^smsto?:/i.test(cleanContent));

  const isUrl =
    !isPayment &&
    !isPhone &&
    !isEmail &&
    !isSms &&
    (contentType.toLowerCase() === "url" ||
      /^https?:\/\//i.test(cleanContent) ||
      (/^[a-z0-9-]+(\.[a-z0-9-]+)+\/?/i.test(cleanContent) && !cleanContent.includes(" ")));

  const handleCopy = async (valueToCopy: string) => {
    try {
      await navigator.clipboard.writeText(valueToCopy);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  // ── 0. Payment Card (clean card + Copy button only) ──
  if (isPayment) {
    const parsed = parseAnyPaymentQr(cleanContent);
    const recipientAddress = parsed?.vpa || parsed?.recipientId || cleanContent;
    const headerTitle = parsed?.recipientName || recipientAddress || "Content";

    const stripParts: string[] = [recipientAddress];
    if (parsed?.isAmountPreFilled && parsed.amount) {
      const amt = parseFloat(parsed.amount);
      if (!isNaN(amt)) {
        stripParts.push(
          parsed.currency
            ? `${parsed.currency} ${amt.toLocaleString()}`
            : `${amt.toLocaleString()}`
        );
      } else {
        stripParts.push(
          `${parsed.currency ? parsed.currency + " " : ""}${parsed.amount}`
        );
      }
    }
    if (parsed?.note) stripParts.push(parsed.note);
    const stripText = stripParts.join(" • ");

    return (
      <section className={styles.contentCard} aria-label="QR content">
        <div className={styles.contentCardRow}>
          <strong className={styles.domainTitle} title={headerTitle}>
            {headerTitle}
          </strong>
          <button
            type="button"
            onClick={() => void handleCopy(recipientAddress)}
            className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ""}`}
            aria-label="Copy ID"
          >
            <Ionicons
              name={copied ? "checkmark-circle" : "copy-outline"}
              size={14}
              color={copied ? colors.safe : colors.textMuted}
            />
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>

        <div className={styles.urlStrip} title={stripText}>
          <span>{stripText}</span>
        </div>
      </section>
    );
  }

  // ── 1. Phone Card (clean card + Copy button only) ──
  if (isPhone) {
    const rawNumber = cleanContent.replace(/^tel:/i, "").trim();
    return (
      <section className={styles.contentCard} aria-label="Phone number">
        <div className={styles.contentCardRow}>
          <strong className={styles.domainTitle} title={rawNumber}>
            {rawNumber}
          </strong>
          <button
            type="button"
            onClick={() => void handleCopy(rawNumber)}
            className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ""}`}
            aria-label="Copy phone number"
          >
            <Ionicons
              name={copied ? "checkmark-circle" : "copy-outline"}
              size={14}
              color={copied ? colors.safe : colors.textMuted}
            />
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>

        <div className={styles.urlStrip} title={rawNumber}>
          <span>{rawNumber}</span>
        </div>
      </section>
    );
  }

  // ── 2. Website Card ──
  if (isUrl) {
    let hostname = cleanContent;
    let fullUrl = cleanContent;
    try {
      const urlObj = new URL(
        cleanContent.startsWith("http") ? cleanContent : `https://${cleanContent}`
      );
      hostname = urlObj.hostname;
      fullUrl = urlObj.href;
    } catch {}

    return (
      <section className={styles.contentCard} aria-label="Website destination">
        <div className={styles.contentCardRow}>
          <strong className={styles.domainTitle} title={hostname}>
            {hostname}
          </strong>
          <button
            type="button"
            onClick={() => void handleCopy(fullUrl)}
            className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ""}`}
            aria-label="Copy link"
          >
            <Ionicons
              name={copied ? "checkmark-circle" : "copy-outline"}
              size={14}
              color={copied ? colors.safe : colors.textMuted}
            />
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>

        <div className={styles.urlStrip} title={fullUrl}>
          <span>{fullUrl}</span>
        </div>

        <a
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.openBtn}
        >
          <span>Open</span>
          <Ionicons name="open-outline" size={14} color={colors.primary} />
        </a>
      </section>
    );
  }

  // ── 3. Email Card (clean card + Copy button only) ──
  if (isEmail) {
    const emailAddress = cleanContent.replace(/^mailto:/i, "").split("?")[0].trim() || cleanContent;
    return (
      <section className={styles.contentCard} aria-label="Email address">
        <div className={styles.contentCardRow}>
          <strong className={styles.domainTitle} title={emailAddress}>
            {emailAddress}
          </strong>
          <button
            type="button"
            onClick={() => void handleCopy(emailAddress)}
            className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ""}`}
            aria-label="Copy email address"
          >
            <Ionicons
              name={copied ? "checkmark-circle" : "copy-outline"}
              size={14}
              color={copied ? colors.safe : colors.textMuted}
            />
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>

        <div className={styles.urlStrip} title={emailAddress}>
          <span>{emailAddress}</span>
        </div>
      </section>
    );
  }

  // ── 4. SMS Card (clean card + Copy button only) ──
  if (isSms) {
    const smsTarget = cleanContent.replace(/^smsto?:/i, "").trim() || cleanContent;
    return (
      <section className={styles.contentCard} aria-label="SMS content">
        <div className={styles.contentCardRow}>
          <strong className={styles.domainTitle} title={smsTarget}>
            {smsTarget}
          </strong>
          <button
            type="button"
            onClick={() => void handleCopy(smsTarget)}
            className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ""}`}
            aria-label="Copy SMS content"
          >
            <Ionicons
              name={copied ? "checkmark-circle" : "copy-outline"}
              size={14}
              color={copied ? colors.safe : colors.textMuted}
            />
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>

        <div className={styles.urlStrip} title={smsTarget}>
          <span>{smsTarget}</span>
        </div>
      </section>
    );
  }

  // ── 5. Text Card ──
  const isLong = cleanContent.length > 120 || cleanContent.includes("\n");
  return (
    <section className={styles.contentCard} aria-label="Text content">
      <div className={styles.contentCardRow}>
        <strong className={styles.domainTitle}>Text</strong>
        <button
          type="button"
          onClick={() => void handleCopy(cleanContent)}
          className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ""}`}
          aria-label="Copy text content"
        >
          <Ionicons
            name={copied ? "checkmark-circle" : "copy-outline"}
            size={14}
            color={copied ? colors.safe : colors.textMuted}
          />
          <span>{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>

      <div className={styles.rawBox}>
        <p className={`${styles.rawText} ${!expanded && isLong ? styles.rawTextClamped : ""}`}>
          {cleanContent}
        </p>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={styles.expandBtn}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    </section>
  );
}
