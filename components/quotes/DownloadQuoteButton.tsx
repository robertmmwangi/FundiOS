"use client";

import { Download } from "lucide-react";

import { generateQuotePDF } from "@/lib/pdf/quote-pdf";
import type { PublicQuote } from "@/types";

export function DownloadQuoteButton({ quote }: { quote: PublicQuote }) {
  const download = () => {
    generateQuotePDF(quote).save(`quote-${quote.job.id.slice(0, 8)}.pdf`);
  };

  return (
    <button
      type="button"
      onClick={download}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
    >
      <Download size={18} />
      Download PDF
    </button>
  );
}
