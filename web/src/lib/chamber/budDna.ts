// Per-strain Bud DNA — the measurements the procedural macro generator reads to
// build a strain's cola (blueprint §10). Authored for curated strains; derived
// from the strain's bud colour otherwise. Dimensions are in "DNA units" and are
// scaled to the canvas at build time, so only the *ratios* between strains
// matter (a wider maxBudWidth/budHeight → a chunkier cola).

import { clamp, type BudColor } from "./morphology";
import { slugify } from "./strainVisuals";

export interface PaletteColor { hue: number; sat: number; lit: number; weight: number }

export interface BudDNA {
  budHeight: number;
  maxBudWidth: number;
  rows: number;
  calyxPerRowMin: number;
  calyxPerRowMax: number;
  calyxSizeMin: number;
  calyxSizeMax: number;
  overlap: number; // 0.6–0.75
  pistilChance: number;
  sugarLeafChance: number;
  trichomeDensity: number;
  palette: PaletteColor[]; // weighted calyx colours
}

// Named calyx colours used to compose strain palettes.
const C = {
  green: { hue: 110, sat: 50, lit: 37 },
  lime: { hue: 92, sat: 60, lit: 48 },
  deepGreen: { hue: 126, sat: 46, lit: 26 },
  purple: { hue: 282, sat: 56, lit: 42 },
  magenta: { hue: 312, sat: 62, lit: 47 },
  deepPurple: { hue: 270, sat: 54, lit: 30 },
} as const;

function pal(parts: Array<[keyof typeof C, number]>): PaletteColor[] {
  return parts.map(([k, weight]) => ({ ...C[k], weight }));
}

export function pickPaletteColor(palette: PaletteColor[], roll: number): PaletteColor {
  const total = palette.reduce((s, p) => s + p.weight, 0);
  let r = roll * total;
  for (const p of palette) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return palette[palette.length - 1];
}

const AUTHORED: Record<string, BudDNA> = {
  g13: {
    budHeight: 170, maxBudWidth: 75, rows: 18, calyxPerRowMin: 3, calyxPerRowMax: 7,
    calyxSizeMin: 7, calyxSizeMax: 14, overlap: 0.68, pistilChance: 0.32,
    sugarLeafChance: 0.12, trichomeDensity: 0.7, palette: pal([["green", 3], ["lime", 1.5], ["deepGreen", 2]]),
  },
  "purple-diddy-punch": {
    budHeight: 150, maxBudWidth: 95, rows: 16, calyxPerRowMin: 3, calyxPerRowMax: 8,
    calyxSizeMin: 8, calyxSizeMax: 16, overlap: 0.72, pistilChance: 0.34,
    sugarLeafChance: 0.1, trichomeDensity: 0.85, palette: pal([["purple", 3], ["magenta", 1.5], ["deepPurple", 2.5]]),
  },
  "animal-mints": {
    budHeight: 160, maxBudWidth: 85, rows: 17, calyxPerRowMin: 3, calyxPerRowMax: 7,
    calyxSizeMin: 7, calyxSizeMax: 15, overlap: 0.7, pistilChance: 0.33,
    sugarLeafChance: 0.12, trichomeDensity: 0.95, palette: pal([["green", 2.5], ["lime", 1.5], ["purple", 1.5], ["deepPurple", 1.5]]),
  },
};

/** Authored DNA for curated strains, else a default derived from the bud colour. */
export function budDnaFor(slugOrName: string | undefined, color: BudColor): BudDNA {
  if (slugOrName) {
    const key = AUTHORED[slugOrName] ? slugOrName : slugify(slugOrName);
    if (AUTHORED[key]) return AUTHORED[key];
  }
  const palette: PaletteColor[] = [
    { hue: color.calyxHue, sat: color.calyxSat, lit: 38, weight: 3 },
    { hue: color.calyxHue, sat: color.calyxSat, lit: 28, weight: 1.5 },
  ];
  if (color.accentFrac && color.accentHue != null) {
    palette.push({ hue: color.accentHue, sat: color.calyxSat + 6, lit: 36, weight: color.accentFrac * 4 });
  } else if (color.anthocyanin > 0.5) {
    palette.push({ hue: color.calyxHue, sat: color.calyxSat, lit: 30, weight: 1 });
  }
  return {
    budHeight: 160, maxBudWidth: 85, rows: 16, calyxPerRowMin: 3, calyxPerRowMax: 7,
    calyxSizeMin: 7, calyxSizeMax: 15, overlap: 0.7, pistilChance: 0.32,
    sugarLeafChance: 0.12, trichomeDensity: clamp(0.6 + color.anthocyanin * 0.25, 0, 1), palette,
  };
}
