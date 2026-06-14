"use client";

// DEV/TEST-ONLY growth-acceleration indicator.
//
// The backend exposes GROW_DEV_TIME_SCALE via GET /api/game/meta. When that gate
// is set (local/test only — NEVER production), grow/breed loops run in minutes
// instead of days. This banner makes that OBVIOUS so a tester never mistakes the
// accelerated cadence for the real game. In production the gate is unset, meta
// returns null, and this renders nothing.

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function DevModeBanner() {
  const { data } = useQuery({
    queryKey: ["meta"],
    queryFn: () => api.meta.get(),
    staleTime: 60_000,
    // Failure (e.g. backend down) must not block the app — just show nothing.
    retry: false,
  });

  const scale = data?.dev_time_scale ?? null;
  if (!scale) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-amber-500 px-3 py-1 text-center text-xs font-bold tracking-wide text-amber-950"
    >
      <span aria-hidden>⚡</span>
      TEST MODE — growth accelerated {scale}× (dev clock). Production cadence is unaffected.
    </div>
  );
}
