import { describe, it, expect } from "vitest";
import { resolveFtueStep, FTUE_TOTAL, type FtueInput } from "@/lib/ftue";
import type { Pod, Seed, Plant, Harvest } from "@/lib/types";

function pod(over: Partial<Pod> = {}): Pod {
  return {
    id: "pod-1",
    player_id: "p1",
    name: "Pod",
    capacity: 4,
    tier: "basic",
    active: true,
    auto_water: false,
    auto_feed: false,
    temperature: null,
    humidity: null,
    co2_level: null,
    light_intensity: null,
    ph_level: null,
    ...over,
  };
}

function seed(over: Partial<Seed> = {}): Seed {
  return {
    id: "seed-1",
    strain_id: "s1",
    quantity: 1,
    source: "starter",
    feminized: true,
    ...over,
  };
}

function plant(over: Partial<Plant> = {}): Plant {
  return {
    id: "plant-1",
    player_id: "p1",
    pod_id: "pod-1",
    strain_id: "s1",
    growth_stage: "vegetative",
    planted_at: "2026-06-14T00:00:00Z",
    height: 10,
    health: 90,
    water_level: 80,
    nutrient_level: 80,
    pest_level: 0,
    disease_level: 0,
    condition_flags: [],
    is_alive: true,
    harvested: false,
    ...over,
  };
}

function harvest(over: Partial<Harvest> = {}): Harvest {
  return { id: "h1", ...(over as Harvest) } as Harvest;
}

const EMPTY: FtueInput = { pods: [], seeds: [], plants: [], harvests: [] };

describe("resolveFtueStep", () => {
  it("starts at create-pod for a fresh, pod-less player", () => {
    expect(resolveFtueStep(EMPTY)?.id).toBe("create-pod");
  });

  it("asks for a seed when a pod exists but inventory is empty", () => {
    expect(resolveFtueStep({ ...EMPTY, pods: [pod()] })?.id).toBe("get-seed");
  });

  it("treats a zero-quantity seed as no seed", () => {
    const step = resolveFtueStep({ ...EMPTY, pods: [pod()], seeds: [seed({ quantity: 0 })] });
    expect(step?.id).toBe("get-seed");
  });

  it("prompts to plant once a pod and a usable seed are present", () => {
    const step = resolveFtueStep({ ...EMPTY, pods: [pod()], seeds: [seed()] });
    expect(step?.id).toBe("plant-seed");
  });

  it("prompts to set the climate when the live plant's pod has no temperature", () => {
    const step = resolveFtueStep({
      ...EMPTY,
      pods: [pod({ temperature: null })],
      plants: [plant()],
    });
    expect(step?.id).toBe("set-climate");
  });

  it("moves to grow-watch once the climate is dialled in", () => {
    const step = resolveFtueStep({
      ...EMPTY,
      pods: [pod({ temperature: 24 })],
      plants: [plant()],
    });
    expect(step?.id).toBe("grow-watch");
    expect(step?.cta.href).toBe("/dashboard/plants/plant-1");
  });

  it("prompts to harvest a ripe plant, deep-linking to it", () => {
    const step = resolveFtueStep({
      ...EMPTY,
      pods: [pod({ temperature: 24 })],
      plants: [plant({ id: "ripe-7", growth_stage: "harvest" })],
    });
    expect(step?.id).toBe("harvest");
    expect(step?.cta.href).toBe("/dashboard/plants/ripe-7");
  });

  it("celebrates and points to the lab after the first harvest", () => {
    const step = resolveFtueStep({
      ...EMPTY,
      pods: [pod({ temperature: 24 })],
      plants: [plant({ harvested: true, is_alive: false })],
      harvests: [harvest()],
    });
    expect(step?.id).toBe("next-strain");
    expect(step?.celebrate).toBe(true);
    expect(step?.cta.href).toBe("/lab");
  });

  it("graduates (returns null) once the grower has harvested and replanted", () => {
    const step = resolveFtueStep({
      ...EMPTY,
      pods: [pod({ temperature: 24 })],
      plants: [plant({ id: "old", harvested: true, is_alive: false }), plant({ id: "new" })],
      harvests: [harvest()],
    });
    expect(step).toBeNull();
  });

  it("keeps every step within the advertised progress range", () => {
    const inputs: FtueInput[] = [
      EMPTY,
      { ...EMPTY, pods: [pod()] },
      { ...EMPTY, pods: [pod()], seeds: [seed()] },
      { ...EMPTY, pods: [pod()], plants: [plant()] },
      { ...EMPTY, pods: [pod({ temperature: 24 })], plants: [plant()] },
      {
        ...EMPTY,
        pods: [pod({ temperature: 24 })],
        plants: [plant({ growth_stage: "harvest" })],
      },
      {
        ...EMPTY,
        plants: [plant({ harvested: true, is_alive: false })],
        harvests: [harvest()],
      },
    ];
    for (const input of inputs) {
      const step = resolveFtueStep(input);
      expect(step).not.toBeNull();
      expect(step!.step).toBeGreaterThanOrEqual(1);
      expect(step!.step).toBeLessThanOrEqual(FTUE_TOTAL);
    }
  });
});
