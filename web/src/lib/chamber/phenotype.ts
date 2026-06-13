// Phenotype Generator — the deterministic, visual-only resolution layer.
//
// This module answers one question: "given a strain's genetics, a plant's
// per-instance identity, the grow environment, the authoritative growth stage,
// and the current stress, what does the plant LOOK like right now?" It returns a
// single `ResolvedPhenotype` so future consumers (a renderer rewrite, mutation
// overlays, NFT trait badges) have one resolved object to read instead of
// re-wiring the scattered visual helpers themselves.
//
// IMPORTANT BOUNDARIES (see knowledge/phenotype-generator.md):
//   • Visual-only. This changes no gameplay rules, economy, chain, or genetics.
//     The DB stays authoritative; this is a presentation projection.
//   • Pure + deterministic. Same input → same output, always. No Date.now(), no
//     RNG except the seeded `mulberry32` stream. Safe to call on every render.
//   • Orchestrates, never reimplements. Every base visual number is produced by
//     the existing chamber helpers (morphologyFor, budColorForStrain, budDnaFor,
//     applyEnvironmentToBudDNA, silhouetteFor, effectiveDev). Only the small
//     "blends" that nobody owned yet (stem/pistil colour, curl/droop, budMass,
//     stressTint, trait lists) are new here.
//
// The renderer is intentionally NOT switched to consume this yet — that is a
// later, separate step. Exporting the generator + tests keeps this a safe,
// standby foundation.

import type { ConditionFlag, GrowthStage, Rarity } from "@/lib/types";
import {
  clamp,
  lerp,
  mulberry32,
  morphologyFor,
  effectiveDev,
  seedForPlant,
} from "./morphology";
import {
  budDnaFor,
  applyEnvironmentToBudDNA,
  type BudDNA,
  type GrowEnvironment,
  type PaletteColor,
} from "./budDna";
import { budColorForStrain, silhouetteFor } from "./strainVisuals";

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

/** The genetic identity a phenotype resolves against (a minimal view of Strain). */
export interface StrainDNA {
  /** 0 = sativa, 1 = indica — the master morphology knob. */
  indicaRatio: number;
  /** Slug/name for authored-strain lookups; either works (name is slugified). */
  slug?: string;
  name?: string;
  /** Rarity drives cosmetic `rarityTraits` only — no gameplay effect. */
  rarity?: Rarity;
}

/** Per-plant identity/variation. Holds NO economy/ledger fields — visual only. */
export interface PlantDNA {
  /** Stable per-plant seed; falls back to the top-level `seed`. */
  seed?: number;
  /** Explicit elapsed days — passed in (never derived from the clock) so the
   *  result stays deterministic and testable. */
  ageDays?: number;
  /** 0..100 plant health; nudges droop subtly. */
  health?: number;
}

/** Aggregate stress context. `stress` mirrors climateModel().stress (0..100). */
export interface StressState {
  stress?: number;
  conditionFlags?: ConditionFlag[];
}

