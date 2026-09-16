import { createClient } from "@/lib/supabase/client";
import { logJobEvent } from "@/lib/queries/job-events";
import type { Payment, PaymentMethod, PaymentWithContext, QuoteItem, Receipt } from "@/types";

export type PaymentInput = {
  job_id: string;
  amount: number;
  method?: PaymentMethod;
  mpesa_receipt?: string | null;
  reference?: string | null;
  note?: string | null;
  paid_at?: string;
  invoice_id?: string | null;
};

export type PaymentUpdate = Partial<
  Pick<Payment, "amount" | "method" | "reference" | "note" | "paid_at">
>;

export async function createRefund(input: {
  job_id: string;
  amount: number;
  method?: PaymentMethod;
  reference?: string | null;
  reason: string;
}): Promise<Payment> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("payments")
    .insert({
      job_id: input.job_id,
      amount: input.amount,
      method: input.method ?? "cash",
      reference: input.reference ?? null,
      refund_reason: input.reason,
      is_refund: true,
      user_id: user.id,
      paid_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(`Unable to create refund: ${error.message}`);
  const payment = data as Payment;
  await logJobEvent({
    jobId: payment.job_id,
    eventType: "refund_issued",
    description: `Refund of KSh ${payment.amount.toLocaleString()} issued via ${payment.method}`,
    amount: payment.amount,
    metadata: { method: payment.method, payment_id: payment.id, reason: input.reason },
  });
  return payment;
}

export async function getPaymentsForJob(jobId: string): Promise<Payment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("job_id", jobId)
    .order("paid_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load payments: ${error.message}`);
  }

  return (data ?? []) as Payment[];
}

export async function getReceiptsForJob(jobId: string): Promise<Receipt[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Unable to load receipts: ${error.message}`);
  return (data ?? []) as Receipt[];
}

export async function getPaymentsWithContext(): Promise<PaymentWithContext[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*, job:jobs(id, title, customer:customers(id, name))")
    .order("paid_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load payments: ${error.message}`);
  }

  return ((data ?? []) as Array<Payment & { job: { id: string; title: string; customer: { id: string; name: string } | null } | null }>).map((payment) => ({
    ...payment,
    customer: payment.job?.customer ?? null,
    job: payment.job ? { id: payment.job.id, title: payment.job.title } : null,
  }));
}

export async function createPayment(input: PaymentInput): Promise<Payment> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("payments")
    .insert({
      ...input,
      method: input.method ?? "cash",
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Unable to create payment: ${error.message}`);
  }

  const payment = data as Payment;
  await logJobEvent({
    jobId: payment.job_id,
    eventType: "receipt_issued",
    description: `Receipt ${payment.receipt_number ?? "pending"} issued - KSh ${payment.amount.toLocaleString()} via ${payment.method}`,
    amount: payment.amount,
    metadata: { receipt_number: payment.receipt_number, method: payment.method, payment_id: payment.id },
  });
  return payment;
}

export async function updatePayment(id: string, input: PaymentUpdate): Promise<Payment> {
  const supabase = createClient();
  const { data, error } = await supabase.from("payments").update(input).eq("id", id).select().single();

  if (error) {
    throw new Error(`Unable to update payment: ${error.message}`);
  }

  return data as Payment;
}

export async function cancelPayment(id: string, reason: string): Promise<Payment> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payments")
    .update({ cancelled_at: new Date().toISOString(), cancelled_reason: reason })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Unable to cancel payment: ${error.message}`);
  const payment = data as Payment;
  await logJobEvent({
    jobId: payment.job_id,
    eventType: "receipt_cancelled",
    description: `Receipt ${payment.receipt_number ?? "pending"} cancelled - ${reason}`,
    metadata: { receipt_number: payment.receipt_number, payment_id: payment.id, reason },
  });
  return payment;
}

export async function deletePayment(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("payments").delete().eq("id", id);

  if (error) {
    throw new Error(`Unable to delete payment: ${error.message}`);
  }
}

export async function getJobFinancials(jobId: string): Promise<{
  total_quoted: number;
  total_paid: number;
  total_refunded: number;
  net_paid: number;
  balance: number;
}> {
  const supabase = createClient();
  const [{ data: quoteItems, error: quoteError }, { data: payments, error: paymentError }, { data: invoices, error: invoiceError }] = await Promise.all([
    supabase.from("quote_items").select("quantity, unit_price").eq("job_id", jobId),
    supabase.from("payments").select("amount, is_refund, cancelled_at").eq("job_id", jobId),
    supabase.from("invoices").select("total, cancelled_at").eq("job_id", jobId).is("cancelled_at", null).order("revision", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (quoteError) {
    throw new Error(`Unable to load quoted total: ${quoteError.message}`);
  }

  if (paymentError) {
    throw new Error(`Unable to load paid total: ${paymentError.message}`);
  }
  if (invoiceError) throw new Error(`Unable to load invoice total: ${invoiceError.message}`);

  const total_quoted = ((quoteItems ?? []) as Pick<QuoteItem, "quantity" | "unit_price">[]).reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unit_price),
    0,
  );
  const activePayments = (payments ?? []).filter((payment) => !payment.cancelled_at) as Pick<Payment, "amount" | "is_refund">[];
  const total_paid = activePayments.reduce(
    (sum, payment) => sum + (payment.is_refund ? 0 : Number(payment.amount)),
    0,
  );
  const total_refunded = activePayments.reduce(
    (sum, payment) => sum + (payment.is_refund ? Number(payment.amount) : 0),
    0,
  );
  const net_paid = total_paid - total_refunded;

  return {
    total_quoted: invoices?.total != null ? Number(invoices.total) : total_quoted,
    total_paid,
    total_refunded,
    net_paid,
    balance: (invoices?.total != null ? Number(invoices.total) : total_quoted) - net_paid,
  };
}
