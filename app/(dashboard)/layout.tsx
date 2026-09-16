"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

import { BottomNav } from "@/components/BottomNav";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isOnboarding = pathname.startsWith("/onboarding");

  return (
    <>
      {!isOnboarding && (
        <header className="sticky top-0 z-40 flex min-h-14 items-center justify-between border-b border-slate-800/80 bg-slate-950/90 px-4 py-3 pt-[env(safe-area-inset-top)] backdrop-blur">
          <span className="text-sm font-semibold text-sky-500">FundiOS</span>
          <Link
            href="/settings"
            aria-label="Settings"
            className="text-slate-400 transition-colors hover:text-white"
          >
            <Settings size={20} />
          </Link>
        </header>
      )}
      <main className="mx-auto min-h-screen max-w-3xl px-4 pb-24 pt-8">{children}</main>
      {!isOnboarding && <BottomNav />}
    </>
  );
}
