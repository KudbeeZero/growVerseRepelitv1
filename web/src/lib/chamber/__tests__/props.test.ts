import { describe, it, expect } from "vitest";
import {
  chamberPropsForStrain,
  chamberPropsForPlant,
  chamberPropsForPreviewDay,
} from "../props";
import type { Plant, Strain } from "@/lib/types";

const strain: Pick<Strain, "id" | "slug" | "name" | "indica_ratio" | "flowering_days"> = {
  id: "strain-1",
  slug: "g13",
  name: "G13",
  indica_ratio: 0.7,
  flowering_days: [56, 63],
};

describe("chamberPropsForStrain", () => {
  it("builds canonical flowering-preview props deterministically", () => {
    const a = chamberPropsForStrain(strain);
    const b = chamberPropsForStrain(strain);
    expect(a).toEqual(b);
    expect(a.stage).toBe("flowering");
    expect(a.day).toBe(62);
    // Authored G13 silhouette flows through (slim spear → high vertStack).
    expect(a.silhouette.vertStack).toBeGreaterThan(1);
  });
});

describe("chamberPropsForPlant", () => {
  const plant: Pick<
    Plant,
    "id" | "strain_id" | "growth_stage" | "planted_at" | "condition_flags" | "water_level"
  > = {
    id: "plant-1",
    strain_id: "strain-1",
    growth_stage: "vegetative",
    planted_at: null,
    condition_flags: [],
    water_level: 80,
  };

  it("respects the authoritative growth stage (no buds before flowering)", () => {
    const p = chamberPropsForPlant(plant, strain);
    expect(p.stage).toBe("vegetative");
    expect(p.dev.budDev).toBe(0); // effectiveDev gates buds to flowering/harvest
  });

  it("shows bud development once the server stage is flowering", () => {
    const p = chamberPropsForPlant(
      { ...plant, growth_stage: "flowering", planted_at: new Date(Date.now() - 60 * 86_400_000).toISOString() },
      strain,
    );
    expect(p.stage).toBe("flowering");
    expect(p.dev.budDev).toBeGreaterThan(0);
  });

  it("falls back to a balanced morphology when the strain is unknown", () => {
    const p = chamberPropsForPlant(plant, undefined);
    expect(p.stage).toBe("vegetative");
    expect(p.morphology).toBeDefined();
  });
});

describe("chamberPropsForPreviewDay", () => {
  it("maps an arbitrary day to the right stage with no pre-flower buds", () => {
    const veg = chamberPropsForPreviewDay(strain, 30);
    expect(veg.stage).toBe("vegetative");
    expect(veg.dev.budDev).toBe(0);
    const fl = chamberPropsForPreviewDay(strain, 70);
    expect(fl.stage).toBe("flowering");
    expect(fl.dev.budDev).toBeGreaterThan(0);
  });
});
