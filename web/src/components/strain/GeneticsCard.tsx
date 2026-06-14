"use client";

// Scientist-grade genetics card for the Strain Lab detail page.
//
// Turns the existing strain + encyclopedia data (no invented backend fields)
// into a premium, data-rich readout: cannabinoid % bars, an indica/sativa
// genotype split, difficulty/stability meters, a flowering timeline bar, a yield
// range bar, and colour-coded effect / flavor / aroma / terpene tag clouds.
// Fields with no data (e.g. CBG/THCV or effects for a player-bred strain that
// has no encyclopedia entry) are simply omitted, so it degrades gracefully.

import { Card, CardHeader } from "@/components/ui/Card";
import { RarityChip } from "@/components/ui/Pills";
import { titleCase, num } from "@/lib/format";
import type { Strain } from "@/lib/types";
import { buildGeneticsView, type RangeBar } from "@/lib/strainGenetics";

function RangeMeter({ bar, color }: { bar: RangeBar; color: string }) {
  const [lo, hi] = bar.range;
  const loPct = Math.max(0, Math.min(100, (lo / bar.max) * 100));
  const hiPct = Math.max(0, Math.min(100, (hi / bar.max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium tracking-wide text-gray-300">{bar.label}</span>
        <span className="font-mono text-xs text-gray-200">
          {num(lo, 1)}–{num(hi, 1)}
          {bar.unit}
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-ink-800">
        <div
          className="absolute inset-y-0 rounded-full"
          style={{ left: `${loPct}%`, width: `${Math.max(2, hiPct - loPct)}%`, background: color }}
        />
      </div>
    </div>
  );
}

function Meter({ pct, label, color }: { pct: number; label: string; color: string }) {
  const w = Math.max(0, Math.min(100, pct));
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium tracking-wide text-gray-300">{label}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink-800">
        <div className="h-full rounded-full" style={{ width: `${w}%`, background: color }} />
      </div>
    </div>
  );
}

function TagCloud({
  title,
  tags,
  className,
}: {
  title: string;
  tags: string[];
  className: string;
}) {
  if (tags.length === 0) return null;
  return (
    <div>
      <div className="instrument-label mb-1.5">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className={`rounded-full border px-2 py-0.5 text-xs ${className}`}>
            {titleCase(t)}
          </span>
        ))}
      </div>
    </div>
  );
}

const DIFFICULTY_COLORS = ["#6b7280", "#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444"];

export function GeneticsCard({
  strain,
  knowledge,
}: {
  strain: Strain;
  knowledge?: Record<string, unknown> | null;
}) {
  const v = buildGeneticsView(strain, knowledge);
  const diffColor = DIFFICULTY_COLORS[v.difficultyBadge] ?? "#6b7280";

  return (
    <Card className="space-y-5">
      <CardHeader
        title="Genetics & chemotype"
        subtitle="Cannabinoids, genotype, cultivation & sensory profile"
        action={<RarityChip rarity={v.rarity} />}
      />

      {/* Genotype split bar */}
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <span className="instrument-label">Genotype</span>
          <span className="text-xs font-medium text-gray-300">{v.genotype.label}</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full">
          <div
            className="flex items-center justify-center text-[9px] font-bold text-white"
            style={{ width: `${v.genotype.indicaPct}%`, background: "#8b5cf6" }}
          >
            {v.genotype.indicaPct >= 16 && `I ${v.genotype.indicaPct}%`}
          </div>
          <div
            className="flex items-center justify-center text-[9px] font-bold text-white"
            style={{ width: `${v.genotype.sativaPct}%`, background: "#22c55e" }}
          >
            {v.genotype.sativaPct >= 16 && `S ${v.genotype.sativaPct}%`}
          </div>
        </div>
      </div>

      {/* Cannabinoid % bars */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <RangeMeter bar={v.cannabinoids[0]} color="linear-gradient(90deg,#f59e0b,#ef4444)" />
        <RangeMeter bar={v.cannabinoids[1]} color="linear-gradient(90deg,#38bdf8,#22d3ee)" />
      </div>
      {v.minorCannabinoids.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {v.minorCannabinoids.map((m) => (
            <Meter
              key={m.label}
              pct={m.level * 100}
              label={`${m.label} · ${m.text}`}
              color="linear-gradient(90deg,#a3e635,#84cc16)"
            />
          ))}
        </div>
      )}

      {/* Difficulty + stability meters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium tracking-wide text-gray-300">Grow difficulty</span>
            <span
              className="rounded-full border px-2 py-0.5 text-[10px] font-bold"
              style={{ borderColor: diffColor, color: diffColor }}
            >
              {v.difficulty.label}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-800">
            <div className="h-full rounded-full" style={{ width: `${v.difficulty.pct}%`, background: diffColor }} />
          </div>
        </div>
        <Meter pct={v.stability.pct} label={`Stability · ${v.stability.label}`} color="linear-gradient(90deg,#34d399,#10b981)" />
      </div>

      {/* Flowering timeline + yield range */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium tracking-wide text-gray-300">Flowering</span>
            <span className="font-mono text-xs text-gray-200">
              {num(v.flowering.range[0])}–{num(v.flowering.range[1])} d · ~{v.flowering.weeksLabel}
            </span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-full bg-ink-800">
            <div
              className="absolute inset-y-0 rounded-full"
              style={{
                left: `${(v.flowering.range[0] / v.flowering.max) * 100}%`,
                width: `${Math.max(2, ((v.flowering.range[1] - v.flowering.range[0]) / v.flowering.max) * 100)}%`,
                background: "linear-gradient(90deg,#c084fc,#f472b6)",
              }}
            />
          </div>
        </div>
        <RangeMeter bar={{ label: "Yield", range: v.yield.range, max: v.yield.max, unit: v.yield.unit }} color="linear-gradient(90deg,#fbbf24,#f59e0b)" />
      </div>

      {/* Tag clouds */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TagCloud title="Effects" tags={v.effects} className="border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200" />
        <TagCloud title="Flavor" tags={v.flavor} className="border-amber-500/40 bg-amber-500/10 text-amber-200" />
        <TagCloud title="Aroma" tags={v.aroma} className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200" />
        <TagCloud title="Terpenes" tags={v.terpenes} className="border-violet-500/40 bg-violet-500/10 text-violet-300" />
      </div>
      {v.environment.length > 0 && (
        <TagCloud title="Environment" tags={v.environment} className="border-sky-500/40 bg-sky-500/10 text-sky-200" />
      )}
    </Card>
  );
}
