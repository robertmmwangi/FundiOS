"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Trash2, X } from "lucide-react";

import { getPresetsForTrade } from "@/lib/quote-presets";
import { createClient } from "@/lib/supabase/client";
import {
  createQuoteItem,
  deleteQuoteItem,
  getQuoteItems,
  getQuoteRevisions,
  saveQuoteRevision,
  QuoteBelowPaidError,
  updateQuoteItem,
} from "@/lib/queries/quote-items";
import { logJobEvent } from "@/lib/queries/job-events";
import type { QuoteItem } from "@/types";
import { SendQuoteButton } from "@/components/quotes/SendQuoteButton";
import { PaymentFormSheet } from "@/components/payments/PaymentFormSheet";
import { QuoteHistorySheet } from "@/components/quotes/QuoteHistorySheet";
import { calculateQuoteTotals, VAT_FUEL, VAT_STANDARD, VAT_ZERO } from "@/lib/vat";
import { updateJob } from "@/lib/queries/jobs";

const money = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

export function QuoteSection({
  jobId,
  customerPhone,
  customerName,
  jobTitle,
  onSent,
  jobStatus,
  quoteVatInclusive = false,
  showSendButton = true,
}: {
  jobId: string;
  customerPhone: string | null | undefined;
  customerName: string;
  jobTitle: string;
  onSent?: () => void;
  jobStatus: import("@/types").JobStatus;
  quoteVatInclusive?: boolean;
  showSendButton?: boolean;
}) {
  const queryClient = useQueryClient();
  const [tradeType, setTradeType] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("FundiOS");
  const [vatRegistered, setVatRegistered] = useState(false);
  const [vatInclusive, setVatInclusive] = useState(quoteVatInclusive);
  const [mutationError, setMutationError] = useState<QuoteBelowPaidError | null>(null);
  const [overpaymentDialogOpen, setOverpaymentDialogOpen] = useState(false);
  const [refundFormOpen, setRefundFormOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftItems, setDraftItems] = useState<QuoteItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [savingRevision, setSavingRevision] = useState(false);
  const retryRef = useRef<(() => Promise<void>) | null>(null);
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["quote-items", jobId],
    queryFn: () => getQuoteItems(jobId),
  });
  const revisionsQuery = useQuery({
    queryKey: ["quote-revisions", jobId],
    queryFn: () => getQuoteRevisions(jobId),
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("trade_type, business_name, vat_registered").eq("id", user.id).maybeSingle().then(({ data }) => {
        setTradeType(data?.trade_type ?? null);
        setBusinessName(data?.business_name ?? "FundiOS");
        setVatRegistered(data?.vat_registered === true);
      });
    });
  }, []);

  const presets = getPresetsForTrade(tradeType);
  const displayedItems = editing ? draftItems : items;
  const totals = calculateQuoteTotals(displayedItems);
  const total = totals.total;
  const hasValidItems = items.length > 0 && items.every((item) => item.description.trim() && Number(item.quantity) > 0 && Number(item.unit_price) > 0);

  const persistTotals = (nextItems: QuoteItem[]) => {
    const nextTotals = calculateQuoteTotals(nextItems);
    void updateJob(jobId, {
      quote_subtotal: nextTotals.subtotal,
      quote_vat_total: nextTotals.vat_total,
      quote_total: nextTotals.total,
    });
  };

  const startEditing = () => {
    setDraftItems(items.map((item) => ({ ...item })));
    setEditing(true);
  };

  const cancelEditing = () => {
    setDraftItems([]);
    setEditing(false);
    setMutationError(null);
  };

  const changeItem = (item: QuoteItem, field: "description" | "quantity" | "unit_price" | "vat_applicable" | "vat_rate" | "price_includes_vat", value: string | boolean) => {
    setMutationError(null);
    setDraftItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id
          ? { ...currentItem, [field]: typeof value === "boolean" || field === "description" ? value : Number(value) || 0 }
          : currentItem,
      ),
    );
  };

  const addItem = (description = "New item") => {
    setMutationError(null);
    if (!editing) startEditing();
    setDraftItems((current) => [...current, {
      id: `draft-${crypto.randomUUID()}`,
      job_id: jobId,
      user_id: "",
      description,
      quantity: 1,
      unit_price: 0,
      sort_order: current.length,
      vat_applicable: false,
      vat_rate: VAT_STANDARD,
      price_includes_vat: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]);
  };

  const removeItem = (id: string) => {
    setMutationError(null);
    setDraftItems((current) => current.filter((item) => item.id !== id));
  };

  const saveRevision = async () => {
    setSavingRevision(true);
    try {
      const currentItems = draftItems;
      const originalById = new Map(items.map((item) => [item.id, item]));
      const savedItems: QuoteItem[] = [];
      for (const item of currentItems) {
        const input = {
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          vat_applicable: item.vat_applicable,
          vat_rate: Number(item.vat_rate ?? VAT_STANDARD),
          price_includes_vat: item.price_includes_vat,
        };
        const saved = item.id.startsWith("draft-")
          ? await createQuoteItem({ job_id: jobId, ...input, sort_order: item.sort_order })
          : await updateQuoteItem(item.id, input);
        savedItems.push(saved);
      }
      for (const item of items) {
        if (!currentItems.some((draft) => draft.id === item.id)) {
          await deleteQuoteItem(item.id);
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["quote-items", jobId] });
      persistTotals(savedItems);
      const revision = await saveQuoteRevision(jobId);
      await queryClient.invalidateQueries({ queryKey: ["quote-revisions", jobId] });
      setEditing(false);
      setDraftItems([]);
      const changedCount = currentItems.filter((item) => {
        const original = originalById.get(item.id);
        return !original || original.description !== item.description || original.quantity !== item.quantity || original.unit_price !== item.unit_price;
      }).length + items.filter((item) => !currentItems.some((draft) => draft.id === item.id)).length;
      void logJobEvent({
        jobId,
        eventType: "quote_revised",
        description: `Quote updated - ${changedCount} item${changedCount === 1 ? "" : "s"} changed`,
        metadata: { revision: revision.revision, total: revision.total, changed_count: changedCount },
      }).catch(() => undefined);
    } catch (error) {
      if (error instanceof QuoteBelowPaidError) {
        setMutationError(error);
        setOverpaymentDialogOpen(true);
      }
    } finally {
      setSavingRevision(false);
    }
  };

  return (
    <section id="quote-section" className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 sm:p-7">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Quote</h2>
            {items.length > 0 && <button type="button" onClick={() => setHistoryOpen(true)} className="text-xs font-semibold text-sky-300 hover:text-sky-200">View history</button>}
          </div>
          <p className="mt-1 text-sm text-slate-400">Build the line items for this job.</p>
        </div>
        <div className="flex items-center gap-2">
          {jobStatus !== "paid" && !editing && <button type="button" onClick={startEditing} className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800">Edit quote</button>}
          {editing && <button type="button" onClick={cancelEditing} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Exit quote editing"><X size={18} /></button>}
          <span className="text-sm font-semibold text-sky-300">{money.format(total)}</span>
        </div>
      </div>

      {editing && presets.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button key={preset} type="button" onClick={() => void addItem(preset)} className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-sky-500 hover:text-sky-300">
              {preset}
            </button>
          ))}
        </div>
      )}

      {isLoading && <p className="text-sm text-slate-400">Loading quote items...</p>}
      {error && <p className="text-sm text-red-400">Unable to load quote items.</p>}
      {mutationError && (
        <p className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          Quote total cannot be below {money.format(mutationError.paidAmount)} already paid. Add items or refund{" "}
          {money.format(mutationError.shortfall)} before saving.
        </p>
      )}
      {!isLoading && !items.length && <p className="mb-5 text-sm text-slate-400">No quote items yet. Add your first line item.</p>}

      <div className="space-y-3">
        {displayedItems.map((item) => (
          <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_4.5rem_6.5rem_auto_auto] items-center gap-2">
            {editing ? <input value={item.description} onChange={(event) => changeItem(item, "description", event.target.value)} className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-sm text-white" aria-label="Description" /> : <span className="min-w-0 truncate text-sm text-slate-200">{item.description}</span>}
            {editing ? <input type="number" min="0" step="1" inputMode="decimal" value={item.quantity} onFocus={(event) => event.target.select()} onChange={(event) => changeItem(item, "quantity", event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white" aria-label="Quantity" /> : <span className="text-sm text-slate-300">{item.quantity}</span>}
            {editing ? <input type="number" min="0" step="1" inputMode="decimal" value={item.unit_price} onFocus={(event) => event.target.select()} onChange={(event) => changeItem(item, "unit_price", event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white" aria-label="Unit price" /> : <span className="text-sm text-slate-300">{money.format(Number(item.unit_price))}</span>}
            <span className="text-right text-sm text-slate-200">{money.format(Number(item.quantity) * Number(item.unit_price))}</span>
            {editing && <button type="button" onClick={() => removeItem(item.id)} className="p-2 text-slate-500 hover:text-red-400" aria-label="Delete quote item"><Trash2 size={16} /></button>}
            {vatRegistered && editing && <div className="col-span-full flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={item.vat_applicable ?? false} onChange={(event) => changeItem(item, "vat_applicable", event.target.checked)} /> VAT applies to this item</label>
              {!!item.vat_applicable && <select value={item.vat_rate ?? VAT_STANDARD} onChange={(event) => changeItem(item, "vat_rate", event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-white"><option value={VAT_STANDARD}>16%</option><option value={VAT_FUEL}>8%</option><option value={VAT_ZERO}>0%</option></select>}
              {!!item.vat_applicable && <label className="inline-flex items-center gap-2"><input type="checkbox" checked={item.price_includes_vat ?? false} onChange={(event) => changeItem(item, "price_includes_vat", event.target.checked)} /> Price includes VAT</label>}
            </div>}
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
        <div className="flex gap-2">
          {editing && <button type="button" onClick={() => addItem()} className="rounded-xl border border-sky-500/60 px-4 py-2.5 text-sm font-semibold text-sky-300 hover:bg-sky-500/10">Add item</button>}
          {editing && <button disabled={savingRevision} type="button" onClick={() => void saveRevision()} className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Save size={16} />{savingRevision ? "Saving..." : "Save"}</button>}
          {editing && <button type="button" onClick={cancelEditing} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800">Cancel</button>}
        </div>
        <div className="text-right text-sm text-slate-300">{totals.vat_total > 0 && <><p>Subtotal: {money.format(totals.subtotal)}</p><p>VAT: {money.format(totals.vat_total)}</p></>}<p className="mt-1 text-lg font-bold text-white">Total: {money.format(total)}</p></div>
      </div>
      {vatRegistered && <label className="mt-4 inline-flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={vatInclusive} onChange={(event) => { setVatInclusive(event.target.checked); void updateJob(jobId, { quote_vat_inclusive: event.target.checked }); }} /> Show prices as VAT inclusive</label>}
      {showSendButton && <div className="mt-4 border-t border-slate-800 pt-4">
        <SendQuoteButton
          jobId={jobId}
          customerPhone={customerPhone}
          customerName={customerName}
          businessName={businessName}
          total={total}
          jobTitle={jobTitle}
          onSent={onSent}
          jobStatus={jobStatus}
          hasValidItems={hasValidItems}
        />
        {!hasValidItems && <p className="mt-2 text-xs text-amber-300">Complete all line items before sending</p>}
      </div>}
      {overpaymentDialogOpen && mutationError && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" aria-labelledby="quote-paid-dialog-title">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-slate-900 p-6 shadow-2xl">
            <h3 id="quote-paid-dialog-title" className="text-lg font-bold text-white">Cannot save this revision</h3>
            <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-300">
              {`The new quote total (${money.format(mutationError.newTotal)}) is less than what the customer has already paid (${money.format(mutationError.paidAmount)}).

To proceed, either:
• Issue a refund of ${money.format(mutationError.shortfall)} to the customer, or
• Add items back so the total is at least ${money.format(mutationError.paidAmount)}`}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setOverpaymentDialogOpen(false)} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800">Add items</button>
              <button type="button" onClick={() => { setOverpaymentDialogOpen(false); setRefundFormOpen(true); }} className="rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-400">Record refund</button>
              <button type="button" onClick={() => { setOverpaymentDialogOpen(false); setMutationError(null); }} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-white">Cancel</button>
            </div>
          </div>
        </div>
      )}
      <PaymentFormSheet
        open={refundFormOpen}
        jobId={jobId}
        mode="refund"
        initialAmount={mutationError?.shortfall}
        onClose={() => setRefundFormOpen(false)}
        onSaved={() => {
          setRefundFormOpen(false);
          const retry = retryRef.current;
          if (!retry) {
            setMutationError(null);
            return;
          }
          void retry().then(() => {
            retryRef.current = null;
            setMutationError(null);
            setOverpaymentDialogOpen(false);
            void queryClient.invalidateQueries({ queryKey: ["quote-items", jobId] });
          }).catch((error: unknown) => {
            if (error instanceof QuoteBelowPaidError) {
              setMutationError(error);
              setOverpaymentDialogOpen(true);
            }
          });
        }}
      />
      <QuoteHistorySheet open={historyOpen} revisions={revisionsQuery.data ?? []} onClose={() => setHistoryOpen(false)} />
    </section>
  );
}
