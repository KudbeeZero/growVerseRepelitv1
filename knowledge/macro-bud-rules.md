# Macro Bud Rules

> Canonical rules for the **Detailed Bud View** (`GrowChamber`, `view="macro"`).
> See `botanical-bible.md`. Generator is measurement-driven from `BudDNA`.

## Pipeline
`BudSeed → Cola Spine → Nodes → Calyx Clusters → Golden Angle → Pistils →
Sugar Leaves → Trichomes → Phenotype Colours → Final Render`

## Cola silhouette
- Rows along the spine; per-row width = `sin(progress^k · π) · maxBudWidth`.
- `progress = row / (rows−1)` (0 top → 1 bottom): **narrow top, wide center,
  tapered base**. `k ≥ 1` (indica) pushes the widest point lower (heavier base).

## Placement
- **Golden angle 137.5°** within each row (`angle = (i + row·3)·137.5°`);
  `cos(angle)` sets horizontal offset across the row width.
- Calyxes per row scale with row width (`calyxPerRowMin … calyxPerRowMax`).
- Extra small **front** calyxes are added to break up large blobs.

## Layering (painter's algorithm, back → front)
- Each calyx carries a `depth` (0 back … 1 front): back = darker/smaller/lower
  opacity, front = brighter with highlights.
- Draw order: dark cola core → back calyxes → **sugar leaves** → front calyxes →
  pistils → trichome frost → frost bloom.

## Calyx rendering
- Shape mix teardrop/oval/pointed/foxtail; **height > width**, pointed tip.
- Per calyx: body fill, **outer-rim edge shadow** (overlap/ambient occlusion),
  **center vein**, **2 mirrored side ridges**, **surface speckles**, a thin
  **sliver highlight** (never a flat circle), and **micro-fuzz** on front calyxes.
- **Overlap target 60–75%.**

## Pistils & trichomes
- Pistils: thin, strongly curved, irregular, from between calyxes; reveal with
  `budDev`.
- Trichomes: additive (`lighter`) soft specks that build into **frost patches**;
  each is anchored to a host calyx and only drawn once that calyx is revealed.

## Performance
- Backdrop bokeh + framing leaves are precomputed once per build (gradients
  reused). Macro geometry omits `day` from the rebuild key; it rebuilds only on a
  coarse `BudDNA` signature change (env shift), not every frame.
- **Known follow-up:** the strain-profile hero runs the macro RAF loop while
  visible; offscreen-cache + IntersectionObserver gating is the planned perf step
  before heavy texture scales further.

## Implementation
`web/src/components/viz/GrowChamber.tsx` — `buildMacro()`, `drawMacro()`, `calyxPath()`.
