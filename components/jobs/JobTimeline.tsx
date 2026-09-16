"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Banknote,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Send,
  Trash2,
  Wrench,
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
  payment_received: { label: "Payment recorded", color: "text-emerald-300 bg-emerald-500/15", icon: Banknote },
  payment_updated: { label: "Payment updated", color: "text-amber-300 bg-amber-500/15", icon: Pencil },
  payment_deleted: { label: "Payment deleted", color: "text-rose-300 bg-rose-500/15", icon: Trash2 },
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

export function JobTimeline({ jobId }: { jobId: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);
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
              const isExpanded = expanded === event.id;
              return (
                <div key={event.id} className="relative flex gap-3">
                  <div className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${presentation.color}`}><Icon size={15} /></div>
                  <button type="button" onClick={() => setExpanded(isExpanded ? null : event.id)} className="mb-1 min-w-0 flex-1 rounded-xl p-2 text-left hover:bg-slate-800/60">
                    <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-200">{presentation.label}</p><p className="mt-0.5 text-sm text-slate-400">{event.description}</p></div><span className="flex shrink-0 items-center gap-1 text-xs text-slate-500">{relativeTime(event.created_at)}<ChevronDown size={14} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} /></span></div>
                    {isExpanded && event.metadata && <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950/80 p-3 text-xs leading-5 text-slate-400">{JSON.stringify(event.metadata, null, 2)}</pre>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
