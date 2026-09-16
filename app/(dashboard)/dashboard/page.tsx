"use client";

import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Clock3, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

import { getJobFinancials, getPaymentsForJob } from "@/lib/queries/payments";
import { getJobs } from "@/lib/queries/jobs";
import type { JobWithCustomer } from "@/types";

const money = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });

export default function Dashboard() {
  const [jobs, setJobs] = useState<JobWithCustomer[]>([]);
  const [outstanding, setOutstanding] = useState(0);
  const [receivedMonth, setReceivedMonth] = useState(0);

  useEffect(() => {
    async function load() {
      const allJobs = await getJobs();
      setJobs(allJobs);
      const activeJobs = allJobs.filter((job) => job.status !== "paid");
      const financials = await Promise.all(activeJobs.map((job) => getJobFinancials(job.id)));
      setOutstanding(financials.reduce((sum, item) => sum + Math.max(item.balance, 0), 0));
      const payments = await Promise.all(allJobs.map((job) => getPaymentsForJob(job.id)));
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      setReceivedMonth(payments.flat().filter((payment) => new Date(payment.paid_at) >= start).reduce((sum, payment) => sum + Number(payment.amount), 0));
    }
    void load();
  }, []);

  const active = jobs.filter((job) => job.status !== "paid").length;
  const inProgress = jobs.filter((job) => job.status === "in_progress").length;

  return (
    <div className="space-y-7">
      <div><p className="text-sm font-medium text-sky-400">FundiOS</p><h1 className="mt-2 text-3xl font-bold text-white">Good morning</h1><p className="mt-2 text-slate-400">Here’s what’s moving in your business.</p></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Summary icon={BriefcaseBusiness} label="Active Jobs" value={String(active)} />
        <Summary icon={Clock3} label="In Progress" value={String(inProgress)} />
        <Summary icon={Wallet} label="Outstanding Balance" value={money.format(outstanding)} />
        <Summary icon={Wallet} label="Received This Month" value={money.format(receivedMonth)} />
      </div>
      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold text-white">Recent Jobs</h2><Link href="/jobs" className="inline-flex items-center gap-1 text-sm text-sky-400 hover:text-sky-300">View all <ArrowRight size={15} /></Link></div>
        {jobs.slice(0, 5).map((job) => <RecentJob key={job.id} job={job} />)}
        {!jobs.length && <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">No jobs yet. <Link href="/jobs/new" className="text-sky-400 hover:underline">Create your first job</Link>.</div>}
      </section>
    </div>
  );
}

function RecentJob({ job }: { job: JobWithCustomer }) {
  const [balance, setBalance] = useState<number | null>(null);
  useEffect(() => { void getJobFinancials(job.id).then((result) => setBalance(Math.max(result.balance, 0))); }, [job.id]);
  return <Link href={`/jobs/${job.id}`} className="mb-3 block rounded-2xl border border-slate-800 bg-slate-900/70 p-4 hover:border-sky-500/40"><div className="flex justify-between gap-3"><div><p className="font-semibold text-white">{job.title}</p><p className="mt-1 text-sm text-slate-400">{job.customer?.name}</p></div><div className="flex items-center gap-2"><span className={`text-xs ${balance === 0 ? "text-emerald-300" : "text-amber-300"}`}>{balance === null ? "—" : balance === 0 ? "Paid" : money.format(balance)}</span><span className="text-xs text-sky-300">{job.status.replace("_", " ")}</span></div></div><div className="mt-3 h-1.5 rounded-full bg-slate-800"><div className="h-full rounded-full bg-sky-500" style={{ width: `${job.progress_percent}%` }} /></div></Link>;
}

function Summary({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><Icon size={18} className="text-sky-400" /><p className="mt-4 text-lg font-bold text-white">{value}</p><p className="mt-1 text-xs text-slate-400">{label}</p></div>;
}
