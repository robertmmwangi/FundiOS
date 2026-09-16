"use client";

import { useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

type ProfileRecord = {
  business_name?: string | null;
  trade_type?: string | null;
  phone?: string | null;
  vat_registered?: boolean | null;
  vat_number?: string | null;
};

export function ProfileEditor({ initialProfile }: { initialProfile: ProfileRecord | null }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    business_name: initialProfile?.business_name ?? "",
    trade_type: initialProfile?.trade_type ?? "",
    phone: initialProfile?.phone ?? "",
    vat_registered: initialProfile?.vat_registered ?? false,
    vat_number: initialProfile?.vat_number ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Please sign in again to continue.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        business_name: formData.business_name.trim(),
        trade_type: formData.trade_type.trim(),
        phone: formData.phone.trim(),
        vat_registered: formData.vat_registered,
        vat_number: formData.vat_registered ? formData.vat_number.trim() || null : null,
      })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setMessage("Profile updated.");
    setEditing(false);
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {!editing ? (
        <>
          <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Business</p>
              <p className="mt-1 text-base text-white">{initialProfile?.business_name || "Not set"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400">VAT</p>
              <p className="mt-1 text-base text-white">{initialProfile?.vat_registered ? `Registered${initialProfile.vat_number ? ` · ${initialProfile.vat_number}` : ""}` : "Not registered"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Trade</p>
              <p className="mt-1 text-base text-white">{initialProfile?.trade_type || "Not set"}</p>
            </div>
            <label className="flex items-center gap-3 text-sm font-medium text-slate-200">
              <input type="checkbox" checked={formData.vat_registered} onChange={(event) => setFormData((current) => ({ ...current, vat_registered: event.target.checked }))} />
              VAT registered
            </label>
            {formData.vat_registered && (
              <div>
                <label htmlFor="vat_number" className="mb-2 block text-sm font-medium text-slate-200">VAT number</label>
                <input id="vat_number" value={formData.vat_number} onChange={(event) => handleChange("vat_number", event.target.value)} placeholder="P051234567X" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-500" />
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Phone</p>
              <p className="mt-1 text-base text-white">{initialProfile?.phone || "Not set"}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-xl border border-sky-500/60 bg-sky-500/10 px-4 py-2.5 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20"
          >
            Edit profile
          </button>
        </>
      ) : (
        <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div>
            <label htmlFor="business_name" className="mb-2 block text-sm font-medium text-slate-200">
              Business name
            </label>
            <input
              id="business_name"
              value={formData.business_name}
              onChange={(event) => handleChange("business_name", event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-500"
            />
          </div>

          <div>
            <label htmlFor="trade_type" className="mb-2 block text-sm font-medium text-slate-200">
              Trade type
            </label>
            <input
              id="trade_type"
              value={formData.trade_type}
              onChange={(event) => handleChange("trade_type", event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-500"
            />
          </div>

          <div>
            <label htmlFor="phone" className="mb-2 block text-sm font-medium text-slate-200">
              Phone
            </label>
            <input
              id="phone"
              value={formData.phone}
              onChange={(event) => handleChange("phone", event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-500"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && <p className="text-sm text-emerald-400">{message}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
