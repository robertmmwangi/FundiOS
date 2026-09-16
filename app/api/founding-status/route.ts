import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const [{ data: openRow }, { data: capRow }, { count }] = await Promise.all([
    supabase.from("config").select("value").eq("key", "founding_program_open").maybeSingle(),
    supabase.from("config").select("value").eq("key", "founding_program_cap").maybeSingle(),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_founding_member", true),
  ]);

  const open = Boolean(openRow?.value ?? false);
  const cap = Number(capRow?.value ?? 500);
  const remaining = Math.max(cap - (count ?? 0), 0);

  return NextResponse.json({ open, remaining, cap });
}
