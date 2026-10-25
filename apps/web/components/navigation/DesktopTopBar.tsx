"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import { useAuth } from "@/lib/auth-context";
import { useAvatar, isUserUploadedPhoto } from "@/lib/avatar-context";
import { useSidebar } from "@/contexts";
import { UserAvatar } from "@/components/avatar/UserAvatar";
import { type ScanItem } from "@/lib/scan-history";
import styles from "./DesktopTopBar.module.css";

export function DesktopTopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const { cachedUrl, avatarUrl } = useAvatar();
  const { isCollapsed, toggleSidebar } = useSidebar();

  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [matchingScans, setMatchingScans] = useState<ScanItem[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  // Close popups on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setDropdownOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // History search logic (searches local & cloud scan history)
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    const trimmed = val.trim().toLowerCase();

    if (!trimmed) {
      setMatchingScans([]);
      setDropdownOpen(false);
      return;
    }

    try {
      const keys = [
        "binro_recent_scans",
        "local_scan_history",
        "binro_scan_history",
        "binro_scans",
      ];
      let found: ScanItem[] = [];
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            found = parsed;
            break;
          }
        }
      }

      const matches = found
        .filter((item) => {
          const content = String(item.content || "").toLowerCase();
          const type = String(item.contentType || "").toLowerCase();
          return content.includes(trimmed) || type.includes(trimmed);
        })
        .slice(0, 4);

      setMatchingScans(matches);
      setDropdownOpen(true);
    } catch {
      setMatchingScans([]);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    setDropdownOpen(false);
    if (trimmed) {
      router.push(`/history?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/history");
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setMatchingScans([]);
    setDropdownOpen(false);
  };

  // Derive User Display Name (Image 3: "Ahmed")
  const displayName = useMemo(() => {
    return (
      profile?.displayName ||
      profile?.username ||
      user?.user_metadata?.display_name ||
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      "User"
    );
  }, [profile, user]);

  const firstName = useMemo(() => {
    return displayName.trim().split(/\s+/)[0] || "User";
  }, [displayName]);

  const username = useMemo(() => {
    return profile?.username || user?.user_metadata?.username || user?.email?.split("@")[0] || "";
  }, [profile, user]);

  const photoURL = useMemo(() => {
    return (
      (profile?.photoUrl && isUserUploadedPhoto(profile.photoUrl) ? profile.photoUrl : null) ||
      (cachedUrl && isUserUploadedPhoto(cachedUrl) ? cachedUrl : null) ||
      (avatarUrl && isUserUploadedPhoto(avatarUrl) ? avatarUrl : null) ||
      profile?.photoUrl ||
      user?.user_metadata?.custom_avatar_url ||
      cachedUrl ||
      avatarUrl ||
      user?.user_metadata?.avatar_url ||
      user?.user_metadata?.picture ||
      user?.user_metadata?.photo_url ||
      null
    );
  }, [profile, cachedUrl, avatarUrl, user]);

  // Check if we are strictly on the home page
  const isHomePage = pathname === "/";

  return (
    <header className={styles.topBar} role="banner">
      {/* ── Left: ChatGPT-style Sidebar Toggle Button + (On Home Page only: History Search Bar) ── */}
      <div className={styles.leftSection}>
        <button
          type="button"
          onClick={toggleSidebar}
          className={styles.hamburgerBtn}
          aria-label={isCollapsed ? "Open sidebar" : "Close sidebar"}
          title={isCollapsed ? "Open sidebar" : "Close sidebar"}
        >
          <Ionicons name="menu-outline" size={22} />
        </button>

        {isHomePage && (
          <div className={styles.searchContainer} ref={searchContainerRef}>
            <form onSubmit={handleSearchSubmit} className={styles.searchPill}>
              <span className={styles.searchIcon} aria-hidden="true">
                <Ionicons name="search-outline" size={17} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => {
                  if (searchQuery.trim().length > 0) {
                    setDropdownOpen(true);
                  }
                }}
                placeholder="Search history..."
                aria-label="Search scan history"
                className={styles.searchInput}
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className={styles.clearBtn}
                  aria-label="Clear search query"
                >
                  <Ionicons name="close" size={13} />
                </button>
              ) : null}
            </form>

            {/* Live History Search Dropdown */}
            {dropdownOpen && (
              <div className={styles.searchDropdown}>
                <div className={styles.dropdownHeader}>Scan History Results</div>
                {matchingScans.length > 0 ? (
                  <div className={styles.dropdownList}>
                    {matchingScans.map((item) => (
                      <Link
                        key={item.id}
                        href={`/qr/${item.id}?content=${encodeURIComponent(item.content)}`}
                        onClick={() => setDropdownOpen(false)}
                        className={styles.dropdownItem}
                      >
                        <div className={styles.dropdownIconBox}>
                          <Ionicons name="qr-code-outline" size={16} />
                        </div>
                        <div className={styles.dropdownItemBody}>
                          <span className={styles.dropdownItemTitle}>
                            {item.content}
                          </span>
                          <span className={styles.dropdownItemSub}>
                            {new Date(item.scannedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            • {item.contentType?.toUpperCase() || "QR"}
                          </span>
                        </div>
                      </Link>
                    ))}
                    <Link
                      href={`/history?q=${encodeURIComponent(searchQuery.trim())}`}
                      onClick={() => setDropdownOpen(false)}
                      className={styles.dropdownViewAll}
                    >
                      <span>See all results in History</span>
                      <Ionicons name="arrow-forward" size={13} />
                    </Link>
                  </div>
                ) : (
                  <div className={styles.dropdownEmpty}>
                    No scans found matching &ldquo;{searchQuery}&rdquo;
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Right: User Profile Pill with Name (Image 3) ── */}
      <div className={styles.rightControls}>
        {user ? (
          <div className={styles.profilePillWrapper} ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className={styles.profilePill}
              aria-expanded={menuOpen}
              aria-label={`User menu for ${firstName}`}
            >
              <UserAvatar
                src={photoURL}
                name={displayName || firstName}
                size={34}
                showRing={true}
              />
              <span className={styles.userName}>{firstName}</span>
              <span
                className={`${styles.chevronIcon} ${menuOpen ? styles.chevronOpen : ""}`}
              >
                <Ionicons name="chevron-down" size={14} />
              </span>
            </button>

            {menuOpen && (
              <div className={styles.profileMenu}>
                <div className={styles.menuHeader}>
                  <div className={styles.menuName}>{displayName}</div>
                  {username && <div className={styles.menuHandle}>@{username}</div>}
                </div>

                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className={styles.menuItem}
                >
                  <Ionicons name="person-outline" size={16} />
                  <span>My Profile</span>
                </Link>

                <Link
                  href="/history"
                  onClick={() => setMenuOpen(false)}
                  className={styles.menuItem}
                >
                  <Ionicons name="time-outline" size={16} />
                  <span>Scan History</span>
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className={styles.menuItem}
                >
                  <Ionicons name="settings-outline" size={16} />
                  <span>Settings</span>
                </Link>

                <div className={styles.menuDivider} />

                <button
                  type="button"
                  onClick={async () => {
                    setMenuOpen(false);
                    await signOut();
                    router.push("/");
                  }}
                  className={`${styles.menuItem} ${styles.menuItemDanger}`}
                >
                  <Ionicons name="log-out-outline" size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login" className={styles.signInBtn}>
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
