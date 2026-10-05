"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import styles from "./public-profile.module.css";

interface PublicProfileData {
  id: string;
  displayName: string;
  username: string;
  photoUrl: string | null;
  scanCount: number;
  commentCount: number;
  totalLikesReceived: number;
  createdAt: string | null;
}

export default function PublicProfilePage() {
  const router = useRouter();
  const params = useParams();
  const rawUsername = typeof params?.username === "string" ? params.username : "";
  const username = decodeURIComponent(rawUsername).replace(/^@/, "").trim();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  useEffect(() => {
    if (!username) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let active = true;

    async function loadPublicProfile() {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await fetch(`/api/user/${encodeURIComponent(username)}`);
        if (!active) return;

        if (res.status === 404) {
          setNotFound(true);
          setProfile(null);
        } else if (res.ok) {
          const body = await res.json();
          if (body?.data) {
            setProfile(body.data);
          } else {
            setNotFound(true);
          }
        } else {
          setNotFound(true);
        }
      } catch {
        if (active) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPublicProfile();

    return () => {
      active = false;
    };
  }, [username]);

  const initials =
    (profile?.displayName || username)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join("") || "?";

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <main className={styles.container}>
      <div className={styles.inner}>
        {/* Top Header Bar */}
        <header className={styles.topBar}>
          <button
            type="button"
            onClick={() => router.back()}
            className={styles.backBtn}
            aria-label="Back"
          >
            <Ionicons name="chevron-back" size={20} />
          </button>
          <h1 className={styles.pageTitle}>Profile</h1>
          <div style={{ width: 36 }} />
        </header>

        {loading ? (
          <div className={styles.notFoundWrap}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "3px solid var(--surface-border)",
                borderTopColor: "var(--primary)",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>
              Loading profile...
            </p>
          </div>
        ) : notFound || !profile ? (
          <div className={styles.notFoundWrap}>
            <Ionicons name="person-outline" size={48} color="var(--text-muted)" />
            <h2 className={styles.notFoundTitle}>User not found</h2>
            <p className={styles.notFoundSub}>
              @{username} does not exist or may have been removed.
            </p>
            <Link href="/" className={styles.notFoundBtn}>
              Back to Home
            </Link>
          </div>
        ) : (
          <>
            {/* Avatar & Display Name */}
            <section className={styles.avatarSection}>
              <div className={styles.avatarRing}>
                <div className={styles.avatarInner}>
                  {profile.photoUrl && !photoError ? (
                    <img
                      src={profile.photoUrl}
                      alt={profile.displayName}
                      referrerPolicy="no-referrer"
                      onError={() => setPhotoError(true)}
                      className={styles.avatarPhoto}
                    />
                  ) : (
                    <span className={styles.avatarInitials}>{initials}</span>
                  )}
                </div>
              </div>

              <h2 className={styles.displayName}>{profile.displayName}</h2>
              <p className={styles.usernameText}>@{profile.username}</p>

              {memberSince && (
                <p className={styles.joinedText}>Joined {memberSince}</p>
              )}
            </section>

            {/* Public Activity Stats */}
            <div className={styles.statsRow}>
              <div className={styles.statCell}>
                <span className={styles.statValue}>{profile.scanCount ?? 0}</span>
                <span className={styles.statLabel}>Scans</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statCell}>
                <span className={styles.statValue}>{profile.commentCount ?? 0}</span>
                <span className={styles.statLabel}>Comments</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statCell}>
                <span className={styles.statValue}>
                  {profile.totalLikesReceived ?? 0}
                </span>
                <span className={styles.statLabel}>Helpful</span>
              </div>
            </div>

            {/* Community Member Badge */}
            <div className={styles.infoCard}>
              <div className={styles.badgeRow}>
                <Ionicons name="shield-checkmark" size={18} color="var(--safe)" />
                <span>Verified Community Member</span>
              </div>
            </div>
          </>
        )}
      </div>

      <BottomTabBar activeTab="profile" />
    </main>
  );
}
