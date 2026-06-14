// Canonical stage-PNG generation config — the single source of truth for the
// 7 launch strains × 5 growth stages export matrix (PR #29). Pure + DOM-free so
// it unit-tests under vitest and drives the offline PNG generator identically
// every run. See knowledge/stage-png-generation.md.
//
// This composes the existing pure derivation helpers (morphologyFor,
// silhouetteFor, budColorForStrain, budDnaFor, applyEnvironmentToBudDNA,
// stageForDay, previewDev) into the exact prop bundle GrowChamber consumes —
// the SAME path the live chamber page uses for its growth-preview scrubber, so a
// canonical still equals what a player sees scrubbing that strain's timeline.
//
// Phenotype-foundation compatibility (PR #27 stays parked): resolveChamberProps
// is the single seam where a future ResolvedPhenotype would plug in. It returns a
// plain resolved bundle, so swapping the internals later needs no change to the
// export route or the generator.

import type { ConditionFlag, GrowthStage } from "@/lib/types";
import {
  morphologyFor,
  seedForPlant,
  stageForDay,
  previewDev,
  type ClimateInput,
  type DevParams,
  type Morphology,
  type BudColor,
  type Silhouette,
} from "./morphology";
import { budColorForStrain, silhouetteFor } from "./strainVisuals";
import { budDnaFor, applyEnvironmentToBudDNA, type BudDNA } from "./budDna";

/** A launch strain's canonical DNA for the export matrix. `indicaRatio` +
 *  `floweringTime` mirror the backend catalog (data/strains.yaml) for the three
 *  seeded strains; the four launch-only strains use sensible canonical values
 *  (kept here, deliberately NOT added to the catalog — this is export-only). */
export interface LaunchStrain {
  slug: string;
  name: string;
  indicaRatio: number;
  /** Flowering-window length in days (= catalog flowering_time). */
  floweringTime: number;
}

export const LAUNCH_STRAINS: readonly LaunchStrain[] = [
  { slug: "g13", name: "G13", indicaRatio: 0.7, floweringTime: 60 },
  { slug: "purple-diddy-punch", name: "Purple Diddy Punch", indicaRatio: 0.8, floweringTime: 60 },
  { slug: "animal-mints", name: "Animal Mints", indicaRatio: 0.75, floweringTime: 60 },
  { slug: "white-rhino", name: "White Rhino", indicaRatio: 0.85, floweringTime: 56 },
  { slug: "white-fire-og", name: "White Fire OG", indicaRatio: 0.55, floweringTime: 63 },
  { slug: "gelato", name: "Gelato", indicaRatio: 0.55, floweringTime: 60 },
  { slug: "wedding-cake", name: "Wedding Cake", indicaRatio: 0.6, floweringTime: 60 },
] as const;

/** The 5 canonical growth stages, in progression order. */
export const CANONICAL_STAGES = [
  "seedling",
  "vegetative",
  "early-flower",
  "late-flower",
  "harvest-ready",
] as const;
export type CanonicalStage = (typeof CANONICAL_STAGES)[number];

// Neutral pod environment — matches DEFAULT_CLIMATE on the live chamber page, so
// no environmental phenotype modifiers fire (cool/UV/stress/drought all 0) and
// each still shows the strain's pure genetic identity.
export const ENVIRONMENT_DEFAULTS = {
  fan: 45,
  temp: 24,
  humidity: 50,
  co2: 800,
  light: 600,
  water: 50,
} as const;

const VEG_END = 44; // seed 3 + germ 5 + seedling 10 + veg 26 (mirrors morphology.ts)

/**
 * Canonical "grow day" for a stage on a strain's timeline. Pre-flower stages are
 * fixed (no buds); flowering stages are placed as a fraction of the strain's own
 * flowering window so the bud reveal lands squarely in each target stage
 * regardless of flowering length. Returns the day used by stageForDay/previewDev.
 */
export function canonicalDay(stage: CanonicalStage, floweringTime: number): number {
  switch (stage) {
    case "seedling":
      return 12; // within seedling [8,18): tiny plant, no buds
    case "vegetative":
      return 35; // within veg [18,44): leaf architecture, no buds
    case "early-flower":
      return VEG_END + 0.18 * floweringTime; // small flower sites
    case "late-flower":
      return VEG_END + 0.78 * floweringTime; // major flower masses
    case "harvest-ready":
      return VEG_END + floweringTime + 1; // harvest stage: max expression
  }
}

/** The full GrowChamber prop bundle for one canonical still. */
export interface ResolvedChamberProps {
  seed: number;
  day: number;
  stage: GrowthStage;
  morphology: Morphology;
  silhouette: Silhouette;
  dev: DevParams;
  climate: ClimateInput;
  conditionFlags: ConditionFlag[];
  budColor: BudColor;
  budDna: BudDNA;
}

/**
 * Resolve every GrowChamber prop for a (strain, stage) cell of the export matrix.
 * Pure + deterministic: same inputs → byte-identical bundle. This is the seam a
 * future ResolvedPhenotype would replace.
 */
export function resolveChamberProps(strain: LaunchStrain, stage: CanonicalStage): ResolvedChamberProps {
  const fl = strain.floweringTime;
  const day = canonicalDay(stage, fl);
  const morphology = morphologyFor(strain.indicaRatio);
  const silhouette = silhouetteFor(strain.slug, strain.indicaRatio);
  const budColor = budColorForStrain(strain.slug, morphology.hue, seedForPlant(strain.slug));
  const budDna = applyEnvironmentToBudDNA(budDnaFor(strain.slug, budColor), {
    temp: ENVIRONMENT_DEFAULTS.temp,
    light: ENVIRONMENT_DEFAULTS.light,
    humidity: ENVIRONMENT_DEFAULTS.humidity,
    water: ENVIRONMENT_DEFAULTS.water,
  });
  return {
    seed: seedForPlant(strain.slug),
    day,
    stage: stageForDay(day, fl),
    morphology,
    silhouette,
    dev: previewDev(day, fl),
    climate: {
      fan: ENVIRONMENT_DEFAULTS.fan,
      temp: ENVIRONMENT_DEFAULTS.temp,
      hum: ENVIRONMENT_DEFAULTS.humidity,
      co2: ENVIRONMENT_DEFAULTS.co2,
    },
    conditionFlags: [],
    budColor,
    budDna,
  };
}

/** Canonical output filename for a cell, e.g. "g13-seedling.png". */
export function pngFilename(strainSlug: string, stage: CanonicalStage): string {
  return `${strainSlug}-${stage}.png`;
}

/** The full 35-cell export matrix (strain × stage), in stable order. */
export function exportMatrix(): Array<{ strain: LaunchStrain; stage: CanonicalStage }> {
  const cells: Array<{ strain: LaunchStrain; stage: CanonicalStage }> = [];
  for (const strain of LAUNCH_STRAINS) {
    for (const stage of CANONICAL_STAGES) cells.push({ strain, stage });
  }
  return cells;
}
