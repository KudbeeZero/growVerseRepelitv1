import { describe, it, expect } from "vitest";
import { buildGeneticsView, qualLevel } from "../strainGenetics";
import type { Strain } from "@/lib/types";

const baseStrain: Strain = {
  id: "s1",
  name: "Test Kush",
  slug: "test-kush",
  lineage_type: "hybrid",
  rarity: "rare",
  indica_ratio: 0.7,
  thc_range: [18, 24],
  cbd_range: [0.5, 1.5],
  flowering_days: [56, 63],
  yield_range: [400, 500],
  difficulty: 3,
  terpenes: ["myrcene", "limonene"],
  stability: 0.82,
  generation: 1,
  parent_a_id: null,
  parent_b_id: null,
  is_base_catalog: true,
  genome: null,
  nft_asset_id: null,
  nft_status: "none",
};

describe("qualLevel", () => {
  it("maps qualitative descriptors to a 0..1 strength, strongest keyword wins", () => {
    expect(qualLevel("trace").level).toBeLessThan(qualLevel("low").level);
    expect(qualLevel("low").level).toBeLessThan(qualLevel("moderate").level);
    expect(qualLevel("moderate").level).toBeLessThan(qualLevel("elevated").level);
    expect(qualLevel("elevated").level).toBeLessThan(qualLevel("very high").level);
    // "low-moderate" should resolve to the stronger (moderate) end.
    expect(qualLevel("low-moderate").level).toBe(qualLevel("moderate").level);
  });
  it("falls back to a middling level for unknown text", () => {
    const u = qualLevel("?");
    expect(u.level).toBeGreaterThan(0);
    expect(u.level).toBeLessThan(1);
    expect(u.text).toBe("?");
  });
});

describe("buildGeneticsView", () => {
  it("derives genotype split from indica_ratio", () => {
    const v = buildGeneticsView(baseStrain);
    expect(v.genotype.indicaPct).toBe(70);
    expect(v.genotype.sativaPct).toBe(30);
    expect(v.genotype.label).toBe("Indica-dominant");
  });

  it("labels balanced and sativa-dominant correctly", () => {
    expect(buildGeneticsView({ ...baseStrain, indica_ratio: 0.5 }).genotype.label).toBe("Balanced hybrid");
    expect(buildGeneticsView({ ...baseStrain, indica_ratio: 0.2 }).genotype.label).toBe("Sativa-dominant");
  });

  it("uses the strain's THC/CBD ranges for the cannabinoid bars (no invented fields)", () => {
    const v = buildGeneticsView(baseStrain);
    expect(v.cannabinoids[0]).toMatchObject({ label: "THC", range: [18, 24] });
    expect(v.cannabinoids[1]).toMatchObject({ label: "CBD", range: [0.5, 1.5] });
  });

  it("omits CBG/THCV when there is no knowledge entry, includes them when present", () => {
    expect(buildGeneticsView(baseStrain).minorCannabinoids).toHaveLength(0);
    const v = buildGeneticsView(baseStrain, {
      cannabinoids: { cbg: "elevated", thcv: "trace" },
      effects: ["relaxed", "happy"],
      flavor: ["earthy"],
      aroma: ["pine"],
      grow: { environment: ["indoor", "greenhouse"] },
    });
    expect(v.minorCannabinoids.map((m) => m.label)).toEqual(["CBG", "THCV"]);
    expect(v.effects).toEqual(["relaxed", "happy"]);
    expect(v.environment).toEqual(["indoor", "greenhouse"]);
  });

  it("clamps the difficulty badge to 1..5 and maps a colour-ready label", () => {
    expect(buildGeneticsView({ ...baseStrain, difficulty: 99 }).difficultyBadge).toBe(5);
    expect(buildGeneticsView({ ...baseStrain, difficulty: 0 }).difficultyBadge).toBe(1);
    expect(buildGeneticsView(baseStrain).difficulty.label).toBe("Hard");
    expect(buildGeneticsView({ ...baseStrain, difficulty: 2 }).difficulty.label).toBe("Moderate");
  });

  it("prefers strain.terpenes but falls back to knowledge terpene keys", () => {
    expect(buildGeneticsView(baseStrain).terpenes).toEqual(["myrcene", "limonene"]);
    const v = buildGeneticsView(
      { ...baseStrain, terpenes: null },
      { terpenes: { caryophyllene: "peppery", linalool: "floral" } },
    );
    expect(v.terpenes).toEqual(["caryophyllene", "linalool"]);
  });
});
