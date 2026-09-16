"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Briefcase, Home, Plus, TrendingDown, TrendingUp, Wallet, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getJobs } from "@/lib/queries/jobs";
import type { JobWithCustomer } from "@/types";

const tabs = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Jobs", href: "/jobs", icon: Briefcase },
  { label: "Finance", href: "/finance", icon: Wallet },
  { label: "Reports", href: "/reports", icon: BarChart3 },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [incomeJobs, setIncomeJobs] = useState<JobWithCustomer[] | null>(null);
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function goTo(href: string) {
    setOpen(false);
    router.push(href);
  }

  async function chooseIncome() {
    const jobs = (await getJobs()).filter((job) => job.status !== "paid");
    if (jobs.length === 1) {
      goTo(`/jobs/${jobs[0].id}?payment=new`);
    } else {
      setOpen(false);
      setIncomeJobs(jobs);
    }
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-slate-950/70" onClick={() => setOpen(false)}>
          <div className="absolute bottom-24 left-1/2 w-[min(20rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-slate-700 bg-slate-800 p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between px-2 text-sm font-semibold text-white">
              Create new
              <button aria-label="Close" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>
            <button type="button" onClick={() => goTo("/jobs/new")} className="block w-full rounded-xl p-3 text-left text-slate-100 hover:bg-slate-700">New Job</button>
            <button type="button" onClick={() => goTo("/customers?new=1")} className="block w-full rounded-xl p-3 text-left text-slate-100 hover:bg-slate-700">New Customer</button>
            <div className="my-2 border-t border-slate-700 pt-2">
              <p className="px-3 pb-1 text-xs uppercase tracking-wider text-slate-500">Money</p>
              <button type="button" onClick={() => void chooseIncome()} className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-slate-100 hover:bg-slate-700"><TrendingUp size={18} className="text-emerald-400" />Record Income</button>
              <button type="button" onClick={() => goTo("/finance?new=expense")} className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-slate-100 hover:bg-slate-700"><TrendingDown size={18} className="text-red-400" />Record Expense</button>
            </div>
          </div>
        </div>
      )}
      {incomeJobs && (
        <div className="fixed inset-0 z-50 bg-slate-950/70" onClick={() => setIncomeJobs(null)}>
          <div className="absolute bottom-24 left-1/2 w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-slate-700 bg-slate-800 p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between text-sm font-semibold text-white">
              <span>Select a job</span>
              <button type="button" onClick={() => setIncomeJobs(null)} aria-label="Close"><X size={18} /></button>
            </div>
            {!incomeJobs.length && <p className="p-3 text-sm text-slate-400">No active jobs available.</p>}
            {incomeJobs.map((job) => (
              <button key={job.id} type="button" onClick={() => { setIncomeJobs(null); goTo(`/jobs/${job.id}?payment=new`); }} className="block w-full rounded-xl p-3 text-left hover:bg-slate-700">
                <p className="font-semibold text-white">{job.title}</p>
                <p className="mt-1 text-xs text-slate-400">{job.customer?.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}
      <nav className="fixed bottom-0 left-0 right-0 z-30 h-16 border-t border-slate-700 bg-slate-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex h-full max-w-xl items-center justify-around">
          {tabs.slice(0, 2).map(({ label, href, icon: Icon }) => (
            <NavItem key={href} label={label} href={href} active={pathname.startsWith(href)} Icon={Icon} />
          ))}
          <button onClick={() => setOpen(true)} className="relative -top-5 flex h-14 w-14 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg shadow-sky-500/30" aria-label="Create new">
            <Plus size={28} />
          </button>
          {tabs.slice(2).map(({ label, href, icon: Icon }) => (
            <NavItem key={href} label={label} href={href} active={pathname.startsWith(href)} Icon={Icon} />
          ))}
        </div>
      </nav>
    </>
  );
}

function NavItem({ label, href, active, Icon }: { label: string; href: string; active: boolean; Icon: typeof Home }) {
  return <Link href={href} className={`flex w-16 flex-col items-center gap-1 text-xs ${active ? "text-sky-400" : "text-slate-400"}`}><Icon size={20} />{label}</Link>;
}
