"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Briefcase, Home, Plus, Wallet, X } from "lucide-react";
import { useState } from "react";

const tabs = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Jobs", href: "/jobs", icon: Briefcase },
  { label: "Finance", href: "/finance", icon: Wallet },
  { label: "Reports", href: "/reports", icon: BarChart3 },
];

export function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-slate-950/70" onClick={() => setOpen(false)}>
          <div className="absolute bottom-24 left-1/2 w-[min(20rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-slate-700 bg-slate-800 p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between px-2 text-sm font-semibold text-white">
              Create new
              <button aria-label="Close" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>
            <Link href="/jobs/new" className="block rounded-xl p-3 text-slate-100 hover:bg-slate-700">New Job</Link>
            <Link href="/customers?new=1" className="block rounded-xl p-3 text-slate-100 hover:bg-slate-700">New Customer</Link>
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
