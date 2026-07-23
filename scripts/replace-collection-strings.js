#!/usr/bin/env node
/**
 * Phase G: Replace hardcoded Firestore collection strings with COLLECTIONS constants.
 *
 * Strategy: Only replace strings that appear inside path-array literals
 *   ["collectionName", ...]  or  [..., "collectionName", ...]  or  [..., "collectionName"]
 *
 * This avoids touching:
 *   • Field name arguments: db.increment(path, "fieldName", delta)
 *   • Object properties: { comments: [] }
 *   • Filter keys: key: "favorites"
 *   • Template literals: `notifications/${userId}/items`
 */

const fs = require("fs");
const path = require("path");

// Map from string literal value → COLLECTIONS constant expression
const REPLACEMENTS = [
  ["users",            "COLLECTIONS.USERS"],
  ["qrCodes",          "COLLECTIONS.QR_CODES"],
  ["usernames",        "COLLECTIONS.USERNAMES"],
  ["standardLinks",    "COLLECTIONS.STANDARD_LINKS"],
  ["guardLinks",       "COLLECTIONS.GUARD_LINKS"],
  ["qrs",              "COLLECTIONS.QRS"],
  ["scans",            "COLLECTIONS.SCANS"],
  ["comments",         "COLLECTIONS.COMMENTS"],
  ["generatedQrs",     "COLLECTIONS.GENERATED_QRS"],
  ["reports",          "COLLECTIONS.REPORTS"],
  ["favorites",        "COLLECTIONS.FAVORITES"],
  ["friends",          "COLLECTIONS.FRIENDS"],
  ["following",        "COLLECTIONS.FOLLOWING"],
  ["followers",        "COLLECTIONS.FOLLOWERS"],
  ["creatorFollowers", "COLLECTIONS.CREATOR_FOLLOWERS"],
  ["creatorFollowing", "COLLECTIONS.CREATOR_FOLLOWING"],
  ["featureVotes",     "COLLECTIONS.FEATURE_VOTES"],
  ["likes",            "COLLECTIONS.LIKES"],
  ["events",           "COLLECTIONS.EVENTS"],
  ["reportLog",        "COLLECTIONS.REPORT_LOG"],
  ["scanVelocity",     "COLLECTIONS.SCAN_VELOCITY"],
  ["counters",         "COLLECTIONS.COUNTERS"],
  ["ownerScans",       "COLLECTIONS.OWNER_SCANS"],
  ["blockedScans",     "COLLECTIONS.BLOCKED_SCANS"],
  ["moderationQueue",  "COLLECTIONS.MODERATION_QUEUE"],
  ["feedback",         "COLLECTIONS.FEEDBACK"],
  ["auditLogs",        "COLLECTIONS.AUDIT_LOGS"],
];

const IMPORT_LINE = `import { COLLECTIONS } from "@/shared/constants/collections";\n`;

// Files to process (all confirmed to have db path array string literals)
const TARGET_FILES = [
  "services/comments/cache.ts",
  "services/comments/read.ts",
  "services/comments/report.ts",
  "services/comments/write.ts",
  "services/feature-vote-service.ts",
  "services/follow-service.ts",
  "services/friend-service.ts",
  "services/generator/branding.ts",
  "services/generator/crud.ts",
  "services/generator/updates.ts",
  "services/generator/velocity.ts",
  "services/guard-service.ts",
  "services/integrity/comment-checks.ts",
  "services/integrity/report-checks.ts",
  "services/integrity/tiers.ts",
  "services/notification-service.ts",
  "services/prewarm.ts",
  "services/qr-detail-service.ts",
  "services/qr-service.ts",
  "services/report-service.ts",
  "services/scan-fraud-guard.ts",
  "services/scan-history/scan-crud.ts",
  "services/scan-history/scan-events.ts",
  "services/scan-history/scan-stats.ts",
  "services/user/cache.ts",
  "services/user/favorites.ts",
  "services/user/leaderboard.ts",
  "services/user/privacy.ts",
  "services/user/profile.ts",
  "services/user/search.ts",
  "services/user/username.ts",
  "features/profile/hooks/useProfile.ts",
  "features/qr-detail/hooks/useQrReports.ts",
  "features/qr-detail/static/StaticQrDetailScreen.tsx",
  "features/settings/SettingsScreen.tsx",
  "features/settings/components/FollowingSection.tsx",
  "features/settings/components/ProfileSettingsSection.tsx",
  "features/settings/hooks/useSettings.ts",
  "shared/components/consent/ConsentManager.tsx",
  "shared/contexts/AuthContext.tsx",
  "lib/db/distributed-counter.ts",
  "app/_layout.tsx",
];

let totalReplacements = 0;
let filesModified = 0;

for (const relPath of TARGET_FILES) {
  const absPath = path.resolve(__dirname, "..", relPath);
  if (!fs.existsSync(absPath)) {
    console.warn(`SKIP (not found): ${relPath}`);
    continue;
  }

  let content = fs.readFileSync(absPath, "utf8");
  const original = content;

  // Apply all replacements: only match strings inside array literal positions
  for (const [str, constant] of REPLACEMENTS) {
    // Position 1: first element of array  ["str", ...
    content = content.replace(new RegExp(`\\["${str}",`, "g"), `[${constant},`);
    // Position 1: sole element of array   ["str"]
    content = content.replace(new RegExp(`\\["${str}"\\]`, "g"), `[${constant}]`);
    // Position N: middle element          , "str",
    content = content.replace(new RegExp(`, "${str}",`, "g"), `, ${constant},`);
    // Position N: last element            , "str"]
    content = content.replace(new RegExp(`, "${str}"\\]`, "g"), `, ${constant}]`);
  }

  if (content === original) continue; // nothing changed

  // Add COLLECTIONS import if not already present
  if (!content.includes('from "@/shared/constants/collections"') &&
      !content.includes("from '@/shared/constants/collections'")) {
    // Insert after the last existing import block
    // Find the last import line and insert after it
    const lines = content.split("\n");
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trimStart().startsWith("import ")) lastImportIdx = i;
    }
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, IMPORT_LINE.trimEnd());
      content = lines.join("\n");
    } else {
      content = IMPORT_LINE + content;
    }
  }

  fs.writeFileSync(absPath, content, "utf8");

  // Count replacements for reporting
  let count = 0;
  for (const [str, constant] of REPLACEMENTS) {
    const re = new RegExp(`\\b${constant}\\b`, "g");
    const matches = content.match(re);
    if (matches) count += matches.length;
  }

  filesModified++;
  console.log(`✓ ${relPath} (${count} constants)`);
}

console.log(`\nDone: ${filesModified} files modified, ${totalReplacements} strings replaced.`);
