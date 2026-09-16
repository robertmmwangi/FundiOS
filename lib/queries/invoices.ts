import { createClient } from "@/lib/supabase/client";
import { calculateQuoteTotals } from "@/lib/vat";
import { getJob } from "@/lib/queries/jobs";
import { getQuoteItems } from "@/lib/queries/quote-items";
import { logJobEvent } from "@/lib/queries/job-events";
import type { Invoice, InvoiceItem } from "@/types";

export async function getInvoicesForJob(jobId: string): Promise<Invoice[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("job_id", jobId)
    .order("revision", { ascending: false });

  if (error) throw new Error(`Unable to load invoices: ${error.message}`);
  return (data ?? []) as Invoice[];
}

export async function getLatestInvoice(jobId: string): Promise<Invoice | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("job_id", jobId)
    .is("cancelled_at", null)
    .order("revision", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Unable to load latest invoice: ${error.message}`);
  return data as Invoice | null;
}

async function nextInvoiceNumber(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await supabase.rpc("nextval_invoice_number");
  if (!error && typeof data === "string") return data;

  const { count, error: countError } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (countError) throw new Error(`Unable to generate invoice number: ${countError.message}`);
  return `INV-${String((count ?? 0) + 1).padStart(4, "0")}`;
}

export async function createInvoice(input: { job_id: string; notes?: string }): Promise<Invoice> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const [items, job, invoices] = await Promise.all([
    getQuoteItems(input.job_id),
    getJob(input.job_id),
    getInvoicesForJob(input.job_id),
  ]);
  const totals = calculateQuoteTotals(items);
  const latestInvoice = invoices.find((invoice) => !invoice.cancelled_at) ?? null;
  const revision = latestInvoice ? latestInvoice.revision + 1 : 1;
  const snapshot = items.map((item): InvoiceItem => ({
    id: item.id,
    description: item.description,
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    sort_order: item.sort_order,
    vat_applicable: item.vat_applicable,
    vat_rate: Number(item.vat_rate),
    price_includes_vat: item.price_includes_vat,
  }));
  const invoiceNumber = await nextInvoiceNumber(supabase, user.id);

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      job_id: input.job_id,
      user_id: user.id,
      invoice_number: invoiceNumber,
      revision,
      subtotal: totals.subtotal,
      vat_total: totals.vat_total,
      total: totals.total,
      vat_inclusive: job.quote_vat_inclusive,
      notes: input.notes?.trim() || null,
      snapshot,
      is_revised: revision > 1,
      revised_from_id: latestInvoice?.id ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Unable to create invoice: ${error.message}`);
  const invoice = data as Invoice;
  await logJobEvent({
    jobId: input.job_id,
    eventType: "invoice_issued",
    description: `Invoice ${invoice.invoice_number} issued - KSh ${invoice.total.toLocaleString()}`,
    amount: invoice.total,
    metadata: { invoice_id: invoice.id, invoice_number: invoice.invoice_number },
  });
  return invoice;
}

export async function cancelInvoice(invoiceId: string, reason: string): Promise<Invoice> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("invoices")
    .update({ cancelled_at: new Date().toISOString(), cancelled_reason: reason })
    .eq("id", invoiceId)
    .select()
    .single();

  if (error) throw new Error(`Unable to cancel invoice: ${error.message}`);
  const invoice = data as Invoice;
  await logJobEvent({
    jobId: invoice.job_id,
    eventType: "invoice_cancelled",
    description: `Invoice ${invoice.invoice_number} cancelled - ${reason}`,
    metadata: { invoice_id: invoice.id, invoice_number: invoice.invoice_number, reason },
  });
  return invoice;
}

export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle();

  if (error) throw new Error(`Unable to load invoice: ${error.message}`);
  return data as Invoice | null;
}
