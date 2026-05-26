export interface LocationData { lat: string; lon: string; label: string; }

export function parseLocation(content: string): LocationData {
  const lower = content.toLowerCase();
  if (lower.startsWith("geo:")) {
    const afterGeo = content.slice(4);
    const [coordsPart, queryPart = ""] = afterGeo.split("?");
    const [lat = "", lon = ""] = coordsPart.split(",");
    const label = new URLSearchParams(queryPart).get("q") || "";
    return { lat: lat.trim(), lon: lon.trim(), label: label ? decodeURIComponent(label) : "" };
  }
  if (lower.includes("maps.google.com") || lower.includes("goo.gl/maps")) {
    try {
      const u = new URL(content);
      const q = u.searchParams.get("q") || "";
      return { lat: "", lon: "", label: q ? decodeURIComponent(q) : content };
    } catch {}
  }
  return { lat: "", lon: "", label: content };
}
