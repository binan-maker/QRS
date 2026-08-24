import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "./firebase-admin";
import {
  cacheGet,
  cacheSet,
  cacheDelete,
} from "./route-cache";
import { isLimitExceeded } from "./qr-limits";

const CACHE_TTL_MS = 30_000;

export const CAUTION_WINDOW_MS =
  24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface GuardLinkFields {
  currentDestination: string | null;
  previousDestination: string | null;
  businessName: string | null;
  ownerName: string;
  isActive: boolean;
  destinationChangedAt: string | null;
  scanLimit: number | null;
  scanCount: number;
  expiryDate: string | null;
}

export interface StandardLinkFields {
  rawContent: string;
  contentType: string;
  ownerName: string;
  isActive: boolean;
  scanLimit: number | null;
  scanCount: number;
  expiryDate: string | null;
}

export interface UnifiedQrFields {
  ownerId: string;
  ownerName: string;
  qrType: string;
  template: string | null;
  title: string | null;
  isDynamic: boolean;
  destination: string;
  rawDestination: string;
  contentType: string;
  businessName: string | null;
  status: string;
  scanCount: number;
  scanLimit: number | null;
  expiryDate: string | null;

  design: {
    fgColor: string;
    bgColor: string;
    logoPosition: string;
    logoUri: string | null;
    label: string | null;
  };
}

// ─────────────────────────────────────────────────────────────
// Cache helpers
// ─────────────────────────────────────────────────────────────

function fcGet<T>(
  key: string,
): { data: T | null } | null {
  return cacheGet<{
    data: T | null;
  }>(key);
}

function fcSet<T>(
  key: string,
  data: T | null,
): void {
  cacheSet(
    key,
    { data },
    CACHE_TTL_MS,
  );
}

// ─────────────────────────────────────────────────────────────
// Firestore helper
// ─────────────────────────────────────────────────────────────

