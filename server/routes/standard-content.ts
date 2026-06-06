import type { Response } from "express";
import { guardShell, escHtml, escAttr } from "../templates/guard-html";
import type { StandardLinkFields } from "../lib/firebase-client";

export function serveStandardContent(res: Response, link: StandardLinkFields, _uuid: string): void {
  const { rawContent, contentType, ownerName } = link;

  if (!link.isActive) {
    (res as any).status(200).send(guardShell("QR Code Deactivated", `
<div class="icon">🔒</div>
<div class="badge badge-dead">Deactivated</div>
<h1>QR Code Unavailable</h1>
<p>The owner has deactivated this QR code. Please contact them directly.</p>
<button onclick="history.back()" class="btn btn-back">← Go Back</button>
`));
    return;
  }

  if (rawContent.startsWith("https://") || rawContent.startsWith("http://")) {
    (res as any).setHeader("Cache-Control", "no-store, no-cache");
    (res as any).redirect(302, rawContent);
    return;
  }

  if (rawContent.startsWith("upi://")) {
    (res as any).status(200).send(guardShell("UPI Payment", `
<div class="icon">💳</div>
<div class="badge badge-shield">✦ BinRo Protected</div>
<h1>UPI Payment</h1>
<p style="margin-bottom:8px">by ${escHtml(ownerName)}</p>
<hr class="divider">
<div class="label">UPI Deep Link</div>
<div class="url-box">${escHtml(rawContent)}</div>
<a href="${escAttr(rawContent)}" class="btn btn-go">Open in UPI App →</a>
<p style="margin-top:14px;font-size:12px;color:#64748b">Works with PhonePe, GPay, Paytm, BHIM and all UPI apps</p>
`));
    return;
  }

  if (rawContent.startsWith("WIFI:")) {
    const ssidMatch = rawContent.match(/S:([^;]+);/);
    const passMatch = rawContent.match(/P:([^;]*);/);
    const typeMatch = rawContent.match(/T:([^;]+);/);
    const ssid = ssidMatch ? ssidMatch[1] : "Unknown";
    const pass = passMatch ? passMatch[1] : "";
    const security = typeMatch ? typeMatch[1] : "WPA";
    (res as any).status(200).send(guardShell("WiFi Credentials", `
<div class="icon">📶</div>
<div class="badge badge-shield">✦ BinRo Protected</div>
<h1>WiFi Network</h1>
<p style="margin-bottom:8px">Shared by ${escHtml(ownerName)}</p>
<hr class="divider">
<div class="label">Network Name (SSID)</div>
<div class="val">${escHtml(ssid)}</div>
<div class="label">Security</div>
<div class="val">${escHtml(security === "nopass" ? "Open (no password)" : security)}</div>
${pass ? `<div class="label">Password</div><div class="val">${escHtml(pass)}</div>` : ""}
<p style="font-size:12px;color:#64748b;margin-top:8px">Open WiFi settings on your device to connect manually</p>
`));
    return;
  }

  if (rawContent.startsWith("BEGIN:VCARD")) {
    const nameMatch  = rawContent.match(/FN:([^\r\n]+)/);
    const telMatch   = rawContent.match(/TEL[^:]*:([^\r\n]+)/);
    const emailMatch = rawContent.match(/EMAIL[^:]*:([^\r\n]+)/);
    const displayName = nameMatch ? nameMatch[1] : "Contact";
    const dataUri = `data:text/vcard;charset=utf-8,${encodeURIComponent(rawContent)}`;
    (res as any).status(200).send(guardShell("Contact Card", `
<div class="icon">👤</div>
<div class="badge badge-shield">✦ BinRo Protected</div>
<h1>${escHtml(displayName)}</h1>
<p style="margin-bottom:8px">Shared by ${escHtml(ownerName)}</p>
<hr class="divider">
${telMatch   ? `<div class="label">Phone</div><div class="val">${escHtml(telMatch[1])}</div>` : ""}
${emailMatch ? `<div class="label">Email</div><div class="val">${escHtml(emailMatch[1])}</div>` : ""}
<a href="${escAttr(dataUri)}" download="contact.vcf" class="btn btn-go">Save Contact →</a>
`));
    return;
  }

  if (rawContent.startsWith("BEGIN:VCALENDAR")) {
    const summaryMatch  = rawContent.match(/SUMMARY:([^\r\n]+)/);
    const dtStartMatch  = rawContent.match(/DTSTART:([^\r\n]+)/);
    const locationMatch = rawContent.match(/LOCATION:([^\r\n]+)/);
    const title = summaryMatch ? summaryMatch[1] : "Event";
    const dtRaw = dtStartMatch ? dtStartMatch[1] : "";
    const dateStr = dtRaw
      ? `${dtRaw.slice(0,4)}-${dtRaw.slice(4,6)}-${dtRaw.slice(6,8)} at ${dtRaw.slice(9,11)}:${dtRaw.slice(11,13)}`
      : "";
    const dataUri = `data:text/calendar;charset=utf-8,${encodeURIComponent(rawContent)}`;
    (res as any).status(200).send(guardShell("Calendar Event", `
<div class="icon">📅</div>
<div class="badge badge-shield">✦ BinRo Protected</div>
<h1>${escHtml(title)}</h1>
<p style="margin-bottom:8px">Shared by ${escHtml(ownerName)}</p>
<hr class="divider">
${dateStr       ? `<div class="label">When</div><div class="val">${escHtml(dateStr)}</div>` : ""}
${locationMatch ? `<div class="label">Where</div><div class="val">${escHtml(locationMatch[1])}</div>` : ""}
<a href="${escAttr(dataUri)}" download="event.ics" class="btn btn-go">Add to Calendar →</a>
`));
    return;
  }

  if (rawContent.startsWith("tel:")) {
    const number = rawContent.replace("tel:", "");
    (res as any).status(200).send(guardShell("Phone Call", `
<div class="icon">📞</div>
<div class="badge badge-shield">✦ BinRo Protected</div>
<h1>Phone Number</h1>
<p style="margin-bottom:8px">Shared by ${escHtml(ownerName)}</p>
<hr class="divider">
<div class="label">Number</div>
<div class="val">${escHtml(number)}</div>
<a href="${escAttr(rawContent)}" class="btn btn-go">Tap to Call →</a>
`));
    return;
  }

  if (rawContent.startsWith("mailto:") || rawContent.startsWith("smsto:") || rawContent.startsWith("sms:")) {
    (res as any).setHeader("Cache-Control", "no-store, no-cache");
    (res as any).redirect(302, rawContent);
    return;
  }

  (res as any).status(200).send(guardShell("QR Content", `
<div class="icon">📄</div>
<div class="badge badge-shield">✦ BinRo Protected</div>
<h1>QR Content</h1>
<p style="margin-bottom:8px">Shared by ${escHtml(ownerName)}</p>
<hr class="divider">
<div class="url-box" style="text-align:center;font-size:14px;padding:16px">${escHtml(rawContent)}</div>
<button onclick="navigator.clipboard&&navigator.clipboard.writeText(${JSON.stringify(escAttr(rawContent))})" class="btn btn-go" style="margin-top:4px">Copy Content</button>
`));
}
