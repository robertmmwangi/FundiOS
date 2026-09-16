import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Check, MessageCircle } from "lucide-react";

import { DownloadQuoteButton } from "@/components/quotes/DownloadQuoteButton";
import { getPublicQuote } from "@/lib/queries/public-quote";
import { calculateQuoteTotals } from "@/lib/vat";

const money = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

function formatPhone(phone: string | null) {
  return phone?.replace(/\D/g, "") ?? "";
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
  }).format(new Date(date));
}

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const quote = await getPublicQuote(jobId);

  if (!quote) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12 text-slate-950">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">FundiOS</p>
          <h1 className="mt-5 text-2xl font-bold">Quote not found</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            This quote may have been removed or the link is no longer valid.
          </p>
          <Link
            href="/"
            className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Back to FundiOS
          </Link>
        </div>
      </main>
    );
  }

  const totals = calculateQuoteTotals(quote.items);
  const total = totals.total;
  const phone = formatPhone(quote.business.phone);
  const businessName = quote.business.business_name?.trim() || "FundiOS business";
  const canAccept = quote.job.status !== "enquiry";
  const acceptanceMessage = canAccept
    ? `Hi ${businessName}, I accept the quote for ${quote.job.title}.`
    : `Hi ${businessName}, I would like to discuss this quote.`;
  const whatsappUrl = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(acceptanceMessage)}`
    : null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-5 flex items-center justify-between print:hidden">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-950">
            <ArrowLeft size={16} />
            FundiOS
          </Link>
          <span className="text-xs font-medium text-slate-400">Secure quote</span>
        </div>

        <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-7 sm:px-10">
            <div className="flex items-start justify-between gap-5">
              <div className="flex min-w-0 items-center gap-4">
                {quote.business.logo_url ? (
                  <Image
                    src={quote.business.logo_url}
                    alt={quote.business.business_name ?? "Business logo"}
                    width={48}
                    height={48}
                    className="rounded-md object-cover"
                    priority
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-lg font-bold text-sky-700">
                    {businessName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold text-slate-950">{businessName}</p>
                  {quote.business.phone && (
                    <a href={`tel:${quote.business.phone}`} className="mt-1 block text-sm text-slate-500 hover:text-sky-700">
                      {quote.business.phone}
                    </a>
                  )}
                  {quote.business.vat_registered && quote.business.vat_number && <p className="mt-1 text-xs text-slate-500">VAT No: {quote.business.vat_number}</p>}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold tracking-[0.2em] text-sky-700">QUOTE</p>
                  {quote.job.quote_revision > 0 && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">Revision {quote.job.quote_revision}</span>}
                </div>
                <p className="mt-2 text-xs text-slate-500">{formatDate(quote.job.quote_last_sent_at ?? quote.job.created_at)}</p>
              </div>
            </div>
          </div>

          <div className="px-5 py-7 sm:px-10 sm:py-9">
            <p className="text-sm text-slate-500">
              Prepared for <span className="font-semibold text-slate-900">{quote.customer.name}</span>
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{quote.job.title}</h1>
            {quote.job.description && (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{quote.job.description}</p>
            )}

            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="pb-3 pr-4 font-semibold">Description</th>
                    <th className="pb-3 px-2 text-right font-semibold">Qty</th>
                    <th className="pb-3 px-2 text-right font-semibold">Unit price</th>
                    <th className="pb-3 pl-2 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quote.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-4 pr-4 font-medium text-slate-800">{item.description}</td>
                      <td className="px-2 py-4 text-right text-slate-600">{item.quantity}</td>
                      <td className="px-2 py-4 text-right text-slate-600">{money.format(item.unit_price)}</td>
                      <td className="py-4 pl-2 text-right font-semibold text-slate-900">
                        {money.format(item.quantity * item.unit_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200">
                    <td colSpan={3} className="pt-5 text-right text-base font-semibold text-slate-600">
                      Subtotal
                    </td>
                    <td className="pt-5 text-right font-semibold text-slate-900">{money.format(totals.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="pt-2 text-right text-sm text-slate-500">VAT</td>
                    <td className="pt-2 text-right text-sm text-slate-700">{money.format(totals.vat_total)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="pt-3 text-right text-base font-semibold text-slate-600">Total</td>
                    <td className="pt-3 text-right text-xl font-bold text-slate-950">{money.format(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {quote.job.quote_vat_inclusive && <p className="mt-3 text-right text-xs text-slate-500">Total is inclusive of VAT</p>}

            <div className="mt-9 flex flex-col gap-3 sm:flex-row print:hidden">
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  <MessageCircle size={18} />
                  {canAccept ? "Accept quote" : "Discuss quote"}
                </a>
              ) : (
                <span className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-200 px-5 text-center text-sm font-semibold text-slate-500">
                  WhatsApp unavailable
                </span>
              )}
              <DownloadQuoteButton quote={quote} />
            </div>
          </div>

          <footer className="border-t border-slate-100 bg-slate-50 px-5 py-5 text-center text-xs text-slate-500 sm:px-10">
            <p className="inline-flex items-center gap-1.5">
              <Check size={14} className="text-emerald-600" />
              Prepared by {businessName}
            </p>
            {quote.business.phone && <p className="mt-1">{quote.business.phone}</p>}
          </footer>
        </article>
      </div>
    </main>
  );
}
