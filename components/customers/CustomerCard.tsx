import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Customer } from "@/types";

export function CustomerCard({ customer }: { customer: Customer }) {
  return <Link href={`/customers/${customer.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 hover:border-sky-500/40"><div className="min-w-0 flex-1"><p className="font-semibold text-white">{customer.name}</p><p className="mt-1 text-sm text-slate-400">{customer.phone}</p></div><ChevronRight size={18} className="text-slate-500" /></Link>;
}
