import type { Express, Request, Response } from "express";

export function registerAiQrRoute(app: Express): void {
  app.post("/api/ai/qr-generate", async (req: Request, res: Response) => {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
      return res.status(400).json({ error: "Prompt is required (min 3 characters)." });
    }
    const p = prompt.trim();

    if (process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
      const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
      const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1";
      try {
        const openaiRes = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            max_tokens: 256,
            messages: [
              {
                role: "system",
                content: `You are a QR code content generator. Given a description, return ONLY the exact QR content string, no explanation, no markdown.

Use these formats:
- Website: https://example.com
- UPI Payment: upi://pay?pa=vpa@bank&pn=Name&cu=INR
- WiFi: WIFI:S:NetworkName;T:WPA;P:Password;;
- Phone call: tel:+919876543210
- Email: mailto:email@example.com?subject=Subject&body=Body
- Contact card: BEGIN:VCARD\\nVERSION:3.0\\nFN:Full Name\\nTEL;TYPE=CELL:+91number\\nEMAIL;TYPE=INTERNET:email\\nEND:VCARD
- SMS: SMSTO:+919876543210:Your message here
- Plain text: the text itself

Return ONLY the QR content string.`,
              },
              { role: "user", content: p },
            ],
          }),
          signal: AbortSignal.timeout(30000),
        });
        if (openaiRes.ok) {
          const data: any = await openaiRes.json();
          const content = data.choices?.[0]?.message?.content?.trim();
          if (content) return res.json({ content, source: "ai" });
        }
      } catch (e) {
        console.warn("[AI QR] OpenAI call failed, using smart parser:", e);
      }
    }

    // Smart parser fallback
    const lower = p.toLowerCase();

    const urlExact = p.match(/https?:\/\/[^\s,]+/);
    if (urlExact) return res.json({ content: urlExact[0], source: "parser", typeName: "Website URL" });

    const bareDomain = p.match(/^(?:www\.)?[\w-]+\.(com|in|org|net|io|app|co|edu|gov|dev|ai|me)(?:\/[^\s]*)?$/i);
    if (bareDomain) return res.json({ content: `https://${p.replace(/^www\./i, "www.")}`, source: "parser", typeName: "Website URL" });

    if (/\bwi-?fi\b|\bssid\b|\bnetwork\b.*\bpass|\bpass.*\bnetwork/.test(lower)) {
      const ssidMatch = p.match(/(?:ssid|network(?:\s+name)?|named?|called?|for)\s*[:"']?\s*([^,\n"']+?)(?:\s*[,\n]|$)/i) ?? p.match(/^([^,]+),/);
      const passMatch = p.match(/(?:password|pwd|pass(?:word)?)\s*[:"']?\s*([^\s,\n"']+)/i);
      const ssid = (ssidMatch?.[1] ?? "").trim() || "MyNetwork";
      const pass = (passMatch?.[1] ?? "").trim();
      return res.json({ content: `WIFI:S:${ssid};T:${pass ? "WPA" : "nopass"};P:${pass};;`, source: "parser", typeName: "WiFi Network" });
    }

    const vpaMatch = p.match(/[\w.\-]+@(?:upi|paytm|razorpay|okaxis|ybl|oksbi|apl|ibl|icici|sbi|hdfc|axis|kotak|freecharge|airtel|juspay|pockets|waicici|okicici|okhdfcbank|kkbkupi|barodampay|mahb|unionbank|cnrb|aubank)\b/i) ?? p.match(/[\w.\-]{3,}@[\w]{2,}/);
    if (vpaMatch || /\b(?:upi|payment|pay|₹|rupee)\b/.test(lower)) {
      const vpa = vpaMatch?.[0] ?? "user@upi";
      const amountMatch = p.match(/₹\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:rs|rupees?|inr|₹)/i);
      const amount = (amountMatch?.[1] ?? amountMatch?.[2] ?? "").trim();
      const nameMatch = p.match(/(?:for|to|name[:\s]*)\s+([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)*)/i) ?? p.match(/(?:payee|recipient)[:\s]+([A-Za-z ]+)/i);
      const name = (nameMatch?.[1] ?? "").trim() || "Payee";
      const noteMatch = p.match(/(?:note|memo|ref|purpose|tn)[:\s]+([^,\n]+)/i);
      const note = (noteMatch?.[1] ?? "").trim();
      let content = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(name)}&cu=INR`;
      if (amount) content += `&am=${amount}`;
      if (note) content += `&tn=${encodeURIComponent(note)}`;
      return res.json({ content, source: "parser", typeName: "UPI Payment" });
    }

    const phoneKw  = /\b(?:call|phone|tel|mobile|contact|ring)\b/.test(lower);
    const phoneNum = p.match(/(\+?[\d][\d\s\-().]{8,14}[\d])/);
    if (phoneKw && phoneNum) {
      return res.json({ content: `tel:${phoneNum[1].replace(/[\s\-()]/g, "")}`, source: "parser", typeName: "Phone Number" });
    }

    const emailMatch = p.match(/[\w.+\-]+@[\w\-]+\.[a-z]{2,}/i);
    if (emailMatch) {
      const subjectMatch = p.match(/subject[:\s]+([^,\n]+)/i);
      const bodyMatch    = p.match(/(?:body|message|msg)[:\s]+([^\n]+)/i);
      let content = `mailto:${emailMatch[0]}`;
      const params: string[] = [];
      if (subjectMatch?.[1]) params.push(`subject=${encodeURIComponent(subjectMatch[1].trim())}`);
      if (bodyMatch?.[1])    params.push(`body=${encodeURIComponent(bodyMatch[1].trim())}`);
      if (params.length) content += `?${params.join("&")}`;
      return res.json({ content, source: "parser", typeName: "Email" });
    }

    if (/\bsms\b|\btext\s+message\b|\bwhatsapp\b/.test(lower) && phoneNum) {
      const msgMatch = p.match(/(?:message|msg|text|saying)[:\s]+([^\n]+)/i);
      return res.json({ content: `SMSTO:${phoneNum[1].replace(/[\s\-()]/g, "")}:${(msgMatch?.[1] ?? "").trim()}`, source: "parser", typeName: "SMS" });
    }

    if (/\b(?:contact|vcard|v-card|business card|name card)\b/.test(lower)) {
      const nameM  = p.match(/(?:name[:\s]+|^)([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)+)/i);
      const phoneM = p.match(/(\+?[\d][\d\s\-().]{8,14}[\d])/);
      const emailM = p.match(/[\w.+\-]+@[\w\-]+\.[a-z]{2,}/i);
      const orgM   = p.match(/(?:company|org|organization|business)[:\s]+([A-Za-z ]+)/i);
      const lines  = ["BEGIN:VCARD", "VERSION:3.0", `FN:${(nameM?.[1] ?? "Contact").trim()}`];
      if (phoneM) lines.push(`TEL;TYPE=CELL:${phoneM[1].replace(/[\s\-()]/g, "")}`);
      if (emailM) lines.push(`EMAIL;TYPE=INTERNET:${emailM[0]}`);
      if (orgM)   lines.push(`ORG:${orgM[1].trim()}`);
      lines.push("END:VCARD");
      return res.json({ content: lines.join("\n"), source: "parser", typeName: "Contact Card" });
    }

    return res.json({ content: p, source: "parser", typeName: "Plain Text" });
  });
}
