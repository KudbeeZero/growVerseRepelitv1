import { describe, it, expect } from "vitest";
import {
  LAUNCH_STRAINS,
  CANONICAL_STAGES,
  resolveChamberProps,
  exportMatrix,
  canonicalDay,
  pngFilename,
  type CanonicalStage,
} from "../canonicalStages";
import { silhouetteFor } from "../strainVisuals";
import { stageForDay } from "../morphology";

describe("canonical export matrix", () => {
  it("defines all 7 launch strains with unique slugs", () => {
    expect(LAUNCH_STRAINS).toHaveLength(7);
    const slugs = LAUNCH_STRAINS.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(7);
    expect(slugs).toEqual([
      "g13", "purple-diddy-punch", "animal-mints",
      "white-rhino", "white-fire-og", "gelato", "wedding-cake",
    ]);
  });

  it("yields a complete 7×5 = 35-cell matrix", () => {
    const cells = exportMatrix();
    expect(cells).toHaveLength(35);
    expect(new Set(cells.map((c) => pngFilename(c.strain.slug, c.stage))).size).toBe(35);
  });

  it("places each canonical stage squarely in its target growth stage", () => {
    const expected: Record<CanonicalStage, string> = {
      seedling: "seedling",
      vegetative: "vegetative",
      "early-flower": "flowering",
      "late-flower": "flowering",
      "harvest-ready": "harvest",
    };
    for (const strain of LAUNCH_STRAINS) {
      for (const stage of CANONICAL_STAGES) {
        const day = canonicalDay(stage, strain.floweringTime);
        expect(stageForDay(day, strain.floweringTime), `${strain.slug}/${stage}`).toBe(expected[stage]);
        // resolveChamberProps must agree with stageForDay.
        expect(resolveChamberProps(strain, stage).stage).toBe(expected[stage]);
      }
    }
  });

  it("advances bud development monotonically across the 5 stages", () => {
    for (const strain of LAUNCH_STRAINS) {
      const devs = CANONICAL_STAGES.map((s) => resolveChamberProps(strain, s).dev.budDev);
      for (let i = 1; i < devs.length; i++) {
        expect(devs[i], `${strain.slug} stage ${i}`).toBeGreaterThanOrEqual(devs[i - 1]);
      }
      // Pre-flower stages show no buds; harvest-ready is near-maximal.
      expect(devs[0]).toBe(0); // seedling
      expect(devs[1]).toBe(0); // vegetative
      expect(devs[4]).toBeGreaterThan(0.9); // harvest-ready
    }
  });

  it("is pure/deterministic — same inputs produce an identical bundle", () => {
    for (const strain of LAUNCH_STRAINS) {
      for (const stage of CANONICAL_STAGES) {
        expect(resolveChamberProps(strain, stage)).toEqual(resolveChamberProps(strain, stage));
      }
    }
  });
});

describe("authored visual presets (every launch strain is curated, not derived)", () => {
  it("gives each strain an authored silhouette distinct from the indica-derived default", () => {
    for (const strain of LAUNCH_STRAINS) {
      const authored = silhouetteFor(strain.slug, strain.indicaRatio);
      const derived = silhouetteFor(undefined, strain.indicaRatio);
      expect(authored, `${strain.slug} should be authored`).not.toEqual(derived);
    }
  });

  it("hits the strain-identity targets from the brief", () => {
    const dnaOf = (slug: string) => {
      const strain = LAUNCH_STRAINS.find((s) => s.slug === slug)!;
      return resolveChamberProps(strain, "harvest-ready").budDna;
    };
    const colorOf = (slug: string) => {
      const strain = LAUNCH_STRAINS.find((s) => s.slug === slug)!;
      return resolveChamberProps(strain, "harvest-ready").budColor;
    };

    // White Rhino — heavy indica: the widest, chunkiest cola of all 7.
    const widths = LAUNCH_STRAINS.map((s) => dnaOf(s.slug).maxBudWidth);
    expect(dnaOf("white-rhino").maxBudWidth).toBe(Math.max(...widths));

    // White Fire OG — bright frosty: the highest trichome density of all 7.
    const frost = LAUNCH_STRAINS.map((s) => dnaOf(s.slug).trichomeDensity);
    expect(dnaOf("white-fire-og").trichomeDensity).toBe(Math.max(...frost));

    // G13 — green identity (no anthocyanin, green-band hue).
    expect(colorOf("g13").anthocyanin).toBe(0);
    expect(colorOf("g13").calyxHue).toBeLessThan(150);

    // Purple Diddy Punch — chunky purple.
    expect(colorOf("purple-diddy-punch").anthocyanin).toBeGreaterThan(0.5);
    expect(colorOf("purple-diddy-punch").calyxHue).toBeGreaterThan(255);

    // Gelato — purple-dessert: high anthocyanin + a purple accent on a green base.
    const gelato = colorOf("gelato");
    expect(gelato.accentHue).toBeGreaterThan(255);
    expect(gelato.calyxHue).toBeLessThan(150);
    expect(gelato.anthocyanin).toBeGreaterThan(0.5);

    // Wedding Cake — creamy purple dessert: high anthocyanin + purple accent.
    const weddingCake = colorOf("wedding-cake");
    expect(weddingCake.anthocyanin).toBeGreaterThan(0.4);
    expect(weddingCake.accentHue).toBeGreaterThan(255);

    // White Rhino & White Fire OG — frosty WHITE: low anthocyanin (frost, not purple).
    expect(colorOf("white-rhino").anthocyanin).toBe(0);
    expect(colorOf("white-fire-og").anthocyanin).toBe(0);
  });
});
