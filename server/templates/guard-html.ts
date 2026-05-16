export function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function escAttr(s: string): string {
  return s.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function guardShell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — QR Guard</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    background:#0a0e17;color:#f8fafc;min-height:100vh;
    display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px}
  .card{background:#151b2e;border:1px solid #1e2a40;border-radius:20px;
    padding:32px 28px;max-width:420px;width:100%;text-align:center}
  .icon{font-size:48px;margin-bottom:12px}
  h1{font-size:22px;font-weight:700;margin-bottom:8px}
  p{font-size:14px;color:#94a3b8;line-height:1.6;margin-bottom:16px}
  .badge{display:inline-flex;align-items:center;gap:6px;
    padding:5px 14px;border-radius:999px;font-size:12px;font-weight:600;margin-bottom:18px}
  .badge-shield{background:#0d2135;border:1px solid #0ea5e9;color:#38bdf8}
  .badge-warn{background:#2a1b05;border:1px solid #d97706;color:#fbbf24}
  .badge-dead{background:#200a0a;border:1px solid #ef4444;color:#f87171}
  .label{font-size:11px;color:#64748b;letter-spacing:.04em;text-transform:uppercase;margin-bottom:4px}
  .val{font-size:15px;font-weight:600;color:#e2e8f0;margin-bottom:16px;word-break:break-all}
  .url-box{background:#0a0e17;border:1px solid #1e2a40;border-radius:10px;
    padding:10px 14px;font-size:12px;color:#60a5fa;word-break:break-all;text-align:left;margin-bottom:16px}
  .btn{display:block;width:100%;padding:14px;border-radius:12px;
    font-size:16px;font-weight:700;text-decoration:none;border:none;cursor:pointer;margin-top:8px}
  .btn-go{background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff}
  .btn-warn{background:#d97706;color:#fff}
  .btn-back{background:#1e2a40;color:#94a3b8;font-size:14px}
  .divider{border:none;border-top:1px solid #1e2a40;margin:16px 0}
  .app-link{font-size:12px;color:#475569;margin-top:20px}
  .app-link a{color:#3b82f6;text-decoration:none}
</style>
</head><body>
<div class="card">${body}</div>
<p class="app-link">Protected by <a href="https://qrguard.app">QR Guard</a></p>
</body></html>`;
}

export function guardRedirectHtml(businessName: string, ownerName: string, destination: string): string {
  return guardShell("Redirecting", `
<div class="icon">🛡️</div>
<div class="badge badge-shield">✦ Living Shield QR</div>
<h1>${escHtml(businessName)}</h1>
<p style="margin-bottom:8px">by ${escHtml(ownerName)}</p>
<hr class="divider">
<div class="label">Destination</div>
<div class="url-box">${escHtml(destination)}</div>
<p>Redirecting you now…</p>
<a href="${escAttr(destination)}" class="btn btn-go">Go to Destination →</a>
<meta http-equiv="refresh" content="0;url=${escAttr(destination)}">
`);
}

export function guardCautionHtml(businessName: string, ownerName: string, destination: string, _uuid: string): string {
  return guardShell("Caution — Destination Changed", `
<div class="icon">⚠️</div>
<div class="badge badge-warn">⚡ Destination Recently Changed</div>
<h1>${escHtml(businessName)}</h1>
<p style="margin-bottom:8px">by ${escHtml(ownerName)}</p>
<hr class="divider">
<p>This QR code's destination was changed in the last 24 hours. Please verify you trust this business before proceeding.</p>
<div class="label">New Destination</div>
<div class="url-box">${escHtml(destination)}</div>
<a href="${escAttr(destination)}" class="btn btn-warn">I Understand — Proceed Anyway</a>
<button onclick="history.back()" class="btn btn-back" style="margin-top:8px">← Go Back</button>
`);
}

export function guardDeactivatedHtml(businessName: string | null): string {
  return guardShell("QR Code Deactivated", `
<div class="icon">🔒</div>
<div class="badge badge-dead">Deactivated</div>
<h1>${escHtml(businessName || "This QR Code")}</h1>
<p>The owner has temporarily deactivated this QR code. Please contact the business directly for assistance.</p>
<button onclick="history.back()" class="btn btn-back">← Go Back</button>
`);
}

export function guardNotFoundHtml(): string {
  return guardShell("QR Code Not Found", `
<div class="icon">🔍</div>
<div class="badge badge-dead">Not Found</div>
<h1>QR Code Not Found</h1>
<p>This QR code could not be found. It may have been removed or the link may be incorrect.</p>
<button onclick="history.back()" class="btn btn-back">← Go Back</button>
`);
}

export function guardUpiHtml(ownerName: string, rawContent: string): string {
  return guardShell("UPI Payment", `
<div class="icon">💳</div>
<div class="badge badge-shield">✦ QR Guard Protected</div>
<h1>UPI Payment</h1>
<p style="margin-bottom:8px">by ${escHtml(ownerName)}</p>
<hr class="divider">
<div class="label">UPI Deep Link</div>
<div class="url-box">${escHtml(rawContent)}</div>
<a href="${escAttr(rawContent)}" class="btn btn-go">Open in UPI App →</a>
<p style="margin-top:14px;font-size:12px;color:#64748b">Works with PhonePe, GPay, Paytm, BHIM and all UPI apps</p>
`);
}

export function guardWifiHtml(ownerName: string, ssid: string, pass: string, security: string): string {
  return guardShell("WiFi Credentials", `
<div class="icon">📶</div>
<div class="badge badge-shield">✦ QR Guard Protected</div>
<h1>WiFi Network</h1>
<p style="margin-bottom:8px">Shared by ${escHtml(ownerName)}</p>
<hr class="divider">
<div class="label">Network Name (SSID)</div>
<div class="val">${escHtml(ssid)}</div>
<div class="label">Security</div>
<div class="val">${escHtml(security === "nopass" ? "Open (no password)" : security)}</div>
${pass ? `<div class="label">Password</div><div class="val">${escHtml(pass)}</div>` : ""}
<p style="font-size:12px;color:#64748b;margin-top:8px">Open WiFi settings on your device to connect manually</p>
`);
}

export function guardContactHtml(ownerName: string, displayName: string, telMatch: string | null, emailMatch: string | null, dataUri: string): string {
  return guardShell("Contact Card", `
<div class="icon">👤</div>
<div class="badge badge-shield">✦ QR Guard Protected</div>
<h1>${escHtml(displayName)}</h1>
<p style="margin-bottom:8px">Shared by ${escHtml(ownerName)}</p>
<hr class="divider">
${telMatch ? `<div class="label">Phone</div><div class="val">${escHtml(telMatch)}</div>` : ""}
${emailMatch ? `<div class="label">Email</div><div class="val">${escHtml(emailMatch)}</div>` : ""}
<a href="${escAttr(dataUri)}" download="contact.vcf" class="btn btn-go">Save Contact →</a>
`);
}

export function guardCalendarHtml(ownerName: string, title: string, dateStr: string, locationMatch: string | null, dataUri: string): string {
  return guardShell("Calendar Event", `
<div class="icon">📅</div>
<div class="badge badge-shield">✦ QR Guard Protected</div>
<h1>${escHtml(title)}</h1>
<p style="margin-bottom:8px">Shared by ${escHtml(ownerName)}</p>
<hr class="divider">
${dateStr ? `<div class="label">When</div><div class="val">${escHtml(dateStr)}</div>` : ""}
${locationMatch ? `<div class="label">Where</div><div class="val">${escHtml(locationMatch)}</div>` : ""}
<a href="${escAttr(dataUri)}" download="event.ics" class="btn btn-go">Add to Calendar →</a>
`);
}

export function guardPhoneHtml(ownerName: string, number: string, rawContent: string): string {
  return guardShell("Phone Call", `
<div class="icon">📞</div>
<div class="badge badge-shield">✦ QR Guard Protected</div>
<h1>Phone Number</h1>
<p style="margin-bottom:8px">Shared by ${escHtml(ownerName)}</p>
<hr class="divider">
<div class="label">Number</div>
<div class="val">${escHtml(number)}</div>
<a href="${escAttr(rawContent)}" class="btn btn-go">Tap to Call →</a>
`);
}

export function guardGenericHtml(ownerName: string, rawContent: string): string {
  return guardShell("QR Content", `
<div class="icon">📄</div>
<div class="badge badge-shield">✦ QR Guard Protected</div>
<h1>QR Content</h1>
<p style="margin-bottom:8px">Shared by ${escHtml(ownerName)}</p>
<hr class="divider">
<div class="url-box" style="text-align:center;font-size:14px;padding:16px">${escHtml(rawContent)}</div>
<button onclick="navigator.clipboard&&navigator.clipboard.writeText(${JSON.stringify(escAttr(rawContent))})" class="btn btn-go" style="margin-top:4px">Copy Content</button>
`);
}
