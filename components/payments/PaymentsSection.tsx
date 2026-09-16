"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, MoreHorizontal, Plus } from "lucide-react";

import { deletePayment, getJobFinancials, getPaymentsForJob } from "@/lib/queries/payments";
import { PAYMENT_METHOD_LABELS, type Payment, type JobStatus } from "@/types";
import { PaymentFormSheet } from "@/components/payments/PaymentFormSheet";

const money = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

function relativeTime(value: string) {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;
  const months = Math.floor(days / 30);
  return `${months} ${months === 1 ? "month" : "months"} ago`;
}

function methodTone(method: Payment["method"]) {
  if (method === "mpesa") return "bg-emerald-500/10 text-emerald-300";
  if (method === "bank") return "bg-sky-500/10 text-sky-300";
  if (method === "cheque") return "bg-amber-500/10 text-amber-300";
  return "bg-slate-800 text-slate-300";
}

export function PaymentsSection({
  jobId,
  jobStatus,
  autoOpen,
  onPaymentSaved,
}: {
  jobId: string;
  jobStatus: JobStatus;
  autoOpen?: boolean;
  onPaymentSaved?: () => void;
}) {
  const queryClient = useQueryClient();
  const [menuPaymentId, setMenuPaymentId] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState(false);
  const [formOpen, setFormOpen] = useState(() => Boolean(autoOpen || (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("payment") === "new")));
  const [editingPayment, setEditingPayment] = useState<Payment | undefined>();
  const [refundOpen, setRefundOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const paymentsQuery = useQuery({
    queryKey: ["payments", jobId],
    queryFn: () => getPaymentsForJob(jobId),
  });
  const financialsQuery = useQuery({
    queryKey: ["job-financials", jobId],
    queryFn: () => getJobFinancials(jobId),
  });
  const payments = paymentsQuery.data ?? [];
  const financials = financialsQuery.data;
  const overpayment = Math.max((financials?.net_paid ?? 0) - (financials?.total_quoted ?? 0), 0);
  const showDepositHint = jobStatus === "quoted";

  async function removePayment(payment: Payment) {
    if (!confirm(`Delete this ${money.format(payment.amount)} payment?`)) return;
    await deletePayment(payment.id);
    await queryClient.invalidateQueries({ queryKey: ["payments", jobId] });
    await queryClient.invalidateQueries({ queryKey: ["job-financials", jobId] });
    setMenuPaymentId(null);
  }

  function openEdit(payment: Payment) {
    setEditingPayment(payment);
    setFormOpen(true);
    setMenuPaymentId(null);
  }

  async function refreshAfterSave() {
    await queryClient.invalidateQueries({ queryKey: ["payments", jobId] });
    await queryClient.invalidateQueries({ queryKey: ["job-financials", jobId] });
    await queryClient.invalidateQueries({ queryKey: ["job", jobId] });
    onPaymentSaved?.();
    setSavedMessage(true);
    window.setTimeout(() => setSavedMessage(false), 2500);
  }

  function addItemsToQuote() {
    window.dispatchEvent(new CustomEvent("fundios:edit-quote"));
    document.getElementById("quote-section")?.scrollIntoView({ behavior: "smooth" });
  }

  function leaveAsCredit() {
    setToast("Credit holding coming in a later stage");
    window.setTimeout(() => setToast(null), 3000);
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 sm:p-7">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Payments</h2>
          <p className="mt-1 text-sm text-slate-400">Track money received for this job.</p>
        </div>
        <button
          type="button"
        onClick={() => { setEditingPayment(undefined); setFormOpen(true); }}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400"
        >
          <Plus size={16} />
          Record Payment
        </button>
      </div>

      {overpayment > 0 && (
        <div className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-300" />
            <div className="min-w-0">
              <p className="font-semibold text-amber-200">This job is overpaid by {money.format(overpayment)}</p>
              <p className="mt-1 text-sm text-amber-100/80">The customer has paid more than the current quote total. Resolve this by:</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={addItemsToQuote} className="rounded-lg bg-amber-400/20 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-400/30">Add items to quote</button>
                <button type="button" onClick={() => setRefundOpen(true)} className="rounded-lg bg-rose-500/20 px-3 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/30">Issue refund</button>
                <button type="button" onClick={leaveAsCredit} className="rounded-lg border border-amber-500/30 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/10">Leave as credit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`grid gap-3 ${financials?.total_refunded ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Paid to date</p>
          <p className="mt-2 text-2xl font-bold text-emerald-300">
            {financialsQuery.isLoading ? "—" : money.format(financials?.net_paid ?? 0)}
          </p>
        </div>
        {!!financials?.total_refunded && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Refunded</p>
            <p className="mt-2 text-2xl font-bold text-rose-300">
              {financialsQuery.isLoading ? "—" : money.format(financials.total_refunded)}
            </p>
          </div>
        )}
        <div
          className={`rounded-2xl border p-4 ${
            (financials?.balance ?? 0) > 0
              ? "border-amber-500/20 bg-amber-500/5"
              : "border-slate-700 bg-slate-950/30"
          }`}
        >
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{overpayment > 0 ? "Overpaid" : "Balance"}</p>
          <p className={`mt-2 text-2xl font-bold ${overpayment > 0 ? "text-amber-300" : (financials?.balance ?? 0) > 0 ? "text-amber-300" : "text-slate-300"}`}>
            {financialsQuery.isLoading ? "—" : overpayment > 0 ? `-${money.format(overpayment)}` : money.format(Math.max(financials?.balance ?? 0, 0))}
          </p>
        </div>
      </div>

      {showDepositHint && (
        <p className="mt-5 rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2.5 text-sm text-sky-200">
          Record the deposit to move this job forward.
        </p>
      )}

      <div className="mt-5 space-y-3">
        {savedMessage && <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-sm text-emerald-300">Payment saved.</p>}
        {paymentsQuery.isLoading && <p className="text-sm text-slate-400">Loading payments...</p>}
        {paymentsQuery.error && <p className="text-sm text-red-400">Unable to load payments.</p>}
        {!paymentsQuery.isLoading && !payments.length && (
          <p className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
            No payments recorded yet.
          </p>
        )}
        {payments.map((payment) => (
          <div
            key={payment.id}
            className={`relative flex cursor-pointer items-center gap-3 rounded-2xl border p-4 ${payment.is_refund ? "border-rose-500/20 bg-rose-500/5" : "border-slate-800 bg-slate-950/40"}`}
            onClick={() => openEdit(payment)}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-400">{relativeTime(payment.paid_at)}</p>
              <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${methodTone(payment.method)}`}>
                {PAYMENT_METHOD_LABELS[payment.method]}
              </span>
              {(payment.reference || payment.mpesa_receipt) && (
                <p className="mt-2 truncate text-xs text-slate-500">
                  {payment.reference || payment.mpesa_receipt}
                </p>
              )}
              {payment.is_refund && payment.refund_reason && (
                <p className="mt-2 text-xs text-rose-200/80">{payment.refund_reason}</p>
              )}
            </div>
            <p className={`text-right text-base font-bold ${payment.is_refund ? "text-rose-300" : "text-white"}`}>
              {payment.is_refund ? "-" : ""}{money.format(payment.amount)}
            </p>
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); setMenuPaymentId(menuPaymentId === payment.id ? null : payment.id); }}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-white"
              aria-label="Payment actions"
            >
              <MoreHorizontal size={18} />
            </button>
            {menuPaymentId === payment.id && (
              <div className="absolute right-3 top-12 z-10 rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-xl">
                <button
                  type="button"
                  onClick={() => void removePayment(payment)}
                  className="rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
                >
                  Delete payment
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <PaymentFormSheet open={formOpen} jobId={jobId} balance={financials?.balance} outstandingBalance={financials?.balance} payment={editingPayment} onClose={() => { setFormOpen(false); setEditingPayment(undefined); }} onSaved={() => void refreshAfterSave()} />
      <PaymentFormSheet open={refundOpen} jobId={jobId} mode="refund" initialAmount={overpayment} outstandingBalance={financials?.balance} onClose={() => setRefundOpen(false)} onSaved={() => void refreshAfterSave()} />
      {toast && <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl">{toast}</div>}
    </section>
  );
}
