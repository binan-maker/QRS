// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE ADAPTER — provider-agnostic interface for all file storage operations.
// ───────────────────────────────────────────────────────────────────────────────
// To switch storage providers, edit ONE line in lib/storage/index.ts.
// No other files need changing — all consumers import from lib/storage.
//
// This interface deliberately uses generic concepts (paths, URLs) rather than
// provider-specific ones (Firebase refs, S3 keys) so implementations are
// interchangeable.
// ═══════════════════════════════════════════════════════════════════════════════

export interface StorageAdapter {
  /**
   * Upload a Blob/File to the given storage path.
   * Returns the publicly accessible download URL.
   */
  upload(path: string, file: Blob | File): Promise<string>;

  /**
   * Delete a file at the given storage path.
   * Silently ignores "not found" errors to make cleanup idempotent.
   */
  delete(path: string): Promise<void>;

  /**
   * Extract the internal storage path from a provider-issued download URL.
   * Returns an empty string when the URL cannot be parsed.
   */
  getPathFromUrl(url: string): string;

  /**
   * Returns true when the URL was issued by this storage provider
   * (e.g. used to decide whether to attempt path extraction / deletion).
   */
  isOwnUrl(url: string): boolean;
}
