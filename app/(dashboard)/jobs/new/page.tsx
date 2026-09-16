import Link from "next/link";
import { JobForm } from "@/components/Stage3";
export default function NewJobPage() { return <div className="space-y-5"><Link href="/jobs" className="text-sm text-slate-400 hover:text-white">← Jobs</Link><div><p className="text-sm font-medium text-sky-400">Work pipeline</p><h1 className="mt-1 text-3xl font-bold text-white">New job</h1><p className="mt-2 text-slate-400">Capture the scope and keep the next step clear.</p></div><JobForm /></div>; }
