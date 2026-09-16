"use client";

import { useEffect, useMemo, useState } from "react";

import { getPaymentsWithContext } from "@/lib/queries/payments";
import { PAYMENT_METHOD_LABELS, type PaymentWithContext } from "@/types";

const money = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });

export default function Finance() {
  const [payments, setPayments] = useState<PaymentWithContext[]>([]);
  const [tab, setTab] = useState<"income" | "expenses">("income");
  useEffect(() => { void getPaymentsWithContext().then(setPayments); }, []);
  const monthStart = useMemo(() => { const date = new Date(); date.setDate(1); date.setHours(0, 0, 0, 0); return date; }, []);
  const monthTotal = payments.filter((payment) => new Date(payment.paid_at) >= monthStart).reduce((sum, payment) => sum + Number(payment.amount), 0);
  const allTotal = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

  return <div className="space-y-7">
    <div><p className="text-sm font-medium text-sky-400">Money</p><h1 className="mt-1 text-3xl font-bold text-white">Finance</h1><p className="mt-2 text-slate-400">Keep track of what comes in.</p></div>
    <div className="grid gap-3 sm:grid-cols-2"><Summary label="Received this month" value={monthTotal} /><Summary label="Received all time" value={allTotal} /></div>
    <div className="flex gap-2 border-b border-slate-800"><button type="button" onClick={() => setTab("income")} className={`border-b-2 px-3 py-3 text-sm font-semibold ${tab === "income" ? "border-sky-400 text-sky-300" : "border-transparent text-slate-500"}`}>Income</button><button type="button" onClick={() => setTab("expenses")} className={`border-b-2 px-3 py-3 text-sm font-semibold ${tab === "expenses" ? "border-sky-400 text-sky-300" : "border-transparent text-slate-500"}`}>Expenses</button></div>
    {tab === "expenses" ? <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-400">Expenses coming in Stage 6.</div> : <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70"><table className="w-full min-w-[42rem] text-left text-sm"><thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-4">Date</th><th className="p-4">Customer</th><th className="p-4">Job</th><th className="p-4">Method</th><th className="p-4 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-800">{payments.map((payment) => <tr key={payment.id}><td className="p-4 text-slate-400">{new Date(payment.paid_at).toLocaleDateString()}</td><td className="p-4 text-slate-200">{payment.customer?.name ?? "—"}</td><td className="p-4 text-slate-200">{payment.job?.title ?? "—"}</td><td className="p-4 text-slate-400">{PAYMENT_METHOD_LABELS[payment.method]}</td><td className="p-4 text-right font-semibold text-emerald-300">{money.format(payment.amount)}</td></tr>)}</tbody></table>{!payments.length && <p className="p-10 text-center text-sm text-slate-400">No payments recorded yet.</p>}</div>}
  </div>;
}

function Summary({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><p className="mt-3 text-2xl font-bold text-emerald-300">{money.format(value)}</p></div>; }
