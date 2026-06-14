"use client";

// PlantPreview — the single reusable entry point onto the CANONICAL whole-plant
// renderer (GrowChamber → chamberCore, the "Engines 1–4" visual source).
//
// Everywhere a plant or strain should show its real plant — grow dashboard plant
// cards, the plant detail page, strain catalog cards, strain preview heroes —
// renders THIS instead of the old PlantVisual SVG cartoon. It does not fork or
// reimplement any renderer logic: it only wires the canonical GrowChamber with
// props assembled by the shared builders in lib/chamber/props.
//
// Two flavours:
//   <PlantPreview plant strain env />   live plant (authoritative stage/age)
//   <PlantPreview strain />             strain identity preview (mature flower)

import type { ConditionFlag, GrowthStage, Plant, Strain } from "@/lib/types";
import { GrowChamber, type ChamberView } from "@/components/viz/GrowChamber";
import {
  chamberPropsForPlant,
  chamberPropsForStrain,
} from "@/lib/chamber/props";

type StrainLike = Pick<
  Strain,
  "id" | "slug" | "name" | "indica_ratio" | "flowering_days"
>;
type PlantLike = Pick<
  Plant,
  "id" | "strain_id" | "growth_stage" | "planted_at" | "condition_flags" | "water_level"
>;

interface CommonProps {
  view?: ChamberView;
  className?: string;
}

interface StrainPreviewProps extends CommonProps {
  strain: StrainLike;
  plant?: undefined;
}

interface PlantPreviewProps extends CommonProps {
  plant: PlantLike;
  strain: StrainLike | undefined;
  env?: { temperature?: number | null; humidity?: number | null; light_intensity?: number | null };
}

type Props = StrainPreviewProps | PlantPreviewProps;

const CHAMBER_CLIMATE = { fan: 45, temp: 24, hum: 50, co2: 900 } as const;

export function PlantPreview(props: Props) {
  const view: ChamberView = props.view ?? "chamber";
  const className = props.className ?? "";

  const cp =
    "plant" in props && props.plant
      ? chamberPropsForPlant(props.plant, props.strain, props.env)
      : chamberPropsForStrain((props as StrainPreviewProps).strain);

  return (
    <GrowChamber
      seed={cp.seed}
      day={cp.day}
      stage={cp.stage as GrowthStage}
      morphology={cp.morphology}
      silhouette={cp.silhouette}
      dev={cp.dev}
      budColor={cp.budColor}
      budDna={cp.budDna}
      climate={CHAMBER_CLIMATE}
      conditionFlags={cp.conditionFlags as ConditionFlag[]}
      view={view}
      className={className}
    />
  );
}
