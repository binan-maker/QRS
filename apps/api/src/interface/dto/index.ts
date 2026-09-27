/**
 * @interface/dto — Request/response Zod schemas
 */

import { z } from "zod";

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
  photoUrl:    z.string().url().optional(),
  username:    z.string().regex(/^[a-z0-9_]{3,32}$/, "3–32 lowercase alphanumeric or underscore").optional(),
});

export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

export const SubmitReportSchema = z.object({
  reportType: z.enum(["spam", "phishing", "fraud", "inappropriate", "other"]),
  notes:      z.string().max(500).optional(),
});

export type SubmitReportDto = z.infer<typeof SubmitReportSchema>;

export const CreateCommentSchema = z.object({
  text:     z.string().min(1).max(1000),
  parentId: z.string().uuid().optional(),
});

export type CreateCommentDto = z.infer<typeof CreateCommentSchema>;

export function successResponse<T>(data: T) {
  return { data } as const;
}

export function errorResponse(code: string, message: string, status: number) {
  return { error: message, code, status } as const;
}
