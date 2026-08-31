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
  /** Analyse content for safety — returns safe flag + short summary. */
  analyseContent(content: string): Promise<{ safe: boolean; summary: string }>;
}

// ─── OpenAiProvider ───────────────────────────────────────────────────────────

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
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenAI API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const json: any = await res.json();
    return (json.choices?.[0]?.message?.content ?? "").trim();
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
