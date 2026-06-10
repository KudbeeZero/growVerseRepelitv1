"use client";

import { useEffect, useRef } from "react";
import type { ConditionFlag, ConditionKind, GrowthStage } from "@/lib/types";
import { dominantFlag } from "@/lib/conditionVisuals";
import {
  createPlantRenderer,
  type PlantRenderProps,
  type RenderStage,
  type Symptom,
} from "./plantRenderer";

const SYMPTOM_FOR: Record<ConditionKind, Symptom> = {
  healthy: "none",
  overwatered: "overwater",
  root_rot: "rot",
  underwatered: "underwater",
  wilting: "wilt",
  nutrient_deficient: "nDef",
  nutrient_burn: "nuteBurn",
  pest_infestation: "pests",
  mildew: "mildew",
  dead: "dead",
};

function toRenderStage(stage: GrowthStage): RenderStage {
  return stage;
}

/**
 * Live procedural render of a plant — pod-particle buds at every node, swaying,
 * ripening with the grow day, deforming with stress. Replaces the static SVG.
 *
 * Props are funnelled through a ref so the rAF loop always reads fresh values
 * without tearing down the renderer (geometry rebuilds itself when inputs
 * change). The canvas fills its square container; size the wrapper, not this.
 */
export function PlantCanvas({
  stage,
  health,
  flags,
  indicaRatio = 0.5,
  plantedAt = null,
  alive = true,
  seed,
  size = 140,
  mode = "card",
}: {
  stage: GrowthStage;
  health: number;
  flags: ConditionFlag[];
  indicaRatio?: number;
  plantedAt?: string | null;
  alive?: boolean;
  seed: string;
  size?: number;
  mode?: "card" | "chamber";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef<PlantRenderProps>(null as unknown as PlantRenderProps);

  const dom = dominantFlag(flags);
  const symptom: Symptom = !alive ? "dead" : SYMPTOM_FOR[dom.condition] ?? "none";

  propsRef.current = {
    stage: toRenderStage(stage),
    health: Math.max(0, Math.min(100, health)),
    indicaRatio: Math.max(0, Math.min(1, indicaRatio)),
    plantedAt,
    symptom,
    alive,
    seed,
    mode,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createPlantRenderer(canvas, () => propsRef.current);
    return () => renderer.destroy();
    // The renderer reads everything via propsRef each frame, so it only needs to
    // be created once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ width: size, height: size * 1.2 }} className="relative">
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ touchAction: mode === "chamber" ? "none" : "auto" }}
        role="img"
        aria-label={`${stage} plant`}
      />
    </div>
  );
}
