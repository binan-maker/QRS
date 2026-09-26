import { getAdminClient } from "../lib/supabase-admin";

function scoreUserAge(createdDate: string | null, emailVerified = false): number {
  if (!createdDate) return 0.1;
  const ageDays = (Date.now() - new Date(createdDate).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays < 7) return 0.05;
  if (ageDays < 30) return 0.3;
  if (ageDays < 90) return emailVerified ? 0.7 : 0.3;
  if (ageDays < 180) return emailVerified ? 1.5 : 0.3;
  return emailVerified ? 2 : 0.3;
}

export async function reportQrCode(
  qrId: string,
  userId: string,
  reportType: string,
  emailVerified = false,
): Promise<{ action: "created" | "updated" | "removed" }> {
  const client = getAdminClient();
  if (!client) throw new Error("Database not available");

  const { data: qr, error: qrError } = await client
    .from("qr_codes")
    .select("id")
    .eq("id", qrId)
    .maybeSingle();

  if (qrError) throw qrError;
  if (!qr) throw new Error("QR code not found");

  const { data: user, error: userError } = await client
    .from("users")
    .select("created_at")
    .eq("id", userId)
    .maybeSingle();
  if (userError) throw userError;

  const { data: existing, error: existingError } = await client
    .from("qr_reports")
    .select("id,report_type,user_removed")
    .eq("qr_code_id", qrId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    if (existing.report_type === reportType && !existing.user_removed) {
      const { error: removeError } = await client
        .from("qr_reports")
        .update({ user_removed: true, removed_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (removeError) throw removeError;
      return { action: "removed" };
    }

    const { error: updateError } = await client
      .from("qr_reports")
      .update({
        report_type: reportType,
        user_removed: false,
        removed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (updateError) throw updateError;
    return { action: "updated" };
  }

  const weight = scoreUserAge(user?.created_at ?? null, emailVerified);
  const accountAgeDays = user?.created_at
    ? Math.max(0, Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const { error: insertError } = await client.from("qr_reports").insert({
    qr_code_id: qrId,
    user_id: userId,
    report_type: reportType,
    weight,
    account_age_days: accountAgeDays,
    email_verified: emailVerified,
    user_removed: false,
  });
  if (insertError) throw insertError;
  return { action: "created" };
}
