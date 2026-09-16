"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Code,
  Cog,
  Flame,
  Hammer,
  HardHat,
  MonitorSmartphone,
  MoreHorizontal,
  Paintbrush,
  Palette,
  PartyPopper,
  Settings2,
  SprayCan,
  Sparkles,
  UtensilsCrossed,
  Wind,
  Wrench,
  Zap,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useOnboardingStore } from "@/stores/onboarding";

const tradeOptions = [
  { label: "Plumber", icon: Wrench },
  { label: "Electrician", icon: Zap },
  { label: "Welder", icon: Flame },
  { label: "Carpenter", icon: Hammer },
  { label: "Mechanic", icon: Cog },
  { label: "Painter", icon: Paintbrush },
  { label: "Builder", icon: HardHat },
  { label: "Photographer", icon: Camera },
  { label: "Caterer", icon: UtensilsCrossed },
  { label: "Decorator", icon: Sparkles },
  { label: "Event supplier", icon: PartyPopper },
  { label: "IT technician", icon: MonitorSmartphone },
  { label: "Graphic designer", icon: Palette },
  { label: "Web developer", icon: Code },
  { label: "Cleaning", icon: SprayCan },
  { label: "AC technician", icon: Wind },
  { label: "Appliance repair", icon: Settings2 },
  { label: "Other", value: "other", icon: MoreHorizontal },
] as const;

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("254")) return `+${digits}`;
  if (digits.startsWith("0")) return `+254${digits.slice(1)}`;
  return `+254${digits}`;
}

export default function OnboardingPage() {
  const router = useRouter();
  const {
    businessName,
    phone,
    tradeType,
    logoFile,
    setBusinessName,
    setPhone,
    setTradeType,
    setLogoFile,
    reset,
  } = useOnboardingStore();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customTradeType, setCustomTradeType] = useState("");
  const customTradeInputRef = useRef<HTMLInputElement>(null);

  const normalizedPhone = useMemo(() => normalizePhone(phone), [phone]);
  const savedTradeType =
    tradeType === "other" && customTradeType.trim()
      ? `other:${customTradeType.trim()}`
      : tradeType;

  useEffect(() => {
    if (step === 2 && tradeType === "other") {
      customTradeInputRef.current?.focus();
    }
  }, [step, tradeType]);

  const validation = [
    businessName.trim().length >= 2,
    normalizedPhone.length > 0,
    Boolean(tradeType) && (tradeType !== "other" || customTradeType.trim().length >= 2),
    true,
  ];
  const currentValid = validation[step];

  const stepTitle = ["Business name", "Phone number", "Trade type", "Summary"][step];

  const handleNext = () => {
    if (!currentValid || step >= 3) return;
    setStep((current) => current + 1);
  };

  const handleBack = () => {
    if (step === 0) return;
    setStep((current) => current - 1);
  };

  const handleFinish = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Please sign in again to continue.");
        return;
      }

      let logoUrl: string | null = null;
      if (logoFile) {
        const extension = logoFile.name.includes(".") ? logoFile.name.split(".").pop() ?? "png" : "png";
        const filePath = `${user.id}/logo.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("logos")
          .upload(filePath, logoFile, { upsert: true, contentType: logoFile.type || "image/png" });

        if (uploadError) {
          setError(uploadError.message);
          return;
        }

        const { data: signedUrlData } = await supabase.storage.from("logos").createSignedUrl(filePath, 60 * 60 * 24 * 7);
        logoUrl = signedUrlData?.signedUrl ?? null;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          business_name: businessName.trim(),
          phone: normalizedPhone,
          trade_type: savedTradeType,
          logo_url: logoUrl,
          onboarding_complete: true,
        })
        .eq("id", user.id);

      if (profileError) {
        setError(profileError.message);
        return;
      }

      reset();
      router.push("/dashboard");
      router.refresh();
    } catch (errorObject) {
      setError(errorObject instanceof Error ? errorObject.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex items-center justify-center gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className={`h-2.5 w-2.5 rounded-full ${index === step ? "bg-sky-500" : "bg-slate-700"}`}
            aria-label={`Step ${index + 1}`}
          />
        ))}
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/30 sm:p-7">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-400">Step {step + 1}</p>
          <h1 className="mt-2 text-2xl font-bold text-white">{stepTitle}</h1>
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <label htmlFor="business-name" className="block text-sm font-medium text-slate-200">
              Business name
            </label>
            <input
              id="business-name"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder="e.g. Njeri Plumbing"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base text-white outline-none transition focus:border-sky-500"
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <label htmlFor="phone" className="block text-sm font-medium text-slate-200">
              Phone number
            </label>
            <input
              id="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="0712 345 678"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base text-white outline-none transition focus:border-sky-500"
            />
            {phone && normalizedPhone && <p className="text-sm text-slate-300">Saved as: {normalizedPhone}</p>}
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {tradeOptions.map((option) => {
                const tradeValue = "value" in option ? option.value : option.label;
                const { label, icon: Icon } = option;
                const selected = tradeType === tradeValue;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setTradeType(tradeValue)}
                    className={`flex min-h-28 flex-col items-center justify-center rounded-2xl border p-3 text-center transition ${
                      selected
                        ? "border-sky-500 bg-sky-500/10 text-sky-200"
                        : "border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-500"
                    }`}
                  >
                    <Icon size={24} className="mb-2" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                );
              })}
            </div>
            {tradeType === "other" && (
              <div className="mt-4">
                <label htmlFor="custom-trade-type" className="mb-2 block text-sm font-medium text-slate-200">
                  Tell us what you do
                </label>
                <input
                  ref={customTradeInputRef}
                  id="custom-trade-type"
                  value={customTradeType}
                  onChange={(event) => setCustomTradeType(event.target.value)}
                  placeholder="What do you do?"
                  maxLength={50}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base text-white outline-none transition focus:border-sky-500"
                />
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-slate-200">Business name</span>
                <span className="font-medium text-slate-100">{businessName}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800 py-3">
                <span className="text-slate-200">Phone</span>
                <span className="font-medium text-slate-100">{normalizedPhone}</span>
              </div>
              <div className="flex items-center justify-between pt-3">
                <span className="text-slate-200">Trade type</span>
                <span className="font-medium text-slate-100">{savedTradeType}</span>
              </div>
            </div>

            <div>
              <label htmlFor="logo-file" className="mb-2 block text-sm font-medium text-slate-200">
                Business logo (optional)
              </label>
              <input
                id="logo-file"
                type="file"
                accept="image/*"
                onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
              {logoFile && <p className="mt-2 text-sm text-slate-200">Selected: {logoFile.name}</p>}
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="mt-8 flex items-center justify-between gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
            >
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <span />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!currentValid}
              className="ml-auto inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={isSubmitting}
              className="ml-auto rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              {isSubmitting ? "Saving..." : "Finish setup"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