async function fetchDocument<T>(
  collection: string,
  id: string,
): Promise<T | null> {
  const db = getAdminDb();

  if (!db) return null;

  try {
    const snapshot = await db
      .collection(collection)
      .doc(id)
      .get();

    if (!snapshot.exists) {
      return null;
    }

    return snapshot.data() as T;
  } catch (error) {
    console.error(
      `[firebase-client] Failed to fetch ${collection}/${id}:`,
      error,
    );

    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Guard Links
// Collection: guardLinks
// ─────────────────────────────────────────────────────────────

export async function fetchGuardLink(
  id: string,
): Promise<GuardLinkFields | null> {
  const key = `sc-guard:${id}`;

  const hit = fcGet<GuardLinkFields>(key);

  if (hit !== null) {
    return hit.data;
  }

  const data = await fetchDocument<any>(
    "guardLinks",
    id,
  );

  if (!data) {
    fcSet(key, null);

    return null;
  }

  const link: GuardLinkFields = {
    currentDestination:
      data.currentDestination ??
      data.current_destination ??
      null,

    previousDestination:
      data.previousDestination ??
      data.previous_destination ??
      null,

    businessName:
      data.businessName ??
      data.business_name ??
      null,

    ownerName:
      data.ownerName ??
      data.owner_name ??
      "Business",

    isActive:
      data.isActive !== false &&
      data.is_active !== false,

    destinationChangedAt:
      data.destinationChangedAt ??
      data.destination_changed_at ??
      null,

    scanLimit:
      data.scanLimit ??
      data.scan_limit ??
      null,

    scanCount:
      data.scanCount ??
      data.scan_count ??
      0,

    expiryDate:
      data.expiryDate ??
      data.expiry_date ??
      null,
  };

  fcSet(key, link);

  return link;
}

// ─────────────────────────────────────────────────────────────
// Standard Links
// Collection: standardLinks
// ─────────────────────────────────────────────────────────────

export async function fetchStandardLink(
  id: string,
): Promise<StandardLinkFields | null> {
  const key = `sc-std:${id}`;

  const hit = fcGet<StandardLinkFields>(key);

  if (hit !== null) {
    return hit.data;
  }

  const data = await fetchDocument<any>(
    "standardLinks",
    id,
  );

  if (!data) {
    fcSet(key, null);

    return null;
  }

  const link: StandardLinkFields = {
    rawContent:
      data.rawContent ??
      data.raw_content ??
      "",

    contentType:
      data.contentType ??
      data.content_type ??
      "text",

    ownerName:
      data.ownerName ??
      data.owner_name ??
      "BinRo User",

    isActive:
      data.isActive !== false &&
      data.is_active !== false,

    scanLimit:
      data.scanLimit ??
      data.scan_limit ??
      null,

    scanCount:
      data.scanCount ??
      data.scan_count ??
      0,

    expiryDate:
      data.expiryDate ??
      data.expiry_date ??
      null,
  };

  fcSet(key, link);

  return link;
}

// ─────────────────────────────────────────────────────────────
// Unified QR
// Collection: qrs
// ─────────────────────────────────────────────────────────────

export async function fetchUnifiedQr(
  id: string,
): Promise<UnifiedQrFields | null> {
  const key = `sc-unified:${id}`;

  const hit = fcGet<UnifiedQrFields>(key);

  if (hit !== null) {
    return hit.data;
  }

  const data = await fetchDocument<any>(
    "qrs",
    id,
  );

  if (!data) {
    fcSet(key, null);

    return null;
  }

  const rawDesign =
    data.design ?? {};

  const design = {
    fgColor:
      rawDesign.fgColor ??
      rawDesign.fg_color ??
      "#0A0E17",

    bgColor:
      rawDesign.bgColor ??
      rawDesign.bg_color ??
      "#F8FAFC",

    logoPosition:
      rawDesign.logoPosition ??
      rawDesign.logo_position ??
      "center",

    logoUri:
      rawDesign.logoUri ??
      rawDesign.logo_uri ??
      null,

    label:
      rawDesign.label ??
      null,
  };

  const link: UnifiedQrFields = {
    ownerId:
      data.ownerId ??
      data.owner_id ??
      "",

    ownerName:
      data.ownerName ??
      data.owner_name ??
      "BinRo User",

    qrType:
      data.qrType ??
      data.qr_type ??
      "individual",

    template:
      data.template ??
      null,

    title:
      data.title ??
      null,

    isDynamic:
      data.isDynamic ??
      data.is_dynamic ??
      false,

    destination:
      data.destination ??
      "",

    rawDestination:
      data.rawDestination ??
      data.raw_destination ??
      data.destination ??
      "",

    contentType:
      data.contentType ??
      data.content_type ??
      "text",

    businessName:
      data.businessName ??
      data.business_name ??
      null,

    status:
      data.status ??
      "active",

    scanCount:
      data.scanCount ??
      data.scan_count ??
      0,

    scanLimit:
      data.scanLimit ??
      data.scan_limit ??
      null,

    expiryDate:
      data.expiryDate ??
      data.expiry_date ??
      null,

    design,
  };

  fcSet(key, link);

  return link;
}

// ─────────────────────────────────────────────────────────────
// Cache
// ─────────────────────────────────────────────────────────────

export function bustUnifiedCache(
  id: string,
): void {
  cacheDelete(
    `sc-unified:${id}`,
  );
}

// ─────────────────────────────────────────────────────────────
// Scan handling
// ─────────────────────────────────────────────────────────────

async function incrementAndCheck(
  collection: string,
  id: string,
  scanLimit: number | null,
  statusField?: string,
): Promise<void> {
  const db = getAdminDb();

  if (!db) return;

  try {
    const ref = db
      .collection(collection)
      .doc(id);

    const snapshot =
      await ref.get();

    if (!snapshot.exists) {
      return;
    }

    const data =
      snapshot.data() ?? {};

    const currentCount =
      typeof data.scanCount === "number"
        ? data.scanCount
        : typeof data.scan_count === "number"
          ? data.scan_count
          : 0;

    const newCount =
      currentCount + 1;

    const updateData: Record<
      string,
      any
    > = {
      scanCount: newCount,
    };

    if (
      "scan_count" in data
    ) {
      updateData.scan_count =
        newCount;
    }

    if (
      scanLimit !== null &&
      scanLimit > 0 &&
      isLimitExceeded(
        null,
        scanLimit,
        newCount,
      )
    ) {
      if (statusField) {
        updateData[statusField] =
          "limit_reached";
      } else {
        updateData.isActive =
          false;

        if ("is_active" in data) {
          updateData.is_active =
            false;
        }
      }
    }

    await ref.update(
      updateData,
    );

    if (
      scanLimit !== null &&
      scanLimit > 0 &&
      isLimitExceeded(
        null,
        scanLimit,
        newCount,
      )
    ) {
      if (
        collection === "qrs"
      ) {
        cacheDelete(
          `sc-unified:${id}`,
        );
      }

      if (
        collection === "guardLinks"
      ) {
        cacheDelete(
          `sc-guard:${id}`,
        );
      }

      if (
        collection ===
        "standardLinks"
      ) {
        cacheDelete(
          `sc-std:${id}`,
        );
      }
    }
  } catch (error) {
    console.error(
      `[firebase-client] Scan update failed for ${collection}/${id}:`,
      error,
    );
  }
}

export async function recordScanAndEnforce(
  table:
    | "standard_links"
    | "guard_links"
    | "standardLinks"
    | "guardLinks",

  id: string,

  scanLimit: number | null,
): Promise<void> {
  const collection =
    table === "guard_links" ||
    table === "guardLinks"
      ? "guardLinks"
      : "standardLinks";

  await incrementAndCheck(
    collection,
    id,
    scanLimit,
  );
}

export async function recordUnifiedScan(
  id: string,
  scanLimit: number | null,
): Promise<void> {
  await incrementAndCheck(
    "qrs",
    id,
    scanLimit,
    "status",
  );
}

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────

export function isSafeRedirectDestination(
  destination: string,
): boolean {
  try {
    const url = new URL(
      destination.startsWith(
        "http",
      )
        ? destination
        : `https://${destination}`,
    );

    return (
      url.protocol === "https:" ||
      url.protocol === "http:"
    );
  } catch {
    return false;
  }
}

export function wasChangedRecently(
  destinationChangedAt:
    | string
    | null,
): boolean {
  if (!destinationChangedAt) {
    return false;
  }

  const changedAt = new Date(
    destinationChangedAt,
  ).getTime();

  if (
    Number.isNaN(
      changedAt,
    )
  ) {
    return false;
  }

  return (
    Date.now() -
      changedAt <
    CAUTION_WINDOW_MS
  );
}