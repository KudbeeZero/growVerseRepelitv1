"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { resolveFeature, type FeatureName } from "@/lib/features";

/**
 * The backend's resolved feature-flag map (`GET /api/game/flags`). Public/no-auth
 * and rarely changes, so it's cached generously; a kill-switch flip is picked up
 * on the next refetch without a redeploy. Loaded once and shared by every gate
 * (route guards, nav visibility) via the React Query cache.
 */
export function useFlags() {
  return useQuery({
    queryKey: queryKeys.flags(),
    queryFn: () => api.flags.get(),
    staleTime: 60_000,
  });
}

/**
 * Runtime-resolved enablement for a web feature. Backend-mapped flags reflect the
 * live `GET /api/game/flags` value (optimistic-ON while loading); unmapped ones
 * (chain, contracts) use the build-time `FEATURES` fallback.
 */
export function useFlag(name: FeatureName): boolean {
  const { data } = useFlags();
  return resolveFeature(name, data);
}
