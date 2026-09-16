"use client";

import type { QuoteRevision } from "@/types";

const money = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

export function QuoteHistorySheet({
  open,
  revisions,
  onClose,
}: {
  open: boolean;
  revisions: QuoteRevision[];
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[55] bg-slate-950/70" onClick={onClose}>
      <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[85vh] max-w-2xl overflow-y-auto rounded-t-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-7" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <div><h2 className="text-xl font-bold text-white">Quote history</h2><p className="mt-1 text-sm text-slate-400">Saved versions of this quote.</p></div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close">×</button>
        </div>
        {!revisions.length && <p className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-400">No revisions saved yet.</p>}
        <div className="space-y-4">
          {revisions.map((revision, index) => (
            <article key={revision.id} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-semibold text-white">{index === revisions.length - 1 ? "Original" : `Revision ${revision.revision}`}</p><p className="mt-1 text-xs text-slate-500">{new Date(revision.created_at).toLocaleString()}</p></div>
                <p className="font-bold text-sky-300">{money.format(revision.total)}</p>
              </div>
              {revision.reason && <p className="mt-3 text-sm text-slate-300">{revision.reason}</p>}
              <ul className="mt-3 space-y-1 border-t border-slate-800 pt-3">
                {revision.snapshot.map((item, itemIndex) => <li key={`${revision.id}-${itemIndex}`} className="flex justify-between gap-3 text-sm text-slate-400"><span>{item.description} × {item.quantity}</span><span>{money.format(item.quantity * item.unit_price)}</span></li>)}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
