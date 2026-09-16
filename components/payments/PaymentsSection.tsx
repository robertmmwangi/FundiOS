"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Plus } from "lucide-react";

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

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Paid to date</p>
          <p className="mt-2 text-2xl font-bold text-emerald-300">
            {financialsQuery.isLoading ? "—" : money.format(financials?.total_paid ?? 0)}
          </p>
        </div>
        <div
          className={`rounded-2xl border p-4 ${
            (financials?.balance ?? 0) > 0
              ? "border-amber-500/20 bg-amber-500/5"
              : "border-slate-700 bg-slate-950/30"
          }`}
        >
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Balance</p>
          <p className={`mt-2 text-2xl font-bold ${(financials?.balance ?? 0) > 0 ? "text-amber-300" : "text-slate-300"}`}>
            {financialsQuery.isLoading ? "—" : money.format(Math.max(financials?.balance ?? 0, 0))}
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
            className="relative flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4"
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
            </div>
            <p className="text-right text-base font-bold text-white">{money.format(payment.amount)}</p>
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
      <PaymentFormSheet open={formOpen} jobId={jobId} balance={financials?.balance} payment={editingPayment} onClose={() => { setFormOpen(false); setEditingPayment(undefined); }} onSaved={() => void refreshAfterSave()} />
    </section>
  );
}
