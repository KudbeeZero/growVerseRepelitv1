import { describe, it, expect } from "vitest";
import { resolvePhenotype, type PhenotypeInput, type ResolvedPhenotype } from "../phenotype";

// A green-ish, non-authored strain so the env helper drives purple, not a preset.
const baseInput = (over: Partial<PhenotypeInput> = {}): PhenotypeInput => ({
  strainDNA: { indicaRatio: 0.5, slug: "test-green-strain", rarity: "common" },
  plantDNA: { seed: 12345, ageDays: 55, health: 100 },
  environment: { temp: 24, light: 500, humidity: 52, water: 80 },
  growthStage: "flowering",
  stressState: { stress: 0, conditionFlags: [] },
  seed: 12345,
  ...over,
});

/** Every numeric leaf of a ResolvedPhenotype, for finite/range assertions. */
function numericFields(p: ResolvedPhenotype): number[] {
  return [
    p.leafColor.hue, p.leafColor.sat, p.leafColor.lit,
    p.stemColor.hue, p.stemColor.sat, p.stemColor.lit,
    p.pistilColor.hue, p.pistilColor.sat, p.pistilColor.lit,
    p.trichomeDensity, p.purpleExpression, p.frostIntensity,
    p.leafCurl, p.leafDroop, p.branchDroop, p.budMass,
    p.stressTint.intensity, p.stressTint.hue,
  ];
}

describe("resolvePhenotype — determinism", () => {
  it("returns a deeply-equal phenotype for the same input", () => {
    const a = resolvePhenotype(baseInput());
    const b = resolvePhenotype(baseInput());
    expect(a).toEqual(b);
  });

  it("is stable across many calls for the unit fields", () => {
    const first = resolvePhenotype(baseInput());
    for (let i = 0; i < 5; i++) {
      expect(resolvePhenotype(baseInput())).toEqual(first);
    }
  });
});

describe("resolvePhenotype — environment response", () => {
  it("cool nights increase purpleExpression", () => {
    const warm = resolvePhenotype(baseInput({ environment: { temp: 28, light: 500, humidity: 52, water: 80 } }));
    const cool = resolvePhenotype(baseInput({ environment: { temp: 12, light: 500, humidity: 52, water: 80 } }));
    expect(cool.purpleExpression).toBeGreaterThan(warm.purpleExpression);
  });

  it("high UV increases frostIntensity", () => {
    const dim = resolvePhenotype(baseInput({ environment: { temp: 24, light: 300, humidity: 52, water: 80 } }));
    const uv = resolvePhenotype(baseInput({ environment: { temp: 24, light: 950, humidity: 52, water: 80 } }));
    expect(uv.frostIntensity).toBeGreaterThan(dim.frostIntensity);
  });

  it("drought increases leafCurl and stressTint subtly", () => {
    const watered = resolvePhenotype(baseInput({ environment: { temp: 24, light: 500, humidity: 52, water: 90 } }));
    const dry = resolvePhenotype(baseInput({ environment: { temp: 24, light: 500, humidity: 52, water: 10 } }));
    expect(dry.leafCurl).toBeGreaterThan(watered.leafCurl);
    expect(dry.stressTint.intensity).toBeGreaterThan(watered.stressTint.intensity);
    // "subtly" — the wash never overpowers the base look.
    expect(dry.stressTint.intensity).toBeLessThanOrEqual(0.6);
  });
});

describe("resolvePhenotype — stage progression", () => {
  it("increases budMass as the plant develops", () => {
    const seedling = resolvePhenotype(baseInput({ growthStage: "seedling", plantDNA: { seed: 1, ageDays: 8 } }));
    const earlyFlower = resolvePhenotype(baseInput({ growthStage: "flowering", plantDNA: { seed: 1, ageDays: 40 } }));
    const lateFlower = resolvePhenotype(baseInput({ growthStage: "flowering", plantDNA: { seed: 1, ageDays: 64 } }));
    expect(seedling.budMass).toBe(0); // stage-gated: no buds before flowering
    expect(earlyFlower.budMass).toBeGreaterThan(0);
    expect(lateFlower.budMass).toBeGreaterThan(earlyFlower.budMass);
  });

  it("gates buds (and frost) to flowering/harvest", () => {
    const veg = resolvePhenotype(baseInput({ growthStage: "vegetative", plantDNA: { seed: 2, ageDays: 999 } }));
    expect(veg.budMass).toBe(0);
    expect(veg.frostIntensity).toBe(0);
  });
});

describe("resolvePhenotype — safe fallbacks", () => {
  it("resolves an unknown strain with sparse input without throwing", () => {
    const p = resolvePhenotype({ strainDNA: { indicaRatio: 0.3 }, growthStage: "flowering" });
    expect(p).toBeTruthy();
    expect(Array.isArray(p.budPalette)).toBe(true);
    expect(p.budPalette.length).toBeGreaterThan(0);
    expect(Array.isArray(p.mutationTraits)).toBe(true);
    expect(Array.isArray(p.rarityTraits)).toBe(true);
  });

  it("keeps every numeric field finite and in range", () => {
    const p = resolvePhenotype(baseInput({ environment: { temp: 5, light: 1000, humidity: 95, water: 0 }, stressState: { stress: 100 } }));
    for (const v of numericFields(p)) {
      expect(Number.isFinite(v)).toBe(true);
    }
    for (const key of ["trichomeDensity", "purpleExpression", "frostIntensity", "leafCurl", "leafDroop", "branchDroop", "budMass"] as const) {
      expect(p[key]).toBeGreaterThanOrEqual(0);
      expect(p[key]).toBeLessThanOrEqual(1);
    }
    expect(p.stressTint.intensity).toBeGreaterThanOrEqual(0);
    expect(p.stressTint.intensity).toBeLessThanOrEqual(0.6);
  });

  it("emits cosmetic rarityTraits for top tiers only", () => {
    const legendary = resolvePhenotype(baseInput({ strainDNA: { indicaRatio: 0.5, slug: "x", rarity: "legendary" } }));
    const common = resolvePhenotype(baseInput({ strainDNA: { indicaRatio: 0.5, slug: "x", rarity: "common" } }));
    expect(legendary.rarityTraits.length).toBe(1);
    expect(common.rarityTraits.length).toBe(0);
  });
});
