"use client";

// The "Grow Guide" — a calm, game-state-driven FTUE coach. It floats above the
// app, reads the player's real grow state, and points at the single next action
// in the core loop (pod → seed → plant → climate → grow → harvest → reward),
// advancing on its own as the player acts. Mobile-first, safe-area aware,
// keyboard- and screen-reader-friendly, and silent under reduced-motion.
//
// Strictly presentation: it navigates and explains, never mutating game state.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { usePods, useSeeds, usePlantsList, useHarvests } from "@/hooks/queries";
import { useFtueStore } from "@/lib/ftueStore";
import { resolveFtueStep, FTUE_TOTAL } from "@/lib/ftue";

// Inset the floating card past notches / home indicators on mobile.
const SAFE_INSET: React.CSSProperties = {
  bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
  right: "calc(env(safe-area-inset-right, 0px) + 1rem)",
  left: "calc(env(safe-area-inset-left, 0px) + 1rem)",
};

export function GrowGuide() {
  const { playerId, isAuthed, hydrated } = useSession();
  const done = useFtueStore((s) => (playerId ? Boolean(s.done[playerId]) : false));
  const finish = useFtueStore((s) => s.finish);

  const pods = usePods();
  const seeds = useSeeds();
  const plants = usePlantsList();
  const harvests = useHarvests();

  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  // Esc collapses the expanded card — a familiar dismissal gesture.
  useEffect(() => {
    if (collapsed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCollapsed(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collapsed]);

  const goFinish = useCallback(() => {
    if (playerId) finish(playerId);
  }, [playerId, finish]);

  // Gate: only for a signed-in player whose grow snapshot has actually loaded,
  // so the guide never flashes stale or empty advice on first paint.
  if (!hydrated || !isAuthed || !playerId || done) return null;
  if (!pods.data || !seeds.data || !plants.data || !harvests.data) return null;

  const step = resolveFtueStep({
    pods: pods.data,
    seeds: seeds.data,
    plants: plants.data,
    harvests: harvests.data,
  });
  if (!step) return null;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        style={SAFE_INSET}
        className="fixed left-auto z-40 inline-flex items-center gap-2 rounded-full border border-grow-500 bg-ink-900/95 px-4 py-2 text-sm font-semibold text-grow-200 shadow-glow-soft backdrop-blur transition-colors hover:bg-ink-800"
        aria-label={`Open Grow Guide — step ${step.step} of ${FTUE_TOTAL}`}
      >
        <span aria-hidden>{step.emoji}</span>
        Grow Guide
        <span className="instrument-value text-[11px] text-gray-400">
          {step.step}/{FTUE_TOTAL}
        </span>
      </button>
    );
  }

  return (
    <section
      style={SAFE_INSET}
      aria-label="Getting started guide"
      className="animate-fade-up fixed z-40 mx-auto w-auto max-w-sm rounded-2xl border border-grow-700/70 bg-ink-900/95 p-4 shadow-glow-soft backdrop-blur sm:left-auto"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="instrument-label text-grow-300">Grow Guide</span>
          <span className="instrument-value text-[11px] text-gray-500">
            Step {step.step} of {FTUE_TOTAL}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="rounded-md px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-ink-700 hover:text-gray-200"
          aria-label="Collapse Grow Guide"
        >
          Hide
        </button>
      </div>

      {/* Progress dots — a glanceable sense of the journey. */}
      <div className="mb-3 flex items-center gap-1.5" aria-hidden>
        {Array.from({ length: FTUE_TOTAL }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < step.step ? "bg-grow-500" : "bg-ink-600"
            }`}
          />
        ))}
      </div>

      {/* Live region: the active instruction is announced as the player advances. */}
      <div aria-live="polite">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-100">
          <span aria-hidden className={step.celebrate ? "animate-twinkle" : undefined}>
            {step.emoji}
          </span>
          {step.title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-gray-300">{step.body}</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={goFinish}
          className="rounded-md px-2.5 py-1.5 text-xs text-gray-400 transition-colors hover:text-gray-200"
        >
          {step.celebrate ? "Done" : "Skip tour"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (step.celebrate) goFinish();
            router.push(step.cta.href);
          }}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-grow-500 bg-grow-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-grow-500"
        >
          {step.cta.label}
          <span aria-hidden>→</span>
        </button>
      </div>
    </section>
  );
}
