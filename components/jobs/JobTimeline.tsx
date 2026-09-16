"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Banknote,
  Check,
  ClipboardList,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Send,
  Trash2,
  Wrench,
  Receipt,
  XCircle,
} from "lucide-react";

import { getJobTimeline } from "@/lib/queries/job-events";
import type { JobEventType } from "@/types";

const eventPresentation: Record<JobEventType, { label: string; color: string; icon: typeof Activity }> = {
  job_created: { label: "Job created", color: "text-sky-300 bg-sky-500/15", icon: Plus },
  status_changed: { label: "Status changed", color: "text-violet-300 bg-violet-500/15", icon: Wrench },
  quote_item_added: { label: "Quote item added", color: "text-emerald-300 bg-emerald-500/15", icon: Plus },
  quote_item_updated: { label: "Quote item updated", color: "text-amber-300 bg-amber-500/15", icon: Pencil },
  quote_item_removed: { label: "Quote item deleted", color: "text-rose-300 bg-rose-500/15", icon: Trash2 },
  quote_sent: { label: "Quote sent", color: "text-cyan-300 bg-cyan-500/15", icon: Send },
  quote_revised: { label: "Quote revised", color: "text-amber-300 bg-amber-500/15", icon: Pencil },
  invoice_issued: { label: "Invoice issued", color: "text-sky-300 bg-sky-500/15", icon: FileText },
  invoice_cancelled: { label: "Invoice cancelled", color: "text-rose-300 bg-rose-500/15", icon: XCircle },
  payment_received: { label: "Payment recorded", color: "text-emerald-300 bg-emerald-500/15", icon: Banknote },
  payment_updated: { label: "Payment updated", color: "text-amber-300 bg-amber-500/15", icon: Pencil },
  payment_deleted: { label: "Payment deleted", color: "text-rose-300 bg-rose-500/15", icon: Trash2 },
  receipt_issued: { label: "Receipt issued", color: "text-emerald-300 bg-emerald-500/15", icon: Receipt },
  receipt_cancelled: { label: "Receipt cancelled", color: "text-rose-300 bg-rose-500/15", icon: XCircle },
  refund_issued: { label: "Refund recorded", color: "text-rose-300 bg-rose-500/15", icon: Banknote },
  progress_updated: { label: "Progress updated", color: "text-sky-300 bg-sky-500/15", icon: Wrench },
  material_added: { label: "Material added", color: "text-amber-300 bg-amber-500/15", icon: Plus },
  material_updated: { label: "Material updated", color: "text-amber-300 bg-amber-500/15", icon: Pencil },
  material_removed: { label: "Material removed", color: "text-rose-300 bg-rose-500/15", icon: Trash2 },
  note_added: { label: "Note added", color: "text-slate-300 bg-slate-700", icon: FileText },
};

function relativeTime(value: string) {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, divisor] of units) {
    if (Math.abs(seconds) >= divisor) return formatter.format(Math.round(seconds / divisor), unit);
  }
  return "just now";
}

const money = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

const statusLabels: Record<string, string> = {
  enquiry: "Enquiry",
  quoted: "Quoted",
  deposit_paid: "Deposit paid",
  in_progress: "In progress",
  completed: "Completed",
  invoiced: "Invoiced",
  paid: "Paid",
};

function metadataValue(metadata: Record<string, unknown> | null, key: string) {
  return metadata?.[key];
}

function numberValue(metadata: Record<string, unknown> | null, key: string, fallback = 0) {
  const value = Number(metadataValue(metadata, key));
  return Number.isFinite(value) ? value : fallback;
}

