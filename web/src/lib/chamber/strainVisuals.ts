// Authored per-strain bud visuals. Keyed by strain slug (matches the backend
// slug = lowercase, non-alphanumerics → "-"). This is the client-side "card"
// layer: it lets curated strains render in their intended colours (purple
// calyxes, orange vs magenta pistils, green-with-purple accents) instead of the
// deterministic per-strain roll. Unknown strains fall back to budColorFor.
//
// Pistil colour (pistilMagenta) is deliberately independent of anthocyanin so a
// deep-purple bud can still carry classic bright-orange pistils (e.g. PDP,
// Animal Mints) — they are separate genetic expressions.

import { budColorFor, type BudColor } from "./morphology";

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
