export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-slate-50">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-sm font-semibold tracking-[0.18em] text-sky-300 uppercase">
            FundiOS
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-sm sm:p-7">
          {children}
        </div>
      </div>
    </main>
  );
}
