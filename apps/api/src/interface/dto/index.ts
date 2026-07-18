/**
 * @interface/dto — Request/response Zod schemas (Data Transfer Objects)
 *
 * Replaces scattered inline validation across route handlers.
 * Phase 3: all route handlers use these schemas via the validateBody middleware.
 *
 * Convention:
 *   - Request schemas end in "Schema" (e.g. CreateQrSchema)
 *   - Inferred types end in "Dto" (e.g. CreateQrDto)
 */

import { z } from "zod";

// ─── QR DTOs ─────────────────────────────────────────────────────────────────

export const CreateQrSchema = z.object({
  destination:   z.string().url("Must be a valid URL").or(z.string().min(1)),
  rawDestination:z.string().min(1),
  contentType:   z.string().min(1).default("url"),
  title:         z.string().max(100).optional(),
  isDynamic:     z.boolean().default(false),
  qrType:        z.enum(["individual", "business", "government"]).default("individual"),
  scanLimit:     z.number().int().positive().optional(),
  expiryDate:    z.string().datetime().optional(),
  design: z.object({
    fgColor:     z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    bgColor:     z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    logoPosition:z.enum(["center", "top", "bottom"]).optional(),
    logoUri:     z.string().url().nullable().optional(),
    label:       z.string().max(32).nullable().optional(),
  }).optional(),
});

export type CreateQrDto = z.infer<typeof CreateQrSchema>;

export const UpdateQrSchema = CreateQrSchema.partial().omit({ qrType: true });
export type UpdateQrDto = z.infer<typeof UpdateQrSchema>;

export const UpdateDestinationSchema = z.object({
  destination: z.string().min(1, "Destination is required"),
});

// ─── User DTOs ────────────────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
  photoUrl:    z.string().url().optional(),
  username:    z.string().regex(/^[a-z0-9_]{3,32}$/, "3–32 lowercase alphanumeric or underscore").optional(),
});

export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

// ─── Report DTOs ──────────────────────────────────────────────────────────────

export const SubmitReportSchema = z.object({
  reportType: z.enum(["spam", "phishing", "fraud", "inappropriate", "other"]),
  notes:      z.string().max(500).optional(),
});

export type SubmitReportDto = z.infer<typeof SubmitReportSchema>;

// ─── Comment DTOs ─────────────────────────────────────────────────────────────

export const CreateCommentSchema = z.object({
  text:     z.string().min(1).max(1000),
  parentId: z.string().uuid().optional(),
});

export type CreateCommentDto = z.infer<typeof CreateCommentSchema>;

// ─── Common response envelope ────────────────────────────────────────────────

export function successResponse<T>(data: T) {
  return { data } as const;
}

export function errorResponse(code: string, message: string, status: number) {
  return { error: message, code, status } as const;
}
