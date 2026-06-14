"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { type FeatureName } from "@/lib/features";
import { useFlag } from "@/hooks/useFlags";
import { LoadingBlock } from "@/components/ui/Spinner";

/**
 * Guard a route behind an MVP feature flag, resolved at RUNTIME from
 * `GET /api/game/flags` (so a flag flip takes effect without a redeploy). When
 * the feature is off the user is sent back to the dashboard, so a deep-link to a
 * hidden system never renders. Resolution is optimistic-ON while the flag map
 * loads (backend defaults ON), so an enabled feature never flashes a redirect.
 */
export function RequireFeature({
  feature,
  children,
}: {
  feature: FeatureName;
  children: ReactNode;
}) {
  const router = useRouter();
  const enabled = useFlag(feature);

  useEffect(() => {
    if (!enabled) router.replace("/dashboard");
  }, [enabled, router]);

  if (!enabled) return <LoadingBlock label="Redirecting…" />;
  return <>{children}</>;
}
