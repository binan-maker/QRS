/**
 * Server-side QR report persistence.
 *
 * Reports are stored in Supabase PostgreSQL. The API uses the service-role
 * client so validation, ownership, and the one-report-per-user constraint are
 * enforced here rather than trusting a browser or mobile client.
 */

import { getAdminClient } from "../lib/supabase-admin";

function accountWeight(createdAt: string | null, emailVerified: boolean): number {
  if (!createdAt) return emailVerified ? 0.1 : 0.01;
  const ageDays = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / 86_400_000);
  if (ageDays < 1 && !emailVerified) return 0.01;
  if (ageDays < 7) return 0.05;
  if (ageDays < 30) return 0.3;
  if (ageDays < 90) return emailVerified ? 0.7 : 0.3;
  if (ageDays < 180) return emailVerified ? 1.5 : 0.3;
  return emailVerified ? 2 : 0.3;
}

async function resolveQrForeignKey(client: any, qrId: string) {
  const [legacy, unified] = await Promise.all([
    client.from("qr_codes").select("id").eq("id", qrId).maybeSingle(),
    client.from("unified_qrs").select("id").eq("id", qrId).maybeSingle(),
  ]);
  if (legacy.error) throw legacy.error;
  if (unified.error) throw unified.error;
  if (legacy.data) return { qr_code_id: qrId };
  if (unified.data) return { unified_qr_id: qrId };
  return null;
}

export async function reportQrCode(
  qrId: string,
  userId: string,
  reportType: string,
  emailVerified = false,
): Promise<{ action: "created" | "updated" | "removed" }> {
  const client = getAdminClient();
  if (!client) throw new Error("Database not available");

  const foreignKey = await resolveQrForeignKey(client, qrId);
  if (!foreignKey) throw new Error("QR code not found");

  const { data: user, error: userError } = await client
    .from("users")
    .select("created_at")
    .eq("id", userId)
    .maybeSingle();
  if (userError) throw userError;

  const { data: existing, error: existingError } = await client
    .from("qr_reports")
    .select("id,report_type,user_removed")
    .match(foreignKey)
    .eq("user_id", userId)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing?.report_type === reportType && !existing.user_removed) {
    const { error } = await client.from("qr_reports").update({
      user_removed: true,
      removed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", existing.id);
    if (error) throw error;
    return { action: "removed" };
  }

  const row = {
    ...foreignKey,
    user_id: userId,
    report_type: reportType,
    weight: accountWeight(user?.created_at ?? null, emailVerified),
    account_age_days: user?.created_at
      ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86_400_000)
      : 0,
    email_verified: emailVerified,
    user_removed: false,
    removed_at: null,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await client.from("qr_reports").update(row).eq("id", existing.id);
    if (error) throw error;
    return { action: "updated" };
  }

  const { error } = await client.from("qr_reports").insert(row);
  if (error) throw error;
  return { action: "created" };
}