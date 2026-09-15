"use client";

import { WifiOff } from "lucide-react";

export default function Offline() {
  return <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center"><WifiOff className="text-sky-400" size={48} /><h1 className="mt-5 text-3xl font-bold">You&apos;re offline</h1><p className="mt-3 max-w-md text-slate-400">FundiOS works offline. Your last synced data is available. Changes will sync when you reconnect.</p><button onClick={() => window.location.reload()} className="mt-6 rounded-lg bg-sky-500 px-5 py-3 font-semibold text-white">Retry</button></main>;
}
