"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";

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
  const [editing, setEditing] = useState(jobStatus === "enquiry");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [savingRevision, setSavingRevision] = useState(false);
  const retryRef = useRef<(() => Promise<void>) | null>(null);
  const dirtyItems = useRef(new Set<string>());
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
  const totals = calculateQuoteTotals(items);
  const total = totals.total;
  const hasValidItems = items.some((item) => item.description.trim() && Number(item.quantity) > 0 && Number(item.unit_price) > 0);

  const persistTotals = (nextItems: QuoteItem[]) => {
    const nextTotals = calculateQuoteTotals(nextItems);
    void updateJob(jobId, {
      quote_subtotal: nextTotals.subtotal,
      quote_vat_total: nextTotals.vat_total,
      quote_total: nextTotals.total,
    });
  };

  const changeItem = (item: QuoteItem, field: "description" | "quantity" | "unit_price" | "vat_applicable" | "vat_rate" | "price_includes_vat", value: string | boolean) => {
    setMutationError(null);
    dirtyItems.current.add(item.id);
    queryClient.setQueryData<QuoteItem[]>(["quote-items", jobId], (current = []) =>
      current.map((currentItem) =>
        currentItem.id === item.id
          ? { ...currentItem, [field]: typeof value === "boolean" || field === "description" ? value : Number(value) || 0 }
          : currentItem,
      ),
    );
    window.setTimeout(() => {
      if (!dirtyItems.current.has(item.id)) return;
      const current = queryClient.getQueryData<QuoteItem[]>(["quote-items", jobId])?.find(({ id }) => id === item.id);
      if (!current) return;
      void updateQuoteItem(item.id, {
        description: current.description,
        quantity: Number(current.quantity),
        unit_price: Number(current.unit_price),
        vat_applicable: current.vat_applicable,
        vat_rate: Number(current.vat_rate ?? VAT_STANDARD),
        price_includes_vat: current.price_includes_vat,
      }).then(() => {
        dirtyItems.current.delete(item.id);
        persistTotals(queryClient.getQueryData<QuoteItem[]>(["quote-items", jobId]) ?? []);
        void logJobEvent({
          jobId,
          eventType: "quote_item_updated",
          description: `Updated “${current.description || "Untitled item"}”`,
          metadata: { quote_item_id: current.id, description: current.description, quantity: current.quantity, unit_price: current.unit_price },
        }).catch(() => undefined);
      }).catch((error: unknown) => {
        if (error instanceof QuoteBelowPaidError) {
          retryRef.current = async () => {
            await updateQuoteItem(item.id, {
              description: current.description,
              quantity: Number(current.quantity),
              unit_price: Number(current.unit_price),
            });
            dirtyItems.current.delete(item.id);
          };
          setMutationError(error);
          setOverpaymentDialogOpen(true);
        }
      });
    }, 500);
  };

  const addItem = async (description = "New item") => {
    setMutationError(null);
    try {
      const item = await createQuoteItem({ job_id: jobId, description, sort_order: items.length });
      queryClient.setQueryData<QuoteItem[]>(["quote-items", jobId], [...items, item]);
      persistTotals([...items, item]);
      void logJobEvent({
        jobId,
        eventType: "quote_item_added",
        description: `Added “${item.description || "Untitled item"}”`,
        metadata: { quote_item_id: item.id, description: item.description, quantity: item.quantity, unit_price: item.unit_price },
      }).catch(() => undefined);
    } catch (error) {
      if (error instanceof QuoteBelowPaidError) {
        retryRef.current = async () => {
          const retryItem = await createQuoteItem({ job_id: jobId, description, sort_order: items.length });
          queryClient.setQueryData<QuoteItem[]>(["quote-items", jobId], (current = []) => [...current, retryItem]);
        };
        setMutationError(error);
        setOverpaymentDialogOpen(true);
      }
    }
  };

  const removeItem = async (id: string) => {
    setMutationError(null);
    try {
      await deleteQuoteItem(id);
      queryClient.setQueryData<QuoteItem[]>(["quote-items", jobId], items.filter((item) => item.id !== id));
      persistTotals(items.filter((item) => item.id !== id));
      const deletedItem = items.find((item) => item.id === id);
      void logJobEvent({
        jobId,
        eventType: "quote_item_removed",
        description: `Deleted “${deletedItem?.description || "Untitled item"}”`,
        metadata: { quote_item_id: id, description: deletedItem?.description },
      }).catch(() => undefined);
    } catch (error) {
      if (error instanceof QuoteBelowPaidError) {
        retryRef.current = async () => {
          await deleteQuoteItem(id);
          queryClient.setQueryData<QuoteItem[]>(["quote-items", jobId], (current = []) => current.filter((item) => item.id !== id));
        };
        setMutationError(error);
        setOverpaymentDialogOpen(true);
      }
    }
  };

  const saveRevision = async () => {
    setSavingRevision(true);
    try {
      const currentItems = queryClient.getQueryData<QuoteItem[]>(["quote-items", jobId]) ?? [];
      for (const item of currentItems) {
        await updateQuoteItem(item.id, {
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          vat_applicable: item.vat_applicable,
          vat_rate: Number(item.vat_rate ?? VAT_STANDARD),
          price_includes_vat: item.price_includes_vat,
        });
      }
      persistTotals(currentItems);
      const revision = await saveQuoteRevision(jobId);
      await queryClient.invalidateQueries({ queryKey: ["quote-revisions", jobId] });
      setEditing(false);
      window.alert(`Revision ${revision.revision} saved.`);
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
          {items.length > 0 && jobStatus !== "enquiry" && jobStatus !== "paid" && <button type="button" onClick={() => setEditing(true)} className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800">Edit quote</button>}
          <span className="text-sm font-semibold text-sky-300">{money.format(total)}</span>
        </div>
      </div>

      {presets.length > 0 && (
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
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_4.5rem_6.5rem_auto_auto] items-center gap-2">
            <input disabled={!editing} value={item.description} onChange={(event) => changeItem(item, "description", event.target.value)} className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-sm text-white disabled:opacity-70" aria-label="Description" />
            <input disabled={!editing} type="number" min="0" step="0.01" value={item.quantity} onChange={(event) => changeItem(item, "quantity", event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white disabled:opacity-70" aria-label="Quantity" />
            <input disabled={!editing} type="number" min="0" step="1" value={item.unit_price} onChange={(event) => changeItem(item, "unit_price", event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white disabled:opacity-70" aria-label="Unit price" />
            <span className="text-right text-sm text-slate-200">{money.format(Number(item.quantity) * Number(item.unit_price))}</span>
            <button disabled={!editing} type="button" onClick={() => void removeItem(item.id)} className="p-2 text-slate-500 hover:text-red-400 disabled:opacity-40" aria-label="Delete quote item"><Trash2 size={16} /></button>
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
          <button disabled={!editing} type="button" onClick={() => void addItem()} className="rounded-xl border border-sky-500/60 px-4 py-2.5 text-sm font-semibold text-sky-300 hover:bg-sky-500/10 disabled:opacity-40">Add item</button>
          {editing && jobStatus !== "enquiry" && <button disabled={savingRevision} type="button" onClick={() => void saveRevision()} className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{savingRevision ? "Saving..." : "Save revision"}</button>}
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
