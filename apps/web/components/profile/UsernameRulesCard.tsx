"use client";

import React, { useState } from "react";
import { Ionicons } from "@/lib/mobile-icons";
import {
  USERNAME_RULES_LIST,
  getRemainingUsernameCooldownDays,
  canUserChangeUsername,
} from "@shared/utils/username-rules";

interface Props {
  currentUsername: string | null;
  canChangeUsername?: boolean;
  daysUntilUsernameChange?: number;
  lastChangedAt?: Date | string | null;
  onEditPress?: () => void;
  candidateInput?: string;
  isEditing?: boolean;
}

export default function UsernameRulesCard({
  currentUsername,
  canChangeUsername: canChangeProp,
  daysUntilUsernameChange: daysLeftProp,
  lastChangedAt,
  onEditPress,
  candidateInput,
  isEditing,
}: Props) {
  const [expanded, setExpanded] = useState(true);

  const daysUntilUsernameChange =
    daysLeftProp !== undefined
      ? daysLeftProp
      : getRemainingUsernameCooldownDays(lastChangedAt);

  const canChangeUsername =
    canChangeProp !== undefined
      ? canChangeProp
      : canUserChangeUsername(lastChangedAt);

  const formattedDate = lastChangedAt
    ? new Date(lastChangedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="ur-card">
      <style>{`
        .ur-card {
          border-radius: 16px;
          border: 1px solid var(--surface-border);
          background-color: var(--surface);
          overflow: hidden;
          margin-bottom: 20px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
          transition: border-color 0.2s ease;
        }
        .ur-card-header {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          background: transparent;
          border: none;
          width: 100%;
          cursor: pointer;
          text-align: left;
          gap: 12px;
        }
        .ur-header-title-row {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 10px;
          flex: 1;
        }
        .ur-icon-wrap {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background-color: var(--primary-dim);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ur-header-text-col {
          display: flex;
          flex-direction: column;
        }
        .ur-card-title {
          font-family: var(--font-inter), "Inter", sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: var(--text);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .ur-card-subtitle {
          font-family: var(--font-inter), "Inter", sans-serif;
          font-size: 11.5px;
          color: var(--text-muted);
          margin: 1px 0 0;
        }
        .ur-header-right {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 8px;
        }
        .ur-status-pill {
          display: inline-flex;
          flex-direction: row;
          align-items: center;
          gap: 5px;
          padding: 3.5px 8px;
          border-radius: 100px;
          font-family: var(--font-inter), "Inter", sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.2px;
        }
        .ur-status-pill-safe {
          background-color: var(--safe-dim);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: var(--safe);
        }
        .ur-status-pill-warning {
          background-color: var(--warning-dim);
          border: 1px solid rgba(245, 158, 11, 0.25);
          color: var(--warning);
        }
        .ur-content-wrap {
          padding: 0 16px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          border-top: 1px solid var(--surface-border);
          padding-top: 14px;
        }
        .ur-status-banner {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid;
        }
        .ur-status-banner-safe {
          background-color: var(--safe-dim);
          border-color: rgba(16, 185, 129, 0.2);
        }
        .ur-status-banner-warning {
          background-color: var(--surface-light);
          border-color: var(--surface-border);
        }
        .ur-status-banner-title {
          font-family: var(--font-inter), "Inter", sans-serif;
          font-size: 12.5px;
          font-weight: 700;
          margin: 0;
        }
        .ur-status-banner-sub {
          font-family: var(--font-inter), "Inter", sans-serif;
          font-size: 11.5px;
          color: var(--text-muted);
          margin: 2px 0 0;
          line-height: 1.45;
        }
        .ur-rules-list {
          display: flex;
          flex-direction: column;
          background-color: var(--surface-light);
          border: 1px solid var(--surface-border);
          border-radius: 12px;
          overflow: hidden;
        }
        .ur-rule-row {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 12px;
          border-bottom: 1px solid var(--surface-border);
        }
        .ur-rule-row:last-child {
          border-bottom: none;
        }
        .ur-rule-icon-circle {
          width: 26px;
          height: 26px;
          border-radius: 13px;
          background-color: var(--surface);
          border: 1px solid var(--surface-border);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .ur-rule-icon-valid {
          color: var(--safe);
          border-color: rgba(16, 185, 129, 0.3);
        }
        .ur-rule-icon-muted {
          color: var(--text-muted);
        }
        .ur-rule-text-container {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .ur-rule-title {
          font-family: var(--font-inter), "Inter", sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: var(--text);
          margin: 0;
        }
        .ur-rule-desc {
          font-family: var(--font-inter), "Inter", sans-serif;
          font-size: 11px;
          color: var(--text-secondary);
          margin: 2px 0 0;
          line-height: 1.4;
        }
        .ur-action-btn {
          display: inline-flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 14px;
          border-radius: 10px;
          font-family: var(--font-inter), "Inter", sans-serif;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s ease;
          border: 1px solid;
          margin-top: 2px;
        }
        .ur-action-btn-eligible {
          background-color: var(--primary);
          border-color: var(--primary);
          color: var(--primary-text);
        }
        .ur-action-btn-eligible:hover {
          opacity: 0.9;
        }
        .ur-action-btn-locked {
          background-color: var(--surface-light);
          border-color: var(--surface-border);
          color: var(--text-muted);
          cursor: not-allowed;
        }
      `}</style>

      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="ur-card-header"
        aria-expanded={expanded}
        aria-label="Toggle username rules"
      >
        <div className="ur-header-title-row">
          <div className="ur-icon-wrap">
            <Ionicons name="at-outline" size={18} />
          </div>
          <div className="ur-header-text-col">
            <span className="ur-card-title">
              Username Rules (Instagram Style)
            </span>
            <span className="ur-card-subtitle">
              Continuous handle & 15-day changing policy
            </span>
          </div>
        </div>

        <div className="ur-header-right">
          <div
            className={`ur-status-pill ${
              canChangeUsername ? "ur-status-pill-safe" : "ur-status-pill-warning"
            }`}
          >
            <Ionicons
              name={canChangeUsername ? "checkmark-circle" : "time"}
              size={12}
            />
            <span>
              {canChangeUsername
                ? "Can change"
                : `${daysUntilUsernameChange}d left`}
            </span>
          </div>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color="var(--text-muted)"
          />
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="ur-content-wrap">
          {/* Status banner */}
          <div
            className={`ur-status-banner ${
              canChangeUsername
                ? "ur-status-banner-safe"
                : "ur-status-banner-warning"
            }`}
          >
            <Ionicons
              name={canChangeUsername ? "shield-checkmark" : "time-outline"}
              size={16}
              color={canChangeUsername ? "var(--safe)" : "var(--warning)"}
            />
            <div style={{ flex: 1 }}>
              <p
                className="ur-status-banner-title"
                style={{
                  color: canChangeUsername ? "var(--safe)" : "var(--text)",
                }}
              >
                {canChangeUsername
                  ? "Eligible to change username"
                  : `Cooldown Active (${daysUntilUsernameChange} day${
                      daysUntilUsernameChange === 1 ? "" : "s"
                    } remaining)`}
              </p>
              <p className="ur-status-banner-sub">
                {canChangeUsername
                  ? currentUsername
                    ? `Your current handle @${currentUsername} is active. You may update it now.`
                    : "No username set yet. Choose a continuous handle (no spaces)."
                  : formattedDate
                  ? `Last updated on ${formattedDate}. Usernames can only be modified once every 15 days.`
                  : "Usernames can only be modified once every 15 days to protect identity."}
              </p>
            </div>
          </div>

          {/* Rules list */}
          <div className="ur-rules-list">
            {USERNAME_RULES_LIST.map((rule) => {
              const hasCandidate =
                typeof candidateInput === "string" && candidateInput.length > 0;
              const isValid = hasCandidate ? rule.validate(candidateInput) : false;

              return (
                <div key={rule.id} className="ur-rule-row">
                  <div
                    className={`ur-rule-icon-circle ${
                      hasCandidate
                        ? isValid
                          ? "ur-rule-icon-valid"
                          : "ur-rule-icon-muted"
                        : ""
                    }`}
                  >
                    <Ionicons
                      name={
                        hasCandidate
                          ? isValid
                            ? "checkmark-circle"
                            : "ellipse-outline"
                          : (rule.icon as any)
                      }
                      size={14}
                      color={
                        hasCandidate
                          ? isValid
                            ? "var(--safe)"
                            : "var(--text-muted)"
                          : "var(--primary)"
                      }
                    />
                  </div>
                  <div className="ur-rule-text-container">
                    <p className="ur-rule-title">{rule.title}</p>
                    <p className="ur-rule-desc">{rule.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action button if eligible and not already editing */}
          {!isEditing && onEditPress && (
            <button
              type="button"
              onClick={onEditPress}
              disabled={!canChangeUsername}
              className={`ur-action-btn ${
                canChangeUsername
                  ? "ur-action-btn-eligible"
                  : "ur-action-btn-locked"
              }`}
            >
              <Ionicons
                name={
                  canChangeUsername ? "pencil-outline" : "lock-closed-outline"
                }
                size={14}
              />
              <span>
                {canChangeUsername
                  ? "Change Username Now"
                  : `Locked (${daysUntilUsernameChange}d remaining)`}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