function stringValue(metadata: Record<string, unknown> | null, key: string) {
  const value = metadataValue(metadata, key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function paymentMethodLabel(value: string | null) {
  if (!value) return "payment method";
  return value === "mpesa" ? "M-Pesa" : value.charAt(0).toUpperCase() + value.slice(1);
}

function formatEventDescription(
  eventType: JobEventType,
  description: string,
  metadata: Record<string, unknown> | null,
  amount: number | null,
) {
  const itemDescription = stringValue(metadata, "description");
  const quantity = numberValue(metadata, "quantity");
  const unitPrice = numberValue(metadata, "unit_price");
  const formattedItem = itemDescription && quantity > 0 && unitPrice > 0
    ? `${itemDescription}: ${quantity} × ${money.format(unitPrice)}`
    : itemDescription;

  switch (eventType) {
    case "job_created":
      return "Job created";
    case "quote_item_added":
      return itemDescription && quantity > 0 && unitPrice > 0
        ? `Added ${itemDescription} (${quantity} × ${money.format(unitPrice)}) to the quote`
        : description;
    case "quote_item_updated":
      return formattedItem ? `Quote updated - ${formattedItem}` : description;
    case "quote_item_removed":
      return itemDescription ? `Removed ${itemDescription} from the quote` : description;
    case "payment_received": {
      const reference = stringValue(metadata, "reference") ?? stringValue(metadata, "mpesa_receipt");
      return `Received ${money.format(amount ?? numberValue(metadata, "amount"))} via ${paymentMethodLabel(stringValue(metadata, "method"))}${reference ? ` (${reference})` : ""}`;
    }
    case "invoice_issued":
      return description || `Invoice ${stringValue(metadata, "invoice_number") ?? ""} issued - ${money.format(amount ?? numberValue(metadata, "total"))}`;
    case "invoice_cancelled":
      return description || `Invoice ${stringValue(metadata, "invoice_number") ?? ""} cancelled`;
    case "receipt_issued":
      return description || `Receipt ${stringValue(metadata, "receipt_number") ?? ""} issued - ${money.format(amount ?? numberValue(metadata, "amount"))} via ${paymentMethodLabel(stringValue(metadata, "method"))}`;
    case "receipt_cancelled":
      return description || `Receipt ${stringValue(metadata, "receipt_number") ?? ""} cancelled`;
    case "refund_issued": {
      const reason = stringValue(metadata, "reason") ?? stringValue(metadata, "refund_reason");
      return `Refunded ${money.format(amount ?? numberValue(metadata, "amount"))}${reason ? ` - ${reason}` : ""}`;
    }
    case "status_changed": {
      const from = stringValue(metadata, "from_status") ?? stringValue(metadata, "old_status");
      const to = stringValue(metadata, "to_status") ?? stringValue(metadata, "new_status");
      return from && to ? `Status moved from ${statusLabels[from] ?? from} to ${statusLabels[to] ?? to}` : description;
    }
    case "material_added": {
      const supplier = stringValue(metadata, "supplier") ?? stringValue(metadata, "vendor");
      return itemDescription && quantity > 0
        ? `Bought ${quantity} × ${itemDescription}${supplier ? ` from ${supplier}` : ""}${amount !== null ? ` - ${money.format(amount)}` : ""}`
        : description;
    }
    case "quote_sent":
    case "quote_revised": {
      const revision = numberValue(metadata, "revision");
      const total = amount ?? numberValue(metadata, "total");
      return `Quote ${eventType === "quote_sent" ? "sent" : "revised"} - ${money.format(total)}${revision > 0 ? ` (Revision ${revision})` : ""}`;
    }
    default:
      return description || eventPresentation[eventType]?.label || "Activity";
  }
}

export function JobTimeline({ jobId }: { jobId: string }) {
  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ["job-timeline", jobId],
    queryFn: () => getJobTimeline(jobId),
    enabled: Boolean(jobId),
  });

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 sm:p-7" aria-labelledby="job-activity-title">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300"><Activity size={19} /></div>
        <div><h2 id="job-activity-title" className="text-xl font-bold text-white">Activity</h2><p className="mt-1 text-sm text-slate-400">A history of changes to this job.</p></div>
      </div>
      {isLoading && <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" /> Loading activity...</div>}
      {error && <p className="text-sm text-red-400">Unable to load job activity.</p>}
      {!isLoading && !error && !events.length && <div className="rounded-2xl border border-dashed border-slate-700 p-7 text-center text-sm text-slate-400"><ClipboardList size={24} className="mx-auto mb-2 text-slate-600" />No activity recorded yet.</div>}
      {!!events.length && (
        <div className="relative ml-1">
          <div className="absolute bottom-4 left-4 top-4 w-px bg-slate-800" aria-hidden="true" />
          <div className="space-y-1">
            {events.map((event) => {
              const presentation = eventPresentation[event.event_type] ?? { label: "Activity", color: "text-slate-300 bg-slate-700", icon: Check };
              const Icon = presentation.icon;
              return (
                <div key={event.id} className="relative flex gap-3">
                  <div className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${presentation.color}`}><Icon size={15} /></div>
                  <div className="mb-1 flex min-w-0 flex-1 items-start justify-between gap-3 rounded-xl p-2">
                    <p className="text-sm text-slate-300">{formatEventDescription(event.event_type, event.description, event.metadata, event.amount)}</p>
                    <span className="shrink-0 text-xs text-slate-500">{relativeTime(event.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
