import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({
      configured: false,
      connected: false,
      message: "Supabase environment variables are missing or empty.",
      details: {
        hasUrl: Boolean(url),
        hasKey: Boolean(key),
      },
    });
  }

  // Check if it's still placeholder text from .env.example
  if (url.includes("YOUR_PROJECT_REF") || key === "your_supabase_anon_key") {
    return NextResponse.json({
      configured: false,
      connected: false,
      message: "Supabase environment variables are currently set to placeholder values (YOUR_PROJECT_REF).",
      details: {
        url,
        isPlaceholder: true,
      },
    });
  }

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Test a basic lightweight ping against the database
    const { error: userError } = await supabase.from("users").select("id").limit(1);
    const { error: qrError } = await supabase.from("qr_codes").select("id").limit(1);

    if (userError && qrError) {
      return NextResponse.json({
        configured: true,
        connected: false,
        message: `Connected to Supabase endpoint, but tables could not be queried: ${userError.message}`,
        code: userError.code,
      });
    }

    return NextResponse.json({
      configured: true,
      connected: true,
      message: "Successfully connected to Supabase database. Tables are accessible.",
      endpoint: url,
      tables: {
        users: !userError,
        qr_codes: !qrError,
      },
    });
  } catch (err) {
    return NextResponse.json({
      configured: true,
      connected: false,
      message: `Failed to connect to Supabase: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}
