// Pure mappers that turn the existing strain + knowledge-base data into the
// view-model the scientist-grade GeneticsCard renders. No backend fields are
// invented: numeric cannabinoids (THC/CBD), genotype, yield, flowering, etc.
// come straight off the Strain object; the qualitative CBG/THCV and the
// effects/flavor/aroma tags come from the encyclopedia knowledge entry when one
// exists, and are simply omitted when it doesn't.

import type { Rarity, Strain } from "@/lib/types";

export interface RangeBar {
  label: string;
  /** Range as authored, e.g. [15, 20]. */
  range: [number, number];
  /** Where the range sits on the meter (0..max). */
  max: number;
  unit: string;
}

export interface QualLevel {
  /** Display label, e.g. "elevated", "trace". */
  text: string;
  /** Normalised 0..1 strength for the bar fill (best-effort from the words). */
  level: number;
}

export interface GenotypeSplit {
  indicaPct: number;
  sativaPct: number;
  /** "Indica-dominant" | "Sativa-dominant" | "Balanced hybrid". */
  label: string;
}

export interface Meter {
  pct: number; // 0..100
  label: string;
}

export interface GeneticsView {
  rarity: Rarity;
  genotype: GenotypeSplit;
  /** THC/CBD numeric % bars (always present from the Strain). */
  cannabinoids: RangeBar[];
  /** Qualitative CBG/THCV from the knowledge base (optional). */
  minorCannabinoids: Array<{ label: string } & QualLevel>;
  difficulty: Meter; // 0..100 with a 1..5 badge
  difficultyBadge: number; // 1..5
  stability: Meter; // 0..100
  flowering: { weeksLabel: string; range: [number, number]; max: number };
  yield: { range: [number, number]; max: number; unit: string };
  effects: string[];
  flavor: string[];
  aroma: string[];
  terpenes: string[];
  environment: string[];
}

/** Map a loose qualitative descriptor ("trace".."very high") to a 0..1 level. */
export function qualLevel(text: string | undefined | null): QualLevel {
  const t = (text ?? "").toLowerCase();
  // Pick the strongest keyword present so "low-moderate" → moderate-ish.
  const scale: Array<[RegExp, number]> = [
    [/very high|abundant|dominant/, 1],
    [/elevated|notable|high/, 0.8],
    [/moderate|medium/, 0.55],
    [/low/, 0.3],
    [/trace|minimal|tiny/, 0.12],
    [/none|<\s*1|absent/, 0.05],
  ];
  let level = 0.4; // unknown → middling
  for (const [re, v] of scale) {
    if (re.test(t)) {
      level = v;
      break;
    }
  }
  return { text: text ?? "—", level };
}

function genotypeSplit(indicaRatio: number): GenotypeSplit {
  const indicaPct = Math.round(Math.min(1, Math.max(0, indicaRatio)) * 100);
  const sativaPct = 100 - indicaPct;
  const label =
    indicaRatio >= 0.66
      ? "Indica-dominant"
      : indicaRatio <= 0.34
        ? "Sativa-dominant"
        : "Balanced hybrid";
  return { indicaPct, sativaPct, label };
}

/** Best-effort extraction of a qualitative field from a knowledge-base record. */
function kbStr(kb: Record<string, unknown> | null | undefined, ...path: string[]): string | undefined {
  let cur: unknown = kb;
  for (const key of path) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return typeof cur === "string" ? cur : undefined;
}

function kbList(kb: Record<string, unknown> | null | undefined, ...path: string[]): string[] {
  let cur: unknown = kb;
  for (const key of path) {
    if (!cur || typeof cur !== "object") return [];
    cur = (cur as Record<string, unknown>)[key];
  }
  if (Array.isArray(cur)) return cur.filter((x) => typeof x === "string") as string[];
  if (cur && typeof cur === "object") return Object.keys(cur as Record<string, unknown>);
  return [];
}

/**
 * Build the genetics view-model. `knowledge` is the optional encyclopedia entry
 * (data/strain_knowledge.yaml) — when absent, every knowledge-only field simply
 * comes back empty, so the card degrades gracefully for player-bred strains.
 */
export function buildGeneticsView(
  strain: Strain,
  knowledge?: Record<string, unknown> | null,
): GeneticsView {
  const difficulty = Math.min(5, Math.max(1, Math.round(strain.difficulty || 1)));
  const cbg = kbStr(knowledge, "cannabinoids", "cbg");
  const thcv = kbStr(knowledge, "cannabinoids", "thcv");
  const minor: Array<{ label: string } & QualLevel> = [];
  if (cbg) minor.push({ label: "CBG", ...qualLevel(cbg) });
  if (thcv) minor.push({ label: "THCV", ...qualLevel(thcv) });

  const flMid = (strain.flowering_days[0] + strain.flowering_days[1]) / 2;

  return {
    rarity: strain.rarity,
    genotype: genotypeSplit(strain.indica_ratio),
    cannabinoids: [
      { label: "THC", range: strain.thc_range, max: 35, unit: "%" },
      { label: "CBD", range: strain.cbd_range, max: 25, unit: "%" },
    ],
    minorCannabinoids: minor,
    difficulty: { pct: (difficulty / 5) * 100, label: ["—", "Easy", "Moderate", "Hard", "Expert", "Master"][difficulty] },
    difficultyBadge: difficulty,
    stability: { pct: Math.round(strain.stability * 100), label: `${Math.round(strain.stability * 100)}%` },
    flowering: {
      weeksLabel: `${Math.round(flMid / 7)} wk`,
      range: strain.flowering_days,
      max: 120,
    },
    yield: { range: strain.yield_range, max: 800, unit: "g" },
    effects: kbList(knowledge, "effects"),
    flavor: kbList(knowledge, "flavor"),
    aroma: kbList(knowledge, "aroma"),
    terpenes: strain.terpenes ?? kbList(knowledge, "terpenes"),
    environment: kbList(knowledge, "grow", "environment"),
  };
}
