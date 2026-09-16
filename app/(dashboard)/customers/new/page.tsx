import Link from "next/link";
import { CustomerForm } from "@/components/Stage3";
export default function NewCustomerPage() { return <div className="space-y-5"><Link href="/customers" className="text-sm text-slate-400 hover:text-white">← Customers</Link><div><p className="text-sm font-medium text-sky-400">Relationships</p><h1 className="mt-1 text-3xl font-bold text-white">New customer</h1><p className="mt-2 text-slate-400">Keep the details you need to win and deliver the work.</p></div><CustomerForm /></div>; }
