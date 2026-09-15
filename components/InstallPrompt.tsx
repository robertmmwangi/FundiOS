"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = Number(localStorage.getItem("fundios-install-dismissed") || 0);
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (standalone || Date.now() - dismissed < 14 * 24 * 60 * 60 * 1000) return;
    const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent) && !(navigator as Navigator & { standalone?: boolean }).standalone;
    queueMicrotask(() => setIos(isIos));
    const handler = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent); setVisible(true); };
    window.addEventListener("beforeinstallprompt", handler);
    if (isIos) queueMicrotask(() => setVisible(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible) return null;
  const dismiss = () => { localStorage.setItem("fundios-install-dismissed", Date.now().toString()); setVisible(false); };
  const install = async () => { if (event) { await event.prompt(); await event.userChoice; setVisible(false); } };
  return <div className="fixed left-4 right-4 top-4 z-50 rounded-2xl border border-slate-700 bg-slate-800 p-4 text-white shadow-xl"><button onClick={dismiss} className="absolute right-3 top-3 text-white" aria-label="Dismiss"><X size={18} /></button><p className="pr-5 text-sm">{ios ? "Add FundiOS to your home screen: tap Share, then 'Add to Home Screen'." : "Install FundiOS for quick access — no app store needed."}</p><div className="mt-3 flex gap-2">{!ios && <button onClick={install} className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold">Install</button>}<button onClick={dismiss} className="rounded-lg border border-slate-600 px-3 py-2 text-sm">Not now</button></div></div>;
}
