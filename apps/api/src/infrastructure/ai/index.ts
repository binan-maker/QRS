/**
 * @infrastructure/ai — OpenAI adapter implementation
 *
 * Implements IAiProvider using the OpenAI Chat Completions API.
 * Supports both the official key (OPENAI_API_KEY) and the Replit-managed
 * integration key (AI_INTEGRATIONS_OPENAI_API_KEY).
 * The application layer never imports openai or fetch directly.
 */

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IAiProvider {
  /** Generate QR content string from a natural-language prompt. */
  generateQrContent(prompt: string): Promise<string>;
  /** Analyse content for safety — returns safe flag + short summary. */
  analyseContent(content: string): Promise<{ safe: boolean; summary: string }>;
}

// ─── OpenAiProvider ───────────────────────────────────────────────────────────

const QR_CONTENT_SYSTEM_PROMPT = `You are a QR code content generator. Given a description, return ONLY the exact QR content string — no explanation, no markdown, no prose.

Supported formats:
- Website URL:    https://example.com
- UPI Payment:    upi://pay?pa=vpa@bank&pn=Name&cu=INR
- WiFi:           WIFI:S:NetworkName;T:WPA;P:Password;;
- Phone call:     tel:+919876543210
- Email:          mailto:email@example.com?subject=Subject&body=Body
- Contact (vCard): BEGIN:VCARD\\nVERSION:3.0\\nFN:Full Name\\nTEL;TYPE=CELL:+91number\\nEMAIL;TYPE=INTERNET:email\\nEND:VCARD
- SMS:            SMSTO:+919876543210:Your message here
- Plain text:     the text itself

Return ONLY the QR content string.`;

const SAFETY_SYSTEM_PROMPT = `You are a content safety classifier. Given a string (URL or text), respond with a JSON object:
{ "safe": boolean, "summary": "one sentence" }
"safe" is false if the content is phishing, malware, adult, illegal, or deceptive. Always respond with valid JSON only.`;

export class OpenAiProvider implements IAiProvider {
  private get apiKey(): string | null {
    return (
      process.env.OPENAI_API_KEY ??
      process.env.AI_INTEGRATIONS_OPENAI_API_KEY ??
      null
    );
  }

  private get baseUrl(): string {
    return (
      process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ??
      "https://api.openai.com/v1"
    );
  }

  private async chat(
    systemPrompt: string,
    userMessage: string,
    maxTokens = 256,
  ): Promise<string> {
    const key = this.apiKey;
    if (!key) throw new Error("OpenAI API key not configured (OPENAI_API_KEY)");

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model:      "gpt-4o-mini",
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userMessage  },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenAI API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const json: any = await res.json();
    return (json.choices?.[0]?.message?.content ?? "").trim();
  }

  async generateQrContent(prompt: string): Promise<string> {
    return this.chat(QR_CONTENT_SYSTEM_PROMPT, prompt, 256);
  }

  async analyseContent(content: string): Promise<{ safe: boolean; summary: string }> {
    const raw = await this.chat(SAFETY_SYSTEM_PROMPT, content, 128);
    try {
      return JSON.parse(raw);
    } catch {
      return { safe: true, summary: raw };
    }
  }
}

// ─── Availability check ───────────────────────────────────────────────────────

export function isAiAvailable(): boolean {
  return !!(
    process.env.OPENAI_API_KEY ??
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY
  );
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _instance: OpenAiProvider | null = null;

export function getAiProvider(): OpenAiProvider {
  if (!_instance) _instance = new OpenAiProvider();
  return _instance;
}
