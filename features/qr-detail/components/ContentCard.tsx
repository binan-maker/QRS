/**
 * ContentCard — re-export shim
 *
 * All logic, parsers, and per-type card components now live in:
 *   features/qr-detail/content-cards/
 *
 * This file exists purely for backwards-compatibility so any existing
 * import of "./ContentCard" or "components/ContentCard" keeps working.
 */
export { default } from "@/features/qr-detail/content-cards";
