---
name: QR type resolution pattern
description: How templateKey, contentType, and content-sniffing combine to resolve the display type for any QR item.
---

## Rule
`templateKey` (from generator registry) always wins over `contentType` (stored field) when the templateKey is non-generic.

```ts
const GENERIC = new Set(["text", "url", "link", "biolink", "social"]);
// "wifi", "instagram", "youtube" etc. are NOT generic — they're real types.
if (templateKey && !GENERIC.has(templateKey)) return templateKey;
if (stored && !GENERIC.has(stored)) return stored;
// fallback: content-sniffing heuristics
```

**Why:** The generator saves `contentType: "url"` for many templates (Instagram, YouTube, etc.) because the QR content IS a URL. Without templateKey priority, all social QRs showed as generic "URL/Link" in QR Detail and My QR list.

**How to apply:**
- Both `app/my-qr-codes.tsx` (`GENERIC_CT`) and `lib/services/qr-display-utils.ts` (`GENERIC_STORED`) use this pattern.
- `features/qr-detail/components/ContentCard.tsx` uses `effectiveType = templateKey ?? contentType`.
- Never add "wifi" to the generic set — it is a real specific type, not an alias.

## Two QR worlds
- **Standard QR** (non-branded): content = real destination (e.g. `https://instagram.com/user`). No `qrCodes` entry, only `generatedQrs`. `displayDestination` may be empty.
- **Living Shield QR** (branded): content = `/go/uuid` redirect URL. Has `qrCodes` entry. `displayDestination` = real destination. Always use `displayDestination || content` as display source.

## Display title extraction
`getDetailDisplayTitle` and `getDisplayText` (My QR list) both extract meaningful titles from URLs:
- instagram/twitter/telegram/snapchat → `@handle` from last URL path segment
- tiktok → strip `tiktok.com/@` prefix
- youtube → handle from `/c/`, `/channel/`, `/@` path patterns
- linkedin/facebook/discord → last path segment or static label
- zoom → meeting ID from `/j/` segment
- calendly → username from first path segment
- reviewpage/googlereview → "Google Review Page"
- menucatalogue/restaurantmenu → "Menu / Catalogue"
