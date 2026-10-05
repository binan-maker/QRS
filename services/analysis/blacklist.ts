export interface BlacklistPattern {
  pattern: string;
  reason: string;
}

export const BUILT_IN_BLACKLIST: BlacklistPattern[] = [];

export async function saveOfflineBlacklist(_extra: BlacklistPattern[]): Promise<void> {
  // No-op fallback for local threat cache persistence
}
