/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BINRO SHARED: CANONICAL USERNAME & HANDLE RULES (INSTAGRAM-STYLE)
 * ───────────────────────────────────────────────────────────────────────────────
 * Shared between mobile (React Native / Expo) and web (Next.js):
 *  1. No spaces or gaps allowed (strictly continuous handle like Instagram).
 *  2. Length constraint: 3 to 20 characters.
 *  3. Character set: lowercase letters (a–z), numbers (0–9), and underscores (_).
 *  4. Starting character: must begin with a letter (a–z).
 *  5. 15-day cooldown between username changes to protect identity and prevent spoofing.
 *  6. Global uniqueness: each handle is reserved exclusively for a single user.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 20;
export const USERNAME_COOLDOWN_DAYS = 15;
export const USERNAME_COOLDOWN_MS = USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

/**
 * Strict regex for valid usernames:
 * - Begins with lowercase letter [a-z]
 * - Followed by 2 to 19 lowercase alphanumeric characters or underscores
 * - Total length: 3 to 20 characters
 * - Zero whitespace, spaces, or gaps allowed
 */
export const USERNAME_REGEX = /^[a-z][a-z0-9_]{2,19}$/;

export interface UsernameRuleDefinition {
  id: string;
  title: string;
  description: string;
  icon: string; // Ionicons glyph name
  validate: (username: string) => boolean;
}

export const USERNAME_RULES_LIST: readonly UsernameRuleDefinition[] = [
  {
    id: "no_gaps",
    title: "No Spaces or Gaps",
    description: "Like Instagram, usernames cannot contain spaces, tabs, or gaps.",
    icon: "ban-outline",
    validate: (u: string) => !/\s/.test(u) && u.length > 0,
  },
  {
    id: "length",
    title: "3 to 20 Characters",
    description: "Handle must be between 3 and 20 characters in length.",
    icon: "text-outline",
    validate: (u: string) => u.length >= MIN_USERNAME_LENGTH && u.length <= MAX_USERNAME_LENGTH,
  },
  {
    id: "starts_with_letter",
    title: "Starts with a Letter",
    description: "Must begin with a lowercase letter (a–z).",
    icon: "keypad-outline",
    validate: (u: string) => /^[a-z]/.test(u),
  },
  {
    id: "allowed_chars",
    title: "Letters, Numbers & Underscores",
    description: "Only lowercase letters (a–z), digits (0–9), and underscores (_) are permitted.",
    icon: "code-outline",
    validate: (u: string) => /^[a-z0-9_]+$/.test(u),
  },
  {
    id: "cooldown",
    title: "15-Day Cooldown",
    description: "You can change your username once every 15 days to protect your identity.",
    icon: "time-outline",
    validate: () => true,
  },
  {
    id: "uniqueness",
    title: "Unique & Unclaimed",
    description: "Must not belong to another user. Changing your handle releases the old one immediately.",
    icon: "shield-checkmark-outline",
    validate: () => true,
  },
] as const;

/**
 * Sanitizes input into an Instagram-style username:
 * - Strips all whitespace, spaces, tabs, line breaks (no gaps allowed).
 * - Converts to lowercase.
 * - Strips any characters outside [a-z0-9_].
 * - Clamps length to MAX_USERNAME_LENGTH (20 chars).
 */
export function sanitizeUsername(input?: string | null): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .replace(/\s+/g, "") // remove all spaces and gaps
    .replace(/[^a-z0-9_]/g, "") // only allowed characters
    .slice(0, MAX_USERNAME_LENGTH);
}

/**
 * Validates a candidate username against all Instagram-style rules.
 * Returns { valid: boolean, error: string | null }.
 */
export function validateUsername(username: string): { valid: boolean; error: string | null } {
  if (!username) {
    return { valid: false, error: "Username cannot be empty." };
  }

  // Check for any spaces or gaps
  if (/\s/.test(username)) {
    return { valid: false, error: "Username cannot contain spaces or gaps (like Instagram)." };
  }

  // Check character set
  if (/[^a-z0-9_]/.test(username)) {
    return { valid: false, error: "Username can only contain lowercase letters, numbers, and underscores." };
  }

  // Check first character
  if (!/^[a-z]/.test(username)) {
    return { valid: false, error: "Username must start with a lowercase letter (a–z)." };
  }

  // Check length
  if (username.length < MIN_USERNAME_LENGTH) {
    return { valid: false, error: `Username must be at least ${MIN_USERNAME_LENGTH} characters long.` };
  }

  if (username.length > MAX_USERNAME_LENGTH) {
    return { valid: false, error: `Username cannot exceed ${MAX_USERNAME_LENGTH} characters.` };
  }

  // Strict regex check
  if (!USERNAME_REGEX.test(username)) {
    return { valid: false, error: "Invalid username format." };
  }

  return { valid: true, error: null };
}

/**
 * Calculates remaining cooldown days until a user can change their username again.
 * Returns 0 if eligible now.
 */
export function getRemainingUsernameCooldownDays(lastChangedAt?: Date | string | null): number {
  if (!lastChangedAt) return 0;
  const changedDate = typeof lastChangedAt === "string" ? new Date(lastChangedAt) : lastChangedAt;
  const time = changedDate.getTime();
  if (isNaN(time)) return 0;

  const daysSince = (Date.now() - time) / (1000 * 60 * 60 * 24);
  if (daysSince >= USERNAME_COOLDOWN_DAYS) return 0;

  return Math.ceil(USERNAME_COOLDOWN_DAYS - daysSince);
}

/**
 * Checks whether the user is currently allowed to change their username.
 */
export function canUserChangeUsername(lastChangedAt?: Date | string | null): boolean {
  return getRemainingUsernameCooldownDays(lastChangedAt) === 0;
}
