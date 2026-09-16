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
  updateQuoteItem,
} from "@/lib/queries/quote-items";
import type { QuoteItem } from "@/types";
import { SendQuoteButton } from "@/components/quotes/SendQuoteButton";

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
}: {
  jobId: string;
  customerPhone: string | null | undefined;
  customerName: string;
  jobTitle: string;
  onSent?: () => void;
  jobStatus: import("@/types").JobStatus;
}) {
  const queryClient = useQueryClient();
  const [tradeType, setTradeType] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("FundiOS");
  const dirtyItems = useRef(new Set<string>());
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["quote-items", jobId],
    queryFn: () => getQuoteItems(jobId),
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("trade_type, business_name").eq("id", user.id).maybeSingle().then(({ data }) => {
        setTradeType(data?.trade_type ?? null);
        setBusinessName(data?.business_name ?? "FundiOS");
      });
    });
  }, []);

  const presets = getPresetsForTrade(tradeType);
  const total = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0);
  const hasValidItems = items.some((item) => item.description.trim() && Number(item.quantity) > 0 && Number(item.unit_price) > 0);

  const changeItem = (item: QuoteItem, field: "description" | "quantity" | "unit_price", value: string) => {
    dirtyItems.current.add(item.id);
    queryClient.setQueryData<QuoteItem[]>(["quote-items", jobId], (current = []) =>
      current.map((currentItem) =>
        currentItem.id === item.id
          ? { ...currentItem, [field]: field === "description" ? value : Number(value) || 0 }
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
      });
      dirtyItems.current.delete(item.id);
    }, 500);
  };

  const addItem = async (description = "New item") => {
    const item = await createQuoteItem({ job_id: jobId, description, sort_order: items.length });
    queryClient.setQueryData<QuoteItem[]>(["quote-items", jobId], [...items, item]);
  };

  const removeItem = async (id: string) => {
    await deleteQuoteItem(id);
    queryClient.setQueryData<QuoteItem[]>(["quote-items", jobId], items.filter((item) => item.id !== id));
  };

  return (
    <section id="quote-section" className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 sm:p-7">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Quote</h2>
          <p className="mt-1 text-sm text-slate-400">Build the line items for this job.</p>
        </div>
        <span className="text-sm font-semibold text-sky-300">{money.format(total)}</span>
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
      {!isLoading && !items.length && <p className="mb-5 text-sm text-slate-400">No quote items yet. Add your first line item.</p>}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_4.5rem_6.5rem_auto_auto] items-center gap-2">
            <input value={item.description} onChange={(event) => changeItem(item, "description", event.target.value)} className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-sm text-white" aria-label="Description" />
            <input type="number" min="0" step="0.01" value={item.quantity} onChange={(event) => changeItem(item, "quantity", event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white" aria-label="Quantity" />
            <input type="number" min="0" step="1" value={item.unit_price} onChange={(event) => changeItem(item, "unit_price", event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white" aria-label="Unit price" />
            <span className="text-right text-sm text-slate-200">{money.format(Number(item.quantity) * Number(item.unit_price))}</span>
            <button type="button" onClick={() => void removeItem(item.id)} className="p-2 text-slate-500 hover:text-red-400" aria-label="Delete quote item"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
        <button type="button" onClick={() => void addItem()} className="rounded-xl border border-sky-500/60 px-4 py-2.5 text-sm font-semibold text-sky-300 hover:bg-sky-500/10">Add item</button>
        <p className="text-right text-lg font-bold text-white">Total: {money.format(total)}</p>
      </div>
      <div className="mt-4 border-t border-slate-800 pt-4">
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
      </div>
    </section>
  );
}
