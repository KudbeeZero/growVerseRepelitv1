// Authored per-strain bud visuals. Keyed by strain slug (matches the backend
// slug = lowercase, non-alphanumerics → "-"). This is the client-side "card"
// layer: it lets curated strains render in their intended colours (purple
// calyxes, orange vs magenta pistils, green-with-purple accents) instead of the
// deterministic per-strain roll. Unknown strains fall back to budColorFor.
//
// Pistil colour (pistilMagenta) is deliberately independent of anthocyanin so a
// deep-purple bud can still carry classic bright-orange pistils (e.g. PDP,
// Animal Mints) — they are separate genetic expressions.

import { budColorFor, clamp, lerp, type BudColor, type Silhouette } from "./morphology";

/** name → slug, matching backend db/seed.py slugify. */
export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const AUTHORED: Record<string, BudColor> = {
  // EPIC — frosty, resinous green hybrid; bright orange pistils.
  g13: { anthocyanin: 0, calyxHue: 98, calyxSat: 44, pistilMagenta: 0 },
  // RARE — deep purple→violet calyxes, bright orange pistils, heavy frost.
  "purple-diddy-punch": { anthocyanin: 0.95, calyxHue: 282, calyxSat: 60, pistilMagenta: 0 },
  // RARE — deep green base with ~40% purple-accent calyxes, orange pistils.
  "animal-mints": { anthocyanin: 0.3, calyxHue: 104, calyxSat: 46, pistilMagenta: 0, accentHue: 285, accentFrac: 0.4 },
  // Heavy-indica, frosty white-green; classic orange pistils (frost carried by budDna).
  "white-rhino": { anthocyanin: 0, calyxHue: 100, calyxSat: 40, pistilMagenta: 0 },
  // Bright, very frosty green; orange pistils — the "white" expression is all frost.
  "white-fire-og": { anthocyanin: 0, calyxHue: 96, calyxSat: 46, pistilMagenta: 0 },
  // Purple dessert — high anthocyanin, colourful: green base with heavy purple
  // accents and a touch of magenta in the pistils.
  gelato: { anthocyanin: 0.6, calyxHue: 128, calyxSat: 56, pistilMagenta: 0.2, accentHue: 292, accentFrac: 0.5 },
  // Creamy purple dessert — high anthocyanin, frosty; strong purple accents.
  "wedding-cake": { anthocyanin: 0.5, calyxHue: 122, calyxSat: 50, pistilMagenta: 0.1, accentHue: 288, accentFrac: 0.42 },
};

/**
 * Authored bud colour for a strain, falling back to the deterministic per-strain
 * roll for anything not in the curated set.
 */
export function budColorForStrain(
  slugOrName: string | undefined,
  baseGreenHue: number,
  fallbackSeed: number,
): BudColor {
  if (slugOrName) {
    const key = AUTHORED[slugOrName] ? slugOrName : slugify(slugOrName);
    if (AUTHORED[key]) return AUTHORED[key];
  }
  return budColorFor(fallbackSeed, baseGreenHue);
}

// Authored whole-plant silhouettes — the skeleton shape that makes a strain
// recognisable from across the room (knowledge/whole-plant-architecture.md §
// Silhouette system). Tuned to the canonical targets:
//   • G13 — slim spear / christmas-tree: tight nodes, short top, modest skirt.
//   • Purple Diddy Punch — short, wide, chunky: heavy lateral branching, fat top.
//   • Animal Mints — medium height, dense stacking, golf-ball clusters.
//   • White Rhino — heaviest indica: short, very wide skirt, fat top, dense canopy.
//   • White Fire OG — balanced OG: medium height, moderate spread, frosty cola.
//   • Gelato — balanced + colourful: medium-dense, slightly fat top.
//   • Wedding Cake — dense frosty: tight dense canopy, indica-leaning, chunky cola.
const SILHOUETTES: Record<string, Silhouette> = {
  g13: { nodeDensity: 1.16, vertStack: 1.22, branchletFrac: 0.4, lowerSpread: 0.95, upperShorten: 0.46, colaScale: 1.1, nodeLeaf: 0.95 },
  "purple-diddy-punch": { nodeDensity: 1.08, vertStack: 0.94, branchletFrac: 0.78, lowerSpread: 1.42, upperShorten: 0.16, colaScale: 1.22, nodeLeaf: 1.16 },
  "animal-mints": { nodeDensity: 1.3, vertStack: 1.08, branchletFrac: 0.64, lowerSpread: 1.12, upperShorten: 0.3, colaScale: 1.07, nodeLeaf: 1.12 },
  "white-rhino": { nodeDensity: 1.24, vertStack: 0.9, branchletFrac: 0.8, lowerSpread: 1.5, upperShorten: 0.16, colaScale: 1.28, nodeLeaf: 1.2 },
  "white-fire-og": { nodeDensity: 1.1, vertStack: 1.06, branchletFrac: 0.58, lowerSpread: 1.08, upperShorten: 0.32, colaScale: 1.08, nodeLeaf: 1.05 },
  gelato: { nodeDensity: 1.18, vertStack: 1.04, branchletFrac: 0.62, lowerSpread: 1.14, upperShorten: 0.3, colaScale: 1.1, nodeLeaf: 1.1 },
  "wedding-cake": { nodeDensity: 1.28, vertStack: 1.0, branchletFrac: 0.7, lowerSpread: 1.2, upperShorten: 0.26, colaScale: 1.16, nodeLeaf: 1.14 },
};

/**
 * Per-strain silhouette: authored for curated strains, else derived from indica
 * dominance — indica trends bushier/wider/denser with a fat top, sativa taller/
 * airier/leaner. Pure + deterministic so the chamber rebuilds identically.
 */
export function silhouetteFor(slugOrName: string | undefined, indicaRatio: number): Silhouette {
  if (slugOrName) {
    const key = SILHOUETTES[slugOrName] ? slugOrName : slugify(slugOrName);
    if (SILHOUETTES[key]) return SILHOUETTES[key];
  }
  const r = clamp(indicaRatio, 0, 1);
  return {
    nodeDensity: lerp(0.92, 1.18, r),
    vertStack: lerp(0.96, 1.16, r),
    branchletFrac: lerp(0.4, 0.66, r),
    lowerSpread: lerp(0.96, 1.32, r),
    upperShorten: lerp(0.22, 0.4, r),
    colaScale: lerp(0.95, 1.14, r),
    nodeLeaf: lerp(0.9, 1.15, r),
  };
}
