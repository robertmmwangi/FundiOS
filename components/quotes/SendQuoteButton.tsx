"use client";

import { useState } from "react";
import { Send } from "lucide-react";

import { getJob, updateJobStatus } from "@/lib/queries/jobs";
import { getQuoteItems } from "@/lib/queries/quote-items";
import type { JobStatus } from "@/types";

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
  jobStatus,
  hasValidItems,
}: {
  jobId: string;
  customerPhone: string | null | undefined;
  customerName: string;
  businessName: string;
  total: number;
  jobTitle: string;
  onSent?: () => void;
  jobStatus: JobStatus;
  hasValidItems: boolean;
}) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasPhone = Boolean(customerPhone?.trim());
  const label = !hasValidItems ? "Add quote items first" : jobStatus === "enquiry" ? "Send Quote" : "Resend Quote";

  const sendQuote = async () => {
    if (!hasPhone || !hasValidItems || sending) return;
    const phone = customerPhone?.replace(/\D/g, "");
    if (!phone) return;
    setSending(true);
    setError(null);

    try {
      const job = await getJob(jobId);
      const items = await getQuoteItems(jobId);
      const validItems = items.some((item) => item.description.trim() && Number(item.quantity) > 0 && Number(item.unit_price) > 0);
      if (!validItems) {
        setError("Add at least one line item with a description, quantity, and price before sending a quote.");
        return;
      }
      const quoteUrl = `${window.location.origin}/q/${jobId}`;
      const message = `Hi ${customerName}, here is your quote from ${businessName} for ${jobTitle}. Total: ${money.format(total)}. View and accept it here: ${quoteUrl}`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
      if (job.status === "enquiry") {
        await updateJobStatus(jobId, "quoted");
        onSent?.();
      }
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
        disabled={!hasPhone || !hasValidItems || sending}
        title={!hasValidItems ? "Add at least one valid quote item first." : undefined}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Send size={16} />
        {sending ? "Preparing..." : label}
      </button>
      {!hasPhone && <p className="mt-2 text-xs text-slate-500">Add a customer phone number to send this quote.</p>}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
