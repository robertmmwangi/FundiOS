"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { createCustomer, updateCustomer } from "@/lib/queries/customers";
import type { Customer } from "@/types";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  phone: z.string().trim().min(1, "Phone is required."),
  email: z.union([z.literal(""), z.string().email("Enter a valid email address.")]),
  notes: z.string().optional(),
});

type Values = z.infer<typeof schema>;

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254")) return `+${digits}`;
  if (digits.startsWith("0")) return `+254${digits.slice(1)}`;
  return digits ? `+254${digits}` : "";
}

export function CustomerFormSheet({
  open,
  customer,
  onClose,
  onSaved,
}: {
  open: boolean;
  customer?: Customer;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      name: customer?.name ?? "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
      notes: customer?.notes ?? "",
    },
  });

  const submit = async (values: Values) => {
    const phone = normalizePhone(values.phone);
    if (!phone) throw new Error("Phone is required.");
    if (customer) {
      await updateCustomer(customer.id, { ...values, phone, email: values.email || null });
    } else {
      await createCustomer({ ...values, phone, email: values.email || null });
    }
    reset();
    onSaved?.();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70" onClick={onClose}>
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-2xl rounded-t-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-7" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{customer ? "Edit customer" : "New customer"}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <input {...register("name")} placeholder="Name" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white" />
          {errors.name && <p className="text-sm text-red-400">{errors.name.message}</p>}
          <input {...register("phone")} placeholder="0712 345 678" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white" />
          {errors.phone && <p className="text-sm text-red-400">{errors.phone.message}</p>}
          <input {...register("email")} type="email" placeholder="Email (optional)" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white" />
          {errors.email && <p className="text-sm text-red-400">{errors.email.message}</p>}
          <textarea {...register("notes")} rows={3} placeholder="Notes (optional)" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white" />
          <button disabled={isSubmitting} className="w-full rounded-xl bg-sky-500 px-4 py-3 font-semibold text-white disabled:opacity-50">{isSubmitting ? "Saving..." : "Save customer"}</button>
        </form>
      </div>
    </div>
  );
}
