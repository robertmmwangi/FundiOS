"use client";

import { useQuery } from "@tanstack/react-query";

type FoundingStatus = {
  open: boolean;
  remaining: number;
  cap: number;
};

export function FoundingBanner() {
  const { data, isLoading } = useQuery<FoundingStatus>({
    queryKey: ["founding-status"],
    queryFn: async () => {
      const response = await fetch("/api/founding-status");
      if (!response.ok) {
        throw new Error("Unable to load founding status.");
      }
      return response.json();
    },
    staleTime: 30_000,
  });

  if (isLoading || !data) {
    return null;
  }

  if (data.open && data.remaining > 0) {
    const used = Math.max(data.cap - data.remaining, 0);
    const progress = data.cap > 0 ? (used / data.cap) * 100 : 0;

    return (
      <div className="mb-6 rounded-2xl border border-sky-500/60 bg-sky-500/10 p-4 text-sky-100">
        <p className="text-sm font-semibold">Founding Member: free for life. Only {data.remaining} of {data.cap} slots left.</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-sky-950/50">
          <div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4 text-amber-100">
      <p className="text-sm font-semibold">Founding Member program is full. Plans start at KSh 700/month.</p>
    </div>
  );
}
