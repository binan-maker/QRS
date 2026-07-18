/**
 * @infrastructure/ai — AI provider adapter (OpenAI)
 *
 * Used for:
 *   - AI QR generation (currently in routes/ai-qr.ts)
 *   - Content analysis and description generation
 *
 * Phase 3: route handlers call application use cases which use IAiProvider.
 */

export interface IAiProvider {
  generateQrContent(prompt: string): Promise<string>;
  analyseContent(content: string): Promise<{ safe: boolean; summary: string }>;
}

// Placeholder — OpenAiProvider implemented in Phase 3.
export {};
