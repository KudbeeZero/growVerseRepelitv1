import { describe, it, expect } from "vitest";
import { silhouetteFor, budColorForStrain } from "../strainVisuals";

describe("silhouetteFor", () => {
  it("returns the authored silhouette for curated strains (by slug or name)", () => {
    const g13 = silhouetteFor("g13", 0.5);
    const byName = silhouetteFor("G13", 0.5);
    expect(g13).toEqual(byName); // name is slugified to the same key
    // G13 is a slim spear: tighter vertical stacking, short top, modest skirt.
    expect(g13.vertStack).toBeGreaterThan(1);
    expect(g13.upperShorten).toBeGreaterThan(0.4);

    // PDP is short + wide + chunky: heavy lateral spread and a fat top.
    const pdp = silhouetteFor("purple-diddy-punch", 0.5);
    expect(pdp.lowerSpread).toBeGreaterThan(g13.lowerSpread);
    expect(pdp.colaScale).toBeGreaterThan(g13.colaScale);
    expect(pdp.branchletFrac).toBeGreaterThan(g13.branchletFrac);

    // Animal Mints is the densest canopy of the three.
    const am = silhouetteFor("animal-mints", 0.5);
    expect(am.nodeDensity).toBeGreaterThan(pdp.nodeDensity);
  });

  it("derives a silhouette from indica dominance for unknown strains", () => {
    const sativa = silhouetteFor("some-unknown-haze", 0);
    const indica = silhouetteFor("some-unknown-kush", 1);
    // Indica trends bushier/wider/denser than sativa.
    expect(indica.nodeDensity).toBeGreaterThan(sativa.nodeDensity);
    expect(indica.lowerSpread).toBeGreaterThan(sativa.lowerSpread);
    expect(indica.colaScale).toBeGreaterThan(sativa.colaScale);
  });

  it("clamps out-of-range ratios and is deterministic", () => {
    expect(silhouetteFor(undefined, -1)).toEqual(silhouetteFor(undefined, 0));
    expect(silhouetteFor(undefined, 2)).toEqual(silhouetteFor(undefined, 1));
    expect(silhouetteFor(undefined, 0.42)).toEqual(silhouetteFor(undefined, 0.42));
  });
});

describe("budColorForStrain (regression — unchanged by silhouette work)", () => {
  it("returns the authored purple for Purple Diddy Punch", () => {
    const c = budColorForStrain("purple-diddy-punch", 110, 1);
    expect(c.anthocyanin).toBeGreaterThan(0.5);
    expect(c.calyxHue).toBeGreaterThan(255);
  });
});

describe("Launch Strain Integration Pack (PR #32) — authored visuals + identity", () => {
  const LAUNCH = ["white-rhino", "white-fire-og", "gelato", "wedding-cake"] as const;

  it("gives each launch strain an authored silhouette (not the indica-derived default)", () => {
    // Use a mid ratio so the derived fallback is well-defined; authored must differ.
    for (const slug of LAUNCH) {
      expect(silhouetteFor(slug, 0.6), `${slug} silhouette authored`).not.toEqual(silhouetteFor(undefined, 0.6));
    }
  });

  it("frosty-WHITE strains carry no anthocyanin (frost, not purple)", () => {
    // The 'white' is trichome frost — driven by budDna, kept out of the calyx hue.
    expect(budColorForStrain("white-rhino", 110, 1).anthocyanin).toBe(0);
    expect(budColorForStrain("white-fire-og", 110, 1).anthocyanin).toBe(0);
  });

  it("purple-dessert strains carry high anthocyanin + a purple accent", () => {
    const gelato = budColorForStrain("gelato", 110, 1);
    expect(gelato.anthocyanin).toBeGreaterThan(0.5);
    expect(gelato.accentHue).toBeGreaterThan(255);

    const weddingCake = budColorForStrain("wedding-cake", 110, 1);
    expect(weddingCake.anthocyanin).toBeGreaterThan(0.4);
    expect(weddingCake.accentHue).toBeGreaterThan(255);
  });
});
