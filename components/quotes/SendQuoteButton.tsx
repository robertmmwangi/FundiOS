"use client";

import { useState } from "react";
import { Send } from "lucide-react";

import { getJob, updateJobStatus } from "@/lib/queries/jobs";

const money = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

export function SendQuoteButton({
  jobId,
  customerPhone,
  customerName,
  businessName,
  total,
  jobTitle,
  onSent,
}: {
  jobId: string;
  customerPhone: string | null | undefined;
  customerName: string;
  businessName: string;
  total: number;
  jobTitle: string;
  onSent?: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasPhone = Boolean(customerPhone?.trim());

  const sendQuote = async () => {
    if (!hasPhone || sending) return;
    const phone = customerPhone?.replace(/\D/g, "");
    if (!phone) return;
    setSending(true);
    setError(null);

    try {
      const job = await getJob(jobId);
      if (job.status === "enquiry") {
        await updateJobStatus(jobId, "quoted");
        onSent?.();
      }

      const quoteUrl = `${window.location.origin}/q/${jobId}`;
      const message = `Hi ${customerName}, here is your quote from ${businessName} for ${jobTitle}. Total: ${money.format(total)}. View and accept it here: ${quoteUrl}`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    } catch (errorObject) {
      setError(errorObject instanceof Error ? errorObject.message : "Unable to send quote.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => void sendQuote()}
        disabled={!hasPhone || sending}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Send size={16} />
        {sending ? "Preparing..." : "Send quote via WhatsApp"}
      </button>
      {!hasPhone && <p className="mt-2 text-xs text-slate-500">Add a customer phone number to send this quote.</p>}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
