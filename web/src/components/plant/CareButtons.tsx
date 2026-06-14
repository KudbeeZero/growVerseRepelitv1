"use client";

import { Button } from "@/components/ui/Button";
import { useCareActions } from "@/hooks/useCareActions";
import type { PlantState } from "@/lib/types";

export function CareButtons({ plant }: { plant: PlantState }) {
  const { care, harvest } = useCareActions(plant.id);
  const disabled = !plant.is_alive || plant.harvested;
  const canHarvest = plant.growth_stage === "harvest" && !plant.harvested && plant.is_alive;
  const pending = care.isPending ? care.variables : null;

  // Comfortable thumb-zone tap target (≥44px) on phones — these are the most-
  // used actions in the game and previously rendered at ~26px.
  const tap = "min-h-[44px] px-3.5 text-sm";

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="secondary"
        className={tap}
        disabled={disabled}
        loading={pending === "water"}
        onClick={() => care.mutate("water")}
      >
        💧 Water
      </Button>
      <Button
        size="sm"
        variant="secondary"
        className={tap}
        disabled={disabled}
        loading={pending === "feed"}
        onClick={() => care.mutate("feed")}
      >
        🧪 Feed
      </Button>
      <Button
        size="sm"
        variant="secondary"
        className={tap}
        disabled={disabled || plant.pest_level <= 0}
        loading={pending === "treatPests"}
        onClick={() => care.mutate("treatPests")}
      >
        🐞 Treat Pests
      </Button>
      <Button
        size="sm"
        variant="secondary"
        className={tap}
        disabled={disabled || plant.disease_level <= 0}
        loading={pending === "treatDisease"}
        onClick={() => care.mutate("treatDisease")}
      >
        🧫 Treat Disease
      </Button>
      {canHarvest && (
        <Button
          size="sm"
          variant="primary"
          className={tap}
          loading={harvest.isPending}
          onClick={() => harvest.mutate({ sell: true })}
        >
          ✂️ Harvest & Sell
        </Button>
      )}
    </div>
  );
}
