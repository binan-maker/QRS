import { NextResponse } from "next/server";
import { calculateTrustScore } from "@services/trust/trust-service";
import { getMergedQrVotesSummary } from "@services/moderation/report-service";
import { getServerSupabase } from "@/lib/qr-data";
import { isValidQrId } from "@/lib/web-security";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ qr: string }> }
) {
  const { qr } = await params;
  const qrId = qr;
  if (!qrId || !isValidQrId(qrId)) {
    return NextResponse.json(
      { reportCounts: {}, weightedCounts: {}, trust: { score: -1, label: "Unrated", totalReports: 0 } },
      { status: 400 }
    );
  }

  try {
    const supabase = getServerSupabase();
    const { counts, weighted } = await getMergedQrVotesSummary(
      qrId,
      supabase ?? undefined
    );
    const trust = calculateTrustScore(counts, weighted);

    return NextResponse.json({
      reportCounts: counts,
      weightedCounts: weighted,
      trust,
    });
  } catch {
    return NextResponse.json({
      reportCounts: {},
      weightedCounts: {},
      trust: { score: -1, label: "Unrated", totalReports: 0 },
    });
  }
}