export interface PhenotypeInput {
  strainDNA: StrainDNA;
  plantDNA?: PlantDNA;
  /** Pre-resolved BudDNA, if the caller already has one; else derived here. */
  budDNA?: BudDNA;
  /** Grow conditions; defaults to a neutral band when omitted. */
  environment?: GrowEnvironment;
  growthStage: GrowthStage;
  stressState?: StressState;
  /** Master deterministic seed; falls back to plantDNA.seed then a strain hash. */
  seed?: number;
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

/** An HSL colour triple (hue 0..360, sat/lit 0..100), matching the chamber's space. */
export interface Hsl {
  hue: number;
  sat: number;
  lit: number;
}

/** A subtle wash applied under stress — intensity 0..1, hue in the yellow/brown band. */
export interface StressTint {
  intensity: number;
  hue: number;
}

/**
 * A cosmetic mutation expressed by this phenotype. The catalog is intentionally
 * sparse for now — this is the documented plug-point where the colour-mutation
 * ladder (knowledge/mutation-system.md) and future generative traits attach.
 */
export interface MutationTrait {
  id: string;
  label: string;
  kind: "color" | "frost" | "morph";
  /** 0..1 expression strength, for the renderer/badge to scale. */
  intensity: number;
}

/** A cosmetic rarity flourish derived from the strain's rarity tier. */
export interface RarityTrait {
  id: string;
  label: string;
  rarity: Rarity;
}

/** The fully-resolved visual phenotype — the single object future consumers read. */
export interface ResolvedPhenotype {
  leafColor: Hsl;
  stemColor: Hsl;
  budPalette: PaletteColor[];
  pistilColor: Hsl;
  /** Genetic+environment trichome potential (0..1) before development gating. */
  trichomeDensity: number;
  /** 0..1 share of the resolved palette sitting in the purple band. */
  purpleExpression: number;
  /** Actual visible frost (0..1) = potential × development (+ UV highlight). */
  frostIntensity: number;
  leafCurl: number;
  leafDroop: number;
  branchDroop: number;
  /** 0..1 cola fill, stage-gated (zero outside flowering/harvest). */
  budMass: number;
  stressTint: StressTint;
  mutationTraits: MutationTrait[];
  rarityTraits: RarityTrait[];
}

// ---------------------------------------------------------------------------
// Defaults & small pure helpers (the only genuinely-new derivations)
// ---------------------------------------------------------------------------

/** Neutral grow band — the "nothing notable" baseline when no env is supplied. */
const NEUTRAL_ENV: GrowEnvironment = { temp: 24, light: 500, humidity: 52, water: 70 };

/** The hue band counted as "purple" when measuring purpleExpression. */
const PURPLE_LO = 255;
const PURPLE_HI = 320;

/** Stem = the leaf hue, woodier: pulled toward brown-green, darker and duller. */
function stemFromLeaf(leaf: Hsl): Hsl {
  return {
    hue: lerp(leaf.hue, 70, 0.35), // drift toward yellow-brown stem
    sat: leaf.sat * 0.6,
    lit: clamp(leaf.lit * 0.7, 8, 60),
  };
}

/**
 * Pistil colour: warm orange (≈30°) → magenta (≈320°) by `pistilMagenta`, then
 * browned by ripeness (`brown`) — ripe pistils darken and rust regardless of hue.
 */
function pistilColor(pistilMagenta: number, brown: number): Hsl {
  const m = clamp(pistilMagenta, 0, 1);
  const b = clamp(brown, 0, 1);
  return {
    hue: lerp(30, 320, m),
    sat: lerp(85, 60, b),
    lit: lerp(55, 34, b), // browning ⇒ darker, rustier pistils
  };
}

/** Purple-band weight share of a palette — the visible "how purple is it" measure. */
function purpleShare(palette: PaletteColor[]): number {
  const total = palette.reduce((s, p) => s + Math.max(0, p.weight), 0);
  if (total <= 0) return 0;
  const purple = palette
    .filter((p) => p.hue >= PURPLE_LO && p.hue <= PURPLE_HI)
    .reduce((s, p) => s + Math.max(0, p.weight), 0);
  return clamp(purple / total, 0, 1);
}

/** True if any active flag is one of the "leaf-burn / clawing" conditions. */
function burnPressure(flags: ConditionFlag[]): number {
  const sev = (s: ConditionFlag["severity"]) => (s === "severe" ? 1 : s === "moderate" ? 0.7 : 0.4);
  let p = 0;
  for (const f of flags) {
    if (f.condition === "nutrient_burn" || f.condition === "pest_infestation") p = Math.max(p, sev(f.severity));
  }
  return p;
}

/** True-ish pressure (0..1) of the "droopy/wilty/overwatered" conditions. */
function droopPressure(flags: ConditionFlag[]): number {
  const sev = (s: ConditionFlag["severity"]) => (s === "severe" ? 1 : s === "moderate" ? 0.7 : 0.4);
  let p = 0;
  for (const f of flags) {
    if (
      f.condition === "overwatered" ||
      f.condition === "wilting" ||
      f.condition === "underwatered" ||
      f.condition === "root_rot"
    ) {
      p = Math.max(p, sev(f.severity));
    }
  }
  return p;
}

// A tiny, deterministic cosmetic mutation catalog. Kept sparse on purpose: this
// is the FOUNDATION plug-point, not the full ladder. Each entry rolls against a
// fresh draw from the seeded stream and, when it fires, scales its intensity by
// the supporting signal (purple expression, frost, etc.). See knowledge/.
function rollMutations(
  seed: number,
  purpleExpression: number,
  frostIntensity: number,
): MutationTrait[] {
  const r = mulberry32(seed ^ 0x9e3779b9);
  const out: MutationTrait[] = [];
  // Variegation — rare leaf streaking, independent of colour.
  if (r() < 0.05) out.push({ id: "variegation", label: "Variegated", kind: "color", intensity: clamp(0.4 + r() * 0.6, 0, 1) });
  // Deep purple — only meaningful on already purple-expressing phenos.
  if (purpleExpression > 0.6 && r() < 0.18) {
    out.push({ id: "deep-purple", label: "Deep Purple", kind: "color", intensity: clamp(purpleExpression, 0, 1) });
  }
  // Frost mutant — exceptional resin, only when frost is already heavy.
  if (frostIntensity > 0.7 && r() < 0.12) {
    out.push({ id: "frost-mutant", label: "Frost Mutant", kind: "frost", intensity: clamp(frostIntensity, 0, 1) });
  }
  return out;
}

/** Cosmetic-only sheen for the upper rarity tiers. */
function rarityTraitsFor(rarity?: Rarity): RarityTrait[] {
  if (rarity === "legendary") return [{ id: "aurora-sheen", label: "Aurora Sheen", rarity }];
  if (rarity === "epic") return [{ id: "resin-sheen", label: "Resin Sheen", rarity }];
  return [];
}

// ---------------------------------------------------------------------------
// The generator
// ---------------------------------------------------------------------------

/**
 * Resolve a strain + plant + environment + stage + stress into one visual
 * phenotype. Pure and deterministic. Every field is finite and range-bounded,
 * and an unknown strain (no slug, sparse input) resolves safely via the existing
 * indica-ratio / seed fallbacks — it never throws.
 */
export function resolvePhenotype(input: PhenotypeInput): ResolvedPhenotype {
  const { strainDNA, growthStage } = input;
  const plant = input.plantDNA ?? {};
  const env = input.environment ?? NEUTRAL_ENV;
  const stressState = input.stressState ?? {};
  const flags = stressState.conditionFlags ?? [];
  const stress = clamp(stressState.stress ?? 0, 0, 100);
  const slug = strainDNA.slug ?? strainDNA.name;

  // Master seed: explicit → plant seed → a hash of the strain identity. Stable.
  const seed =
    input.seed ?? plant.seed ?? seedForPlant(slug ?? `idc:${strainDNA.indicaRatio}`);

  // 1) Base morphology (leaf colour + shape) straight from indica_ratio.
  const morph = morphologyFor(strainDNA.indicaRatio);
  const leafColor: Hsl = { hue: morph.hue, sat: morph.sat, lit: morph.lit };
  const stemColor = stemFromLeaf(leafColor);

  // 2) Bud colour (anthocyanin / pistil) + bud DNA, then layer the environment.
  const budColor = budColorForStrain(slug, morph.hue, seed);
  const baseBudDna = input.budDNA ?? budDnaFor(slug, budColor);
  const resolvedBudDna = applyEnvironmentToBudDNA(baseBudDna, env);
  const budPalette = resolvedBudDna.palette;

  // 3) Development (stage-gated): drives frost growth, browning, bud fill.
  const dev = effectiveDev(growthStage, plant.ageDays ?? 0);

  const trichomeDensity = clamp(resolvedBudDna.trichomeDensity, 0, 1);
  const frostIntensity = clamp(
    trichomeDensity * dev.trich + (resolvedBudDna.highlightBoost ?? 0) * 0.1,
    0,
    1,
  );
  const purpleExpression = purpleShare(budPalette);
  const pistil = pistilColor(budColor.pistilMagenta, dev.brown);

  // 4) Cola mass — development fill scaled by the strain's cola-mass silhouette.
  const sil = silhouetteFor(slug, strainDNA.indicaRatio);
  const budMass = clamp(dev.budDev * clamp(sil.colaScale, 0.6, 1.4), 0, 1);

  // 5) Stress-driven posture/colour. Mirrors applyEnvironmentToBudDNA's bands so
  //    the foundation reads the same way the bud already does.
  const drought = clamp((45 - env.water) / 45, 0, 1);
  const lightStress = clamp((env.light - 850) / 150, 0, 1);
  const overwater = clamp((env.water - 90) / 10, 0, 1);
  const health = clamp(plant.health ?? 100, 0, 100);
  const poorHealth = (100 - health) / 100;
  const burn = burnPressure(flags);
  const droop = droopPressure(flags);

  const leafCurl = clamp(drought * 0.6 + lightStress * 0.4 + burn * 0.5 + stress / 400, 0, 1);
  const leafDroop = clamp(overwater * 0.6 + droop * 0.7 + poorHealth * 0.3 + stress / 500, 0, 1);
  const branchDroop = clamp(budMass * 0.5 + droop * 0.3 + stress / 600, 0, 1);
  const stressTint: StressTint = {
    intensity: clamp(drought * 0.25 + (stress / 100) * 0.4 + burn * 0.3, 0, 0.6),
    hue: lerp(60, 38, clamp(drought + burn, 0, 1)), // yellowing → browning under load
  };

  // 6) Trait lists (visual-only; the documented extension points).
  const mutationTraits = rollMutations(seed, purpleExpression, frostIntensity);
  const rarityTraits = rarityTraitsFor(strainDNA.rarity);

  return {
    leafColor,
    stemColor,
    budPalette,
    pistilColor: pistil,
    trichomeDensity,
    purpleExpression,
    frostIntensity,
    leafCurl,
    leafDroop,
    branchDroop,
    budMass,
    stressTint,
    mutationTraits,
    rarityTraits,
  };
}
