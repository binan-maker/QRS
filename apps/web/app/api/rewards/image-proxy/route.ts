import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Proxy route for vCommission and partner affiliate creatives.
 * Bypasses CORS, mixed content (HTTP vs HTTPS), and hotlink referer blockers.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  let cleanUrl = targetUrl.trim();
  if (cleanUrl.startsWith("//")) {
    cleanUrl = `https:${cleanUrl}`;
  } else if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
    return new NextResponse("Invalid URL scheme", { status: 400 });
  }

  try {
    const upstreamRes = await fetch(cleanUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      redirect: "follow",
      cache: "force-cache",
    });

    if (!upstreamRes.ok) {
      return new NextResponse("Failed to fetch upstream image", {
        status: upstreamRes.status,
      });
    }

    const contentType =
      upstreamRes.headers.get("content-type") || "image/png";
    const imageBuffer = await upstreamRes.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    return new NextResponse(`Proxy error: ${err?.message || "Unknown"}`, {
      status: 502,
    });
  }
}
