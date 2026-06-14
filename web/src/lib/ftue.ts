// First-Time User Experience (FTUE) — the "Grow Guide" coach.
//
// This module is the *pure brain* of the onboarding flow: given an authoritative
// snapshot of the player's grow (pods, seeds, plants, harvests) it resolves the
// single next thing the new grower should do. It is deliberately free of React
// and side effects so it can be unit-tested in isolation and trusted to never
// drift from what the dashboard actually shows.
//
// The guide is purely directional UI polish (DXT scope): it reads server-
// authoritative state and points the player at the right surface. It never
// mutates game state, money, or the chain.

import type { Pod, Seed, Plant, Harvest } from "@/lib/types";

export type FtueStepId =
  | "create-pod"
  | "get-seed"
  | "plant-seed"
  | "set-climate"
  | "grow-watch"
  | "harvest"
  | "next-strain";

export interface FtueStep {
  id: FtueStepId;
  /** 1-based position in the visible journey, for the "Step N of TOTAL" readout. */
  step: number;
  emoji: string;
  title: string;
  body: string;
  cta: { label: string; href: string };
  /** The celebratory payoff step — rendered with extra flourish. */
  celebrate?: boolean;
}

export interface FtueInput {
  pods: Pod[];
  seeds: Seed[];
  plants: Plant[];
  harvests: Harvest[];
}

/** Visible milestones in the new-grower journey (drives the progress dots). */
export const FTUE_TOTAL = 5;

/**
 * Resolve the player's current onboarding step, or `null` when there is nothing
 * to coach (brand-new state not yet loaded is the caller's concern; a returning
 * grower who has already harvested and replanted is considered "graduated").
 *
 * The order encodes the funnel: pod → seed → plant → climate → grow → harvest →
 * reward. Each branch keys off a durable, server-authoritative signal so the
 * guide advances on its own as the player acts — no manual "next" needed.
 */
export function resolveFtueStep(input: FtueInput): FtueStep | null {
  const { pods, seeds, plants, harvests } = input;

  const hasHarvest = harvests.length > 0;
  const livePlants = plants.filter((p) => p.is_alive && !p.harvested);
  const ripe = livePlants.find((p) => p.growth_stage === "harvest");
  const hasSeed = seeds.some((s) => s.quantity > 0);

  // Graduated: already reaped a harvest AND something new is already growing.
  // Such a player knows the loop; the guide steps aside.
  if (hasHarvest && livePlants.length > 0) return null;

  // The payoff. First harvest is in the bag — celebrate it and point at "what next".
  if (hasHarvest) {
    return {
      id: "next-strain",
      step: 5,
      emoji: "🎉",
      title: "First harvest — you did it!",
      body: "That's the whole loop: grow → care → harvest → reward. Now the fun part — what strain will you grow next?",
      cta: { label: "Browse the Strain Lab", href: "/lab" },
      celebrate: true,
    };
  }

  // A ripe plant is waiting for the scissors.
  if (ripe) {
    return {
      id: "harvest",
      step: 4,
      emoji: "✂️",
      title: "Your plant is ripe!",
      body: "Trichomes are frosting over and the buds have stacked. Open the plant and harvest to bank your reward.",
      cta: { label: "Harvest now", href: `/dashboard/plants/${ripe.id}` },
    };
  }

  // A plant is alive and growing.
  if (livePlants.length > 0) {
    const plant = livePlants[0];
    const pod = pods.find((p) => p.id === plant.pod_id);

    // Climate setpoints are null until the player dials them in — a clean signal.
    if (pod && pod.temperature == null) {
      return {
        id: "set-climate",
        step: 2,
        emoji: "🌡️",
        title: "Dial in the climate",
        body: "Open your pod's Environment & Weather controls and set a temperature. The right climate is what coaxes out frost and colour.",
        cta: { label: "Set the climate", href: "/dashboard" },
      };
    }

    return {
      id: "grow-watch",
      step: 3,
      emoji: "💧",
      title: "Keep it thriving",
      body: "It's growing in real time. Water it, watch the vitals, and check back as it stacks buds toward harvest.",
      cta: { label: "Tend your plant", href: `/dashboard/plants/${plant.id}` },
    };
  }

  // No plant in the ground yet — walk back to the first blocker.
  if (pods.length === 0) {
    return {
      id: "create-pod",
      step: 1,
      emoji: "📦",
      title: "Set up your first pod",
      body: "A grow pod is your cultivation chamber. Create one to give your seed a home.",
      cta: { label: "Create a pod", href: "/dashboard" },
    };
  }

  if (!hasSeed) {
    return {
      id: "get-seed",
      step: 1,
      emoji: "🛒",
      title: "Grab a seed",
      body: "Every grow starts with genetics. Pick up a seed in the Strain Lab to get planting.",
      cta: { label: "Open the Strain Lab", href: "/lab" },
    };
  }

  return {
    id: "plant-seed",
    step: 1,
    emoji: "🌱",
    title: "Plant your first seed",
    body: "You've got a pod and a seed — drop it in. Tap “Plant here” on your pod to start the grow.",
    cta: { label: "Plant your seed", href: "/dashboard" },
  };
}
