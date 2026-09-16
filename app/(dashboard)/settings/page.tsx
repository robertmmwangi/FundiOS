import { redirect } from "next/navigation";

import { ProfileEditor } from "@/components/ProfileEditor";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name, trade_type, phone, vat_registered, vat_number")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-sky-400">FundiOS</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Settings</h1>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/30 sm:p-7">
        <ProfileEditor initialProfile={profile} />
      </div>

      <a
        href="/auth/logout"
        className="inline-flex w-full items-center justify-center rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
      >
        Sign out
      </a>
    </div>
  );
}
