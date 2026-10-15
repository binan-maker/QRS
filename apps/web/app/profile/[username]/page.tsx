import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/qr/qr-data";
import { sanitizeUsername } from "@shared/utils/username-rules";
import { Ionicons } from "@/lib/mobile-icons";
import { UserAvatar } from "@/components/avatar/UserAvatar";
import styles from "../profile.module.css";

export const dynamic = "force-dynamic";

interface PublicProfileProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PublicProfileProps): Promise<Metadata> {
  const { username } = await params;
  const cleanUsername = sanitizeUsername(username);

  return {
    title: `@${cleanUsername || "user"} — BinRo Profile`,
    description: `View @${cleanUsername || "user"}'s verified community profile on BinRo.`,
    openGraph: {
      title: `@${cleanUsername || "user"} — BinRo Profile`,
      description: `View @${cleanUsername || "user"}'s verified community profile on BinRo.`,
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: `@${cleanUsername || "user"} | BinRo`,
      description: `View @${cleanUsername || "user"}'s verified community profile on BinRo.`,
    },
  };
}

export default async function PublicProfilePage({ params }: PublicProfileProps) {
  const { username } = await params;
  const cleanUsername = sanitizeUsername(username);

  if (!cleanUsername) {
    notFound();
  }

  const supabase = getServerSupabase();
  let userData: {
    id: string;
    username: string;
    display_name: string;
    photo_url?: string | null;
    avatar_url?: string | null;
    comment_count?: number;
    created_at?: string;
  } | null = null;

  if (supabase) {
    // 1. Look up user by case-insensitive username in public.users
    const { data: userRow } = await supabase
      .from("users")
      .select("id, username, display_name, photo_url, avatar_url, comment_count, created_at, is_deleted")
      .ilike("username", cleanUsername)
      .eq("is_deleted", false)
      .maybeSingle();

    if (userRow) {
      userData = userRow;
    } else {
      // 2. Check reservation table in case username was claimed
      const { data: unameRow } = await supabase
        .from("usernames")
        .select("user_id, username")
        .ilike("username", cleanUsername)
        .maybeSingle();

      if (unameRow?.user_id) {
        const { data: fallbackUser } = await supabase
          .from("users")
          .select("id, username, display_name, photo_url, avatar_url, comment_count, created_at")
          .eq("id", unameRow.user_id)
          .maybeSingle();
        if (fallbackUser) {
          userData = fallbackUser;
        }
      }
    }
  }

  const displayName = userData?.display_name || cleanUsername;
  const handle = userData?.username || cleanUsername;
  const photo = userData?.photo_url || userData?.avatar_url || null;
  const memberSince = userData?.created_at
    ? new Date(userData.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : null;
  const commentsContributed = userData?.comment_count || 0;

  return (
    <main className={styles.container}>
      <div className={styles.inner}>
        {/* Top Bar */}
        <header className={styles.topBar}>
          <Link href="/" className={styles.iconBtn} aria-label="Go back">
            <Ionicons name="chevron-back" size={20} />
          </Link>
          <h1 className={styles.pageTitle}>Profile</h1>
          <div style={{ width: 38 }} aria-hidden="true" />
        </header>

        {userData ? (
          <div className={styles.desktopLayout}>
            {/* Identity Card */}
            <div className={styles.profileCard}>
              <div className={styles.avatarRow}>
                <div className={styles.avatarWrap}>
                  <UserAvatar
                    src={photo}
                    name={displayName}
                    size={76}
                    showRing
                  />
                </div>
                <div className={styles.identityCol}>
                  <div className={styles.nameRow}>
                    <h2 className={styles.displayName}>{displayName}</h2>
                  </div>
                  <div className={styles.handleBadge}>
                    <span className={styles.handleText}>@{handle}</span>
                    <span className={styles.verifiedDot}>✓</span>
                  </div>
                  {memberSince && (
                    <div className={styles.memberSinceRow}>
                      <Ionicons name="calendar-outline" size={13} color="var(--text-muted)" />
                      <span className={styles.memberSinceText}>Joined {memberSince}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Overview */}
              <div className={styles.statsGrid} style={{ marginTop: 20 }}>
                <div className={styles.statCard}>
                  <span className={styles.statNumber}>{commentsContributed}</span>
                  <span className={styles.statLabel}>Community Warnings</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statNumber}>Verified</span>
                  <span className={styles.statLabel}>Account Status</span>
                </div>
              </div>
            </div>

            {/* Privacy Protection Callout */}
            <div className={styles.sectionCard}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: "var(--primary-dim)",
                    color: "var(--primary)",
                    flexShrink: 0,
                  }}
                >
                  <Ionicons name="lock-closed" size={20} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 15,
                      fontWeight: 700,
                      color: "var(--text)",
                    }}
                  >
                    Zero-Knowledge Activity Privacy
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      lineHeight: "19px",
                    }}
                  >
                    BinRo accounts enforce strict client-side encryption and Row-Level Security. Personal QR scan history and private bookmarks are never publicly exposed.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Link
                href="/scanner"
                className={styles.primaryBtn}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  textDecoration: "none",
                }}
              >
                <Ionicons name="scan-outline" size={18} />
                <span>Open BinRo Scanner</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className={styles.profileCard} style={{ textAlign: "center", padding: "48px 24px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 64,
                height: 64,
                borderRadius: 20,
                backgroundColor: "var(--surface-light)",
                color: "var(--text-muted)",
                marginBottom: 16,
              }}
            >
              <Ionicons name="person-circle-outline" size={38} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px", color: "var(--text)" }}>
              User Not Found
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "0 0 24px", lineHeight: "20px" }}>
              The handle <strong>@{cleanUsername}</strong> does not exist or has been changed.
            </p>
            <Link
              href="/"
              className={styles.secondaryBtn}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px 24px",
                borderRadius: 12,
                textDecoration: "none",
              }}
            >
              Return to Home
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
