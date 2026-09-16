"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cancelPayment } from "@/lib/queries/payments";

export function CancelReceiptDialog({ paymentId, receiptNumber, amount, onCancelled, onClose }: { paymentId: string; receiptNumber: string; amount: number; onCancelled: () => void; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (reason.trim().length < 5) { setError("Please provide a reason of at least 5 characters."); return; }
    setBusy(true); setError("");
    try {
      await cancelPayment(paymentId, reason.trim());
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["payments"] }),
        queryClient.invalidateQueries({ queryKey: ["job-financials"] }),
        queryClient.invalidateQueries({ queryKey: ["job-timeline"] }),
        queryClient.invalidateQueries({ queryKey: ["job"] }),
      ]);
      onCancelled();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to cancel receipt.");
    } finally { setBusy(false); }
  }
  return <div className="fixed inset-0 z-50 bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-labelledby="cancel-receipt-title">
    <div className="mx-auto mt-[15vh] max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
      <h2 id="cancel-receipt-title" className="text-xl font-bold text-white">Cancel receipt {receiptNumber}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">This will mark the receipt as cancelled. The payment amount will no longer count toward the job balance.<br /><br />Common reasons: cheque bounced, wrong amount entered, refunded to customer.<br /><br />Cancelled receipts remain in the history and can be viewed.</p>
      <p className="mt-3 text-sm text-slate-400">Amount: {new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(amount)}</p>
      <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="Reason for cancellation" className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white" />
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200">Cancel</button><button type="button" onClick={() => void submit()} disabled={busy} className="rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Cancelling..." : "Cancel receipt"}</button></div>
    </div>
  </div>;
}
