import { NextRequest, NextResponse } from "next/server";
import { verifyReferralCode } from "@services/referrals";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = body?.code || "";
    const userId = body?.userId || null;
    const result = await verifyReferralCode(code, userId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, error: error?.message || "Internal error verifying referral code." },
      { status: 500 }
    );
  }
}
