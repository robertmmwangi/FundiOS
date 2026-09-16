"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { createPayment, updatePayment } from "@/lib/queries/payments";
import { ACTIVE_PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type Payment, type PaymentMethod } from "@/types";

const schema = z.object({
  amount: z.string().trim().min(1, "Amount is required.").refine((value) => Number(value.replace(/[^\d.-]/g, "")) > 0, "Amount must be greater than zero."),
  method: z.enum(["cash", "mpesa", "bank", "cheque", "other"]),
  reference: z.string().optional(),
  note: z.string().optional(),
  paid_at: z.string().min(1, "Paid date is required."),
});

type Values = z.infer<typeof schema>;

function parseAmount(value: string) {
  return Number(value.replace(/KSh/gi, "").replace(/,/g, "").replace(/\s/g, ""));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function PaymentFormSheet({
  open,
  jobId,
  balance,
  payment,
  onClose,
  onSaved,
}: {
  open: boolean;
  jobId: string;
  balance?: number;
  payment?: Payment;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { register, handleSubmit, setValue, control, reset, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      amount: payment ? String(payment.amount) : balance && balance > 0 ? String(balance) : "",
      method: payment?.method && ACTIVE_PAYMENT_METHODS.includes(payment.method as PaymentMethod) ? payment.method as PaymentMethod : "cash",
      reference: payment?.reference ?? payment?.mpesa_receipt ?? "",
      note: payment?.note ?? "",
      paid_at: payment?.paid_at ? payment.paid_at.slice(0, 10) : today(),
    },
  });
  const method = useWatch({ control, name: "method" });

  async function submit(values: Values) {
    const amount = parseAmount(values.amount);
    const input = {
      amount,
      method: values.method,
      reference: values.reference?.trim() || null,
      note: values.note?.trim() || null,
      paid_at: new Date(`${values.paid_at}T12:00:00`).toISOString(),
    };
    if (payment) await updatePayment(payment.id, input);
    else await createPayment({ job_id: jobId, ...input });
    reset();
    onSaved?.();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70" onClick={onClose}>
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-2xl rounded-t-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-7" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{payment ? "Edit payment" : "Record payment"}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Amount</label>
            <input {...register("amount")} inputMode="decimal" placeholder="KSh 85,000" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white" />
            {errors.amount && <p className="mt-1 text-sm text-red-400">{errors.amount.message}</p>}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-200">Method</p>
            <div className="flex flex-wrap gap-2">
              {ACTIVE_PAYMENT_METHODS.map((value) => (
                <button key={value} type="button" onClick={() => setValue("method", value, { shouldValidate: true })} className={`rounded-full px-3 py-2 text-sm font-semibold ${method === value ? "bg-sky-500 text-white" : "bg-slate-800 text-slate-200 hover:bg-slate-700"}`}>
                  {PAYMENT_METHOD_LABELS[value]}
                </button>
              ))}
            </div>
            {errors.method && <p className="mt-1 text-sm text-red-400">{errors.method.message}</p>}
          </div>
          <input {...register("reference")} placeholder={method === "mpesa" ? "M-Pesa receipt" : "Reference (optional)"} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white" />
          <textarea {...register("note")} rows={3} placeholder="Note (optional)" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white" />
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Paid date</label>
            <input {...register("paid_at")} type="date" max={today()} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white" />
            {errors.paid_at && <p className="mt-1 text-sm text-red-400">{errors.paid_at.message}</p>}
          </div>
          <button disabled={isSubmitting} className="w-full rounded-xl bg-sky-500 px-4 py-3 font-semibold text-white disabled:opacity-50">{isSubmitting ? "Saving..." : payment ? "Save changes" : "Record payment"}</button>
        </form>
      </div>
    </div>
  );
}
