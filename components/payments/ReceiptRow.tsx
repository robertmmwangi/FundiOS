"use client";

import { MoreHorizontal } from "lucide-react";
import { PAYMENT_METHOD_LABELS, type Receipt } from "@/types";

const money = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });

export function ReceiptRow({
  receipt,
  menuOpen,
  onOpen,
  onToggleMenu,
  onCancel,
}: {
  receipt: Receipt;
  menuOpen: boolean;
  onOpen: () => void;
  onToggleMenu: () => void;
  onCancel: () => void;
}) {
  const cancelled = Boolean(receipt.cancelled_at);
  return (
    <div className={`relative flex cursor-pointer items-center gap-3 rounded-2xl border p-4 ${cancelled ? "border-rose-500/20 bg-rose-500/5" : "border-slate-800 bg-slate-950/40"}`} onClick={onOpen}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`font-mono text-sm ${cancelled ? "text-slate-500 line-through" : "text-slate-200"}`}>{receipt.receipt_number ?? "Receipt pending"}</p>
          {cancelled && <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-300">Cancelled</span>}
        </div>
        <p className="mt-1 text-xs text-slate-500">{new Date(receipt.paid_at).toLocaleDateString()}</p>
        <span className="mt-2 inline-flex rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300">{PAYMENT_METHOD_LABELS[receipt.method]}</span>
        {cancelled && receipt.cancelled_reason && <p className="mt-2 text-xs text-rose-200/80">{receipt.cancelled_reason}</p>}
      </div>
      <p className={`text-right text-base font-bold ${cancelled ? "text-slate-500 line-through" : receipt.is_refund ? "text-rose-300" : "text-white"}`}>{receipt.is_refund ? "-" : ""}{money.format(receipt.amount)}</p>
      <button type="button" onClick={(event) => { event.stopPropagation(); onToggleMenu(); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-white" aria-label="Receipt actions"><MoreHorizontal size={18} /></button>
      {menuOpen && !cancelled && <div className="absolute right-3 top-12 z-10 rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-xl"><button type="button" onClick={(event) => { event.stopPropagation(); onCancel(); }} className="rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-red-500/10">Cancel receipt</button></div>}
    </div>
  );
}
