# Phenotype Generator

> **Foundation layer.** A deterministic, visual-only resolution step that
> composes the existing chamber helpers into one `ResolvedPhenotype`. See
> `botanical-bible.md` for the botanical rules and `strain-dna.md` for BudDNA.
> Status: **foundation** — the generator + tests ship; the renderer does **not**
> consume it yet (that is a later, separate step).

## Why this exists
The visual rules for a plant are correct but **scattered**. The chamber renderer
(`web/src/components/viz/GrowChamber.tsx`) wires together a handful of pure
helpers itself — `morphologyFor`, `silhouetteFor`, `budColorForStrain`,
`budDnaFor` + `applyEnvironmentToBudDNA`, `effectiveDev` — and any new consumer
would have to repeat that wiring. There is no single object that says, for a
given plant right now, *here is its resolved look*.

`resolvePhenotype()` is that single object. It changes **no** visual rule — it
only consolidates the existing ones — so a future PR can switch the renderer to
read `ResolvedPhenotype` without hunting down visual logic in many files.

## What it is (and is not)
- **Visual-only.** No gameplay, economy, chain, breeding, or genetics logic. The
  DB stays authoritative; this is a presentation projection layered on top.
- **Pure + deterministic.** Same input → same output, always. No `Date.now()`,
  no unseeded RNG (`ageDays` is passed in; mutations roll from the seed). Safe to
  call on every render.
- **Orchestration, not reimplementation.** Every base number comes from an
  existing helper. Only the small blends nobody owned yet are new here:
  stem colour, pistil colour, leaf curl/droop, branch droop, bud mass, the stress
  tint, and the (currently sparse) trait lists.

## How it relates to StrainDNA / PlantDNA / BudDNA
`resolvePhenotype({ strainDNA, plantDNA, budDNA, environment, growthStage, stressState, seed })`
resolves in this order:

| Output | Source helper | File |
|--------|---------------|------|
| `leafColor` | `morphologyFor(indicaRatio)` | `web/src/lib/chamber/morphology.ts` |
| `stemColor` | new blend of `leafColor` | `phenotype.ts` |
| `budPalette`, `trichomeDensity` | `budDnaFor` → `applyEnvironmentToBudDNA(env)` | `web/src/lib/chamber/budDna.ts` |
| `purpleExpression` | purple-band share of the env-resolved palette | `phenotype.ts` |
| `pistilColor` | `budColorForStrain().pistilMagenta` + `effectiveDev().brown` | `strainVisuals.ts` / `morphology.ts` |
| `frostIntensity` | `trichomeDensity × effectiveDev().trich` (+ UV highlight) | `morphology.ts` |
| `budMass` | `effectiveDev().budDev × silhouetteFor().colaScale` | `morphology.ts` / `strainVisuals.ts` |
| `leafCurl` / `leafDroop` / `branchDroop` / `stressTint` | env bands + condition flags + stress | `phenotype.ts` |

`BudDNA` and `PlantDNA` keep their existing meaning: `BudDNA` is the strain's bud
blueprint (authored or derived), and the per-plant `seed`/`ageDays` give each
plant its stable identity and development point. `applyEnvironmentToBudDNA`
already nudges the bud from grow conditions **without** replacing genetic
identity — `resolvePhenotype` reuses that exact behaviour (e.g. cool nights raise
`purpleExpression` because the env helper injects purple palette entries).

## How future mutations & NFT traits plug in
`mutationTraits` and `rarityTraits` are the documented extension points:
- **`mutationTraits`** — a deterministic roll from the seeded stream over a tiny
  cosmetic catalog (variegation, deep-purple, frost-mutant). This is where the
  full colour-mutation ladder in `mutation-system.md`
  (`Green → … → Black Purple → Pink Pistils → Albino`) and future generative
  traits attach. Keep them **rare, identity-preserving, and seed-deterministic**.
- **`rarityTraits`** — a pure map of the strain's rarity tier to a cosmetic sheen.
  When NFT trait metadata exists, a minted strain's on-chain traits become an
  additional input that resolves into this same list — the renderer/badges read
  one place regardless of source.

## Code map
- Generator + types: `web/src/lib/chamber/phenotype.ts`
  (`resolvePhenotype`, `ResolvedPhenotype`, `PhenotypeInput`, `MutationTrait`,
  `RarityTrait`).
- Tests: `web/src/lib/chamber/__tests__/phenotype.test.ts`.
- Upstream helpers it orchestrates: `morphology.ts`, `budDna.ts`,
  `strainVisuals.ts`.
- Future consumer (not wired yet): `web/src/components/viz/GrowChamber.tsx`.
