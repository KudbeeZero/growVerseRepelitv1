// Shared builder for the canonical whole-plant renderer's props.
//
// The Grow Chamber screen (dashboard/plants/[plantId]/chamber) and the Strain
// Lab hero each previously hand-assembled the GrowChamber prop bundle from a
// strain (+ optional live plant) by calling morphologyFor / silhouetteFor /
// budColorForStrain / budDnaFor / dev*. That logic is now centralised here so
// every surface that wants the canonical plant — plant cards, the plant detail
// page, strain cards/preview — routes to the SAME renderer with consistent
// inputs, instead of falling back to the old PlantVisual cartoon. No renderer
// logic is forked: this only assembles inputs for chamberCore via GrowChamber.

import type { ConditionFlag, GrowthStage, Strain, Plant } from "@/lib/types";
import {
  ageDays,
  morphologyFor,
  effectiveDev,
  devParams,
  previewDev,
  stageForDay,
  seedForPlant,
  type DevParams,
  type Morphology,
  type BudColor,
  type Silhouette,
} from "./morphology";
import { budColorForStrain, silhouetteFor } from "./strainVisuals";
import { budDnaFor, applyEnvironmentToBudDNA, type BudDNA } from "./budDna";
import type { ChamberView } from "@/components/viz/GrowChamber";

export interface ChamberProps {
  seed: number;
  day: number;
  stage: GrowthStage;
  morphology: Morphology;
  silhouette: Silhouette;
  dev: DevParams;
  budColor: BudColor;
  budDna: BudDNA;
  conditionFlags: ConditionFlag[];
}

/** Just the genetics-derived visual identity of a strain (no live plant). */
function strainVisualBase(strain: Pick<Strain, "id" | "slug" | "name" | "indica_ratio">) {
  const key = strain.slug ?? strain.name;
  const morphology = morphologyFor(strain.indica_ratio);
  const silhouette = silhouetteFor(key, strain.indica_ratio);
  const budColor = budColorForStrain(key, morphology.hue, seedForPlant(strain.id));
  return { key, morphology, silhouette, budColor };
}

/**
 * Canonical renderer props for a STRAIN preview (catalog cards, strain hero):
 * a representative mature flowering plant grown from the strain's genetics.
 * Deterministic — same strain always previews identically.
 */
export function chamberPropsForStrain(
  strain: Pick<Strain, "id" | "slug" | "name" | "indica_ratio">,
  opts?: { day?: number },
): ChamberProps {
  const { key, morphology, silhouette, budColor } = strainVisualBase(strain);
  const day = opts?.day ?? 62; // a fully-flowered representative day
  return {
    seed: seedForPlant(strain.slug ?? strain.id),
    day,
    stage: "flowering",
    morphology,
    silhouette,
    dev: devParams(day),
    budColor,
    budDna: budDnaFor(key, budColor),
    conditionFlags: [],
  };
}

/**
 * Canonical renderer props for a LIVE plant (plant cards, plant detail).
 * Reads the authoritative growth_stage + planted_at so the rendered plant
 * matches the real server state, and folds the pod's committed environment into
 * the bud phenotype when available. Falls back gracefully if the strain is not
 * yet in the map (the renderer still draws a generic plant for the stage).
 */
export function chamberPropsForPlant(
  plant: Pick<Plant, "id" | "strain_id" | "growth_stage" | "planted_at" | "condition_flags" | "water_level">,
  strain: Pick<Strain, "id" | "slug" | "name" | "indica_ratio" | "flowering_days"> | undefined,
  env?: { temperature?: number | null; humidity?: number | null; light_intensity?: number | null },
): ChamberProps {
  const indicaRatio = strain?.indica_ratio ?? 0.5;
  const key = strain?.slug ?? strain?.name;
  const morphology = morphologyFor(indicaRatio);
  const silhouette = silhouetteFor(key, indicaRatio);
  const budColor = budColorForStrain(key, morphology.hue, seedForPlant(plant.strain_id));
  const baseDna = budDnaFor(key, budColor);
  const budDna = env
    ? applyEnvironmentToBudDNA(baseDna, {
        temp: env.temperature ?? 24,
        light: env.light_intensity ?? 600,
        humidity: env.humidity ?? 50,
        water: plant.water_level,
      })
    : baseDna;
  const liveDay = ageDays(plant.planted_at);
  return {
    seed: seedForPlant(plant.id),
    day: liveDay,
    stage: plant.growth_stage,
    morphology,
    silhouette,
    dev: effectiveDev(plant.growth_stage, liveDay),
    budColor,
    budDna,
    conditionFlags: plant.condition_flags ?? [],
  };
}

/**
 * Preview props for an arbitrary day on a strain's cycle (the chamber's growth
 * scrubber). Pure wrapper around stageForDay/previewDev so the scrubber and
 * card/hero share the same day→features mapping.
 */
export function chamberPropsForPreviewDay(
  strain: Pick<Strain, "id" | "slug" | "name" | "indica_ratio" | "flowering_days">,
  day: number,
): ChamberProps {
  const { key, morphology, silhouette, budColor } = strainVisualBase(strain);
  const flMid = (strain.flowering_days[0] + strain.flowering_days[1]) / 2;
  return {
    seed: seedForPlant(strain.slug ?? strain.id),
    day,
    stage: stageForDay(day, flMid),
    morphology,
    silhouette,
    dev: previewDev(day, flMid),
    budColor,
    budDna: budDnaFor(key, budColor),
    conditionFlags: [],
  };
}

export type { ChamberView };
