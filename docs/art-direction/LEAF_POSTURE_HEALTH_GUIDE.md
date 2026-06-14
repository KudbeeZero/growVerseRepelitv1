# Leaf Posture & Health Guide

> **Directive:** ART-002 — GrowPod Empire Art Direction · Worker **ART-A05**
> **Status:** CONCEPT / ART-DIRECTION ONLY. No renderer changes, no code in this doc.
> **Date:** 2026-06-14
> **Scope:** Desktop-first — authored against 1920×1080, validated at laptop
> 1440×900 and 1366×768. Mobile is a secondary read.
> **Canonical principle covered:** #3 — *Health Through Posture.*

This guide specifies how a GrowPod plant **shows its health by how it holds its
leaves**, not by color. It maps a small set of discrete health states to concrete
leaf-tip angles, petiole/branch angles, turgor/curl, and leaf-edge behaviour, then
binds each state to the **real simulation signals** that drive it. Color is named
only as the *secondary* tint. Everything here is deterministic and seek-safe so the
whole-plant view can scrub/rewind without nondeterministic wobble.

Grounded in: the visual-reference catalog (Veg board's praying leaves, principle
#5), the seedling/veg reference PNGs, the canonical knowledge base
(`botanical-bible.md`, `plant-anatomy-reference.md`, `environment-rules.md`,
`whole-plant-architecture.md`), and the live sim
(`simulation/conditions.py`, `reactions.py`, `engine.py`, `horticulture.py`) plus
the existing posture engine (`web/src/lib/chamber/budPhysics.ts`, `morphology.ts`).

---

## 1. Header

- **Deliverable:** `docs/art-direction/LEAF_POSTURE_HEALTH_GUIDE.md`
- **Principle:** Health Through Posture (CANONICAL #3). Posture is the PRIMARY
  health read; color is a SECONDARY confirm.
- **Shared canon constants (verbatim, used below):**
  - Plant greens: seedling pale `#8fd49a` · healthy `#4faf5a` · mature `#2f7d3a`.
  - Stress tints toward a fade ramp: yellow `#e3c84a`, amber `#d98a3a`.
  - Background: `#060a14`. Type: Inter (UI) / JetBrains Mono (numerics/readouts).

---

## 2. Posture-as-primary doctrine

**Why posture over color.**

1. **Legibility at a glance (the desktop 2-second read).** On a 1920×1080 chamber
   view the plant occupies the warm hero center against the `#060a14` charcoal
   frame. A player scanning a *grid* of pods must answer "is this plant okay?" in
   under two seconds without zooming. **Silhouette change is legible at any zoom and
   any thumbnail size; a hue shift is not.** A praying canopy (tips up, fingers
   spread) versus a drooping canopy (tips down, fingers folded) is a binary the eye
   resolves from across the room. Two green-tinted plants are indistinguishable in a
   thumbnail; an up-canopy vs. a down-canopy is not.

2. **Color is overloaded and ambiguous.** In this universe color already carries
   *three* other meanings: strain identity (per-strain `hue`/`sat`/`lit` in
   `morphology.ts`), ripeness/fade (the purple/amber premium ramp,
   `budColorFor`), and anthocyanin genetics (cool-night purple, §11). If we also
   make color the primary *health* signal it collides with all three — a healthy
   purple-pheno plant would read as "stressed yellow's cousin." Posture is an
   orthogonal channel that no other system claims.

3. **Accessibility.** ~8% of male players have red/green color-vision deficiency.
   A green→yellow health ramp is precisely the axis they cannot resolve. Posture
   (geometry) is colorblind-safe by construction.

4. **It matches botany and the reference.** The Veg board's single strongest
   "happy plant" tell is the *praying* fan leaves (catalog §2 Veg, principle #5).
   Real cannabis prays under good light/turgor and droops/tacos/claws under water,
   heat, VPD and nutrient stress. Posture *is* how the plant actually communicates.

**Doctrine statement.** Health is rendered first as **canopy attitude** (leaf-tip
angle + petiole angle + turgor), second as **leaf-edge state** (taco/claw), and
only third as **color tint**. If a reviewer can read the health state with the
color channel desaturated to grayscale, the posture pass is correct.

---

## 3. Health-state reference sheet

Five discrete states. The renderer interpolates *between* them as a continuous
function of `health` (and the dominant stressor), but artists and QA validate
against these five anchors. **All leaf-tip angles are degrees relative to
horizontal: positive = tip raised above the petiole line (praying); negative =
tip below the petiole line (drooping).** Petiole/branch angle is measured from the
main stem (smaller = more upright/hugging the stem; larger = splayed/sagging).

| State | `health` band | Leaf-tip angle (vs horizontal) | Petiole / branch angle (from stem) | Turgor / curl | Leaf-edge state | SECONDARY color tint |
|---|---|---|---|---|---|---|
| **Thriving** | 90–100 | **+30° … +40°** (strong pray, fingers fanned wide) | Petioles **40–50°**, branches firm at strain base angle (~45° veg) | Full turgor; flat, rigid blades; fingers maximally spread | Edges flat, crisp serrations | Saturated healthy green `#4faf5a` (mature canopy trends `#2f7d3a`); seedlings `#8fd49a`. No stress tint. |
| **Healthy** | 70–89 | **+15° … +30°** (gentle pray) | Petioles **45–55°**, branches at strain base angle | Good turgor; blades flat, fingers spread | Edges flat | Green at canon value, no tint. This is the default "fine" read. |
| **Mild Stress** | 50–69 | **+5° … −10°** (canopy flattening, prayer lost; tips level or just dipping) | Petioles **55–65°** (starting to splay/sag) | Slightly soft; fingers begin drawing inward; faint center-fold (incipient taco) | Edges **just starting to cup** (taco onset) or **just starting to roll down** (claw onset) depending on driver | First whisper of yellow `#e3c84a` mixed at low weight into leaf edges/oldest leaves only |
| **Neglected** | 25–49 | **−20° … −35°** (clear droop; whole leaf hangs from the petiole) | Petioles **65–80°**, branches visibly sagging below base angle | Soft/wilty; blades limp; fingers folded toward midrib | Pronounced **taco** (edges up, underwatered/heat) or **claw** (tips down, over-fed/N-toxicity) | Yellow `#e3c84a` clearly present, oldest/lowest leaves first; edges may scorch toward amber `#d98a3a` on nutrient burn |
| **Critical** | 1–24 | **−40° … −50°** (severe wilt; leaves collapse toward vertical-down) | Petioles **80–90°** (nearly folded along stem), branches collapsed | No turgor; rag-limp blades; fingers fully curled | Severe taco/claw; tips desiccated/crisping | Amber `#d98a3a` dominant on dying tissue; necrotic crisp edges; green retreats to inner blade |
| *(Dead)* | 0 | n/a — leaves dropped/crisped, no posture | branches collapsed | none | crisp/necrotic | desaturated brown; out of the posture model (maps to `PlantCondition.DEAD`) |

**Reading notes.**
- The **prayer-to-droop axis is the spine of the model.** Thriving = `+40°`,
  Critical = `−50°`; that ~90° sweep is the single number the whole-plant view
  animates and the single thing QA checks first.
- **Taco vs. claw distinguishes the *cause*** (see §4): edges curling **up** into a
  taco = water/heat/VPD (transpiration outrunning uptake); tips curling **down**
  into a claw = nitrogen toxicity / overfeed. Both are secondary to the primary
  droop read but let an attentive player diagnose without opening a panel.
- **Seedling exception.** Per the seedling reference PNG and catalog §1, the two
  rounded **cotyledons sit flat/horizontal (~0°)** regardless of health, while the
  first true leaves carry the pray/droop signal. A seedling's healthy true-leaf
  pray is gentler (cap ~`+25°`) because the leaves are small and the silhouette is
  fragile by design. Use `#8fd49a` pale green here.

---

## 4. Mapping to simulation signals

The renderer must not invent health. It reads the **authoritative server state**
already computed by the sim and translates it to posture. Real metric names below
are cited from the repo.

**Primary drivers (these move DROOP / posture):**

| Sim signal | Where it lives | How it drives posture |
|---|---|---|
| `plant.health` (0–100) | `engine.py` `_health_target()` → `plant.health` drifts toward target | **Master input for the leaf-tip-angle sweep.** Map `health` 100→0 onto tip angle `+40°→−50°` and the state bands in §3. This is the headline posture value. |
| `plant.water_level` (0–100) | `engine.py` decay (`water_per_hour`); thresholds in `reactions.py` | The strongest *acute* droop driver. Below `underwater_threshold` (default 15) → `UNDERWATERED`; at/below half that → `WILTING` (`reactions.py` lines 33–36). Drives **deeper, faster droop + taco** (transpiration > uptake). Over `overwater_threshold` (88) → `OVERWATERED` → a different droop: heavy, downward-cupped, dull (roots starved of O₂), *not* a taco. |
| `vpd_kpa` | `horticulture.py` `vpd_kpa()`; `engine.py` reads `vpdcfg.optimal` `[0.8,1.6]`, weight `vpd_stress_weight` 0.5 | High VPD (dry/hot air) pulls water faster than roots supply → drives **taco/edge-cup** even when `water_level` looks okay. VPD is the "why is it tacoing despite watering" signal. |
| `env.temperature` vs `environment.temperature` band `[20,28]` | `engine.py` `_health_target()` `env_stress` | High temp amplifies the taco/heat-stress edge curl and accelerates the droop onset. |

**Secondary drivers (these move the COLOR tint, after posture):**

| Sim signal | Where it lives | How it tints |
|---|---|---|
| `plant.nutrient_level` (0–100) | `reactions.py` lines 39–42; `engine.py` `nutrient_stress` | Below `deficient_threshold` (20) → `NUTRIENT_DEFICIENT` → **yellow `#e3c84a`** drawn into the *oldest/lowest* leaves first (mobile-N drawback), edges inward. Above `burn_threshold` (95) → `NUTRIENT_BURN` → **amber `#d98a3a`** scorch on leaf *tips*, plus a downward **claw** posture (the one case where nutrients touch posture). |
| `plant.pest_level`, `plant.disease_level` | `reactions.py` lines 45–48 | Speckle/mildew overlays + a modest health penalty (`pest_weight` 0.45, `disease_weight` 0.55 in `_health_target`); they pull `health` down which in turn droops posture. Their own *visual* is texture, not posture. |
| `env.light` / `dli_mol` vs `optimal_ppfd` `[300,900]` | `horticulture.py` `dli()`; `engine.py` `light_stress` (weight 0.02) | Very low light → stretch + a faded pale green (catalog: long internodes as a *neglect* state). Note light's health weight is tiny (0.02) — it mostly shifts *silhouette* (stretch), not droop. |

**The division of labor, stated plainly:**
- **DROOP is driven by `health`, `water_level`, `vpd_kpa`, and `temperature`.**
- **COLOR TINT is driven by `nutrient_level` (yellow/amber), ripeness/fade, and
  anthocyanin** — none of which should move the leaf-tip angle (except nutrient
  *burn* → claw).
- The discrete **`condition_flags`** already emitted by `compute_conditions()`
  (`HEALTHY / UNDERWATERED / WILTING / OVERWATERED / NUTRIENT_DEFICIENT /
  NUTRIENT_BURN / …`) + their `Severity` (`MILD / MODERATE / SEVERE`) are the
  bridge: the renderer picks the **posture sub-shape** (taco vs claw vs heavy-cup)
  from the *flag*, and the **magnitude** from `health` + `Severity`.

---

## 5. Animation & transition notes

All motion is **deterministic and seek-safe**: posture is a *pure function of
state* (`health`, `water_level`, flags, and a per-plant seed via `seedForPlant`),
evaluated at a given timeline position. **No `Math.random()`, no `Date.now()`** in
the posture path — the same plant at the same scrub position must produce the same
canopy attitude every time (mirrors the determinism contract in `morphology.ts`'s
`mulberry32` / `seedForPlant`).

- **Recovery after care (water/feed event).** When `water_level` jumps (player
  waters) the canopy should **lift from droop back toward pray over ~6–10 seconds**
  of wall-clock animation, eased with **smoothstep** (`smooth()` in
  `morphology.ts`, `t·t·(3−2t)`) — the same easing the dev ramps already use, so it
  reads "organic." Recovery is *not* instant: turgor returns gradually, which
  rewards the player with a visible, satisfying perk-up. Lift the tip angle first,
  then un-taco the edges, then re-spread the fingers (staggered so it looks alive).
- **Wilt onset.** Drying is **slower than recovery** is fast on the upswing of a
  rescue, but a *neglected* slide into droop should be gradual and continuous as
  `water_level` decays (`water_per_hour` default 1.5) — never a snap. Onset uses
  the same smoothstep; the canopy sinks tip-first, edges curling as VPD/water cross
  their bands.
- **Circadian micro-motion (from `whole-plant-architecture.md` Motion §).**
  Lights-on → leaves pray slightly *more*; lights-off → a subtle droop. This is a
  small **bias (±~3–5°)** layered on top of the health posture, driven by the
  photoperiod phase (deterministic from the sim clock / `photoperiod_hours`), not a
  random wiggle. It must never overwhelm the health read.
- **Airflow sway** reuses the **existing** wave, weighted by bud load
  (`airflowWeighting` in `budPhysics.ts`) — top moves first, bottom last (delayed
  physics, not random). Posture is the *rest pose*; sway oscillates around it.
- **Reduced motion.** Respect `prefers-reduced-motion` (already checked in
  `GrowChamber.tsx`): when set, render the **static rest pose** for the current
  state with no sway/recovery animation. The posture (angle) still encodes health;
  only the motion is suppressed.

---

## 6. Implementation hooks (specify, don't write)

These are the real functions/params the engine would **extend** — named so a later
implementation PR has exact targets. No code authored here.

- **`web/src/lib/chamber/budPhysics.ts`**
  - `branchDroop(budMass, flex, stageMul, budWeightMul, branchStrength)` — today
    this is **bud-weight-only** droop (radians, clamped to `MAX_BRANCH_DROOP` 12°).
    Extend with a parallel **health/water droop term** (or add a sibling
    `leafPostureAngle(health, waterLevel, flag, severity, stageMul)`) so branch and
    petiole sag responds to *neglect*, not just heavy flowers. Keep the same
    bounded-clamp discipline; health droop needs a larger range than 12° to reach
    the §3 `−50°` critical sweep, so a new dedicated constant (e.g. a
    `MAX_LEAF_DROOP` ~50°) is warranted rather than overloading `MAX_BRANCH_DROOP`.
  - `colaLean(stageMul, budWeightMul)` — leave as-is (bud physics); posture work is
    a *separate* leaf/petiole concern that composes additively with cola lean.
  - `airflowWeighting(...)` — reuse unchanged for sway around the new rest pose.
  - `flowerStageMultiplier`, `branchFlex` — reuse; `branchFlex(branchMul)` is the
    correct stiffness input for how far a given strain's petioles sag at a given
    stress.
- **`web/src/lib/chamber/morphology.ts`**
  - `Morphology` / `morphologyFor(indicaRatio)` — add the missing posture knobs
    that `whole-plant-architecture.md` already names in the target `PlantDNA`:
    **`leafDroop`** (per-strain baseline droop bias) and a leaf-tip pray cap. These
    belong next to `leafW` / `leafletMax`.
  - `Silhouette` — `branchStrength` is the existing stiffness term the new droop
    should divide by (sturdier strains sag less under the *same* stress), matching
    how `branchDroop` already uses `branchStrength`.
  - `climateModel(...)` — its `fanNote` already says *"windburn — leaves clawing"*
    at `fan > 78`; wire that same clawing into the **leaf-edge state** (§3) so the
    note and the visual agree.
  - Reuse `clamp`, `lerp`, `smooth`, `seedForPlant`, `mulberry32` for all
    posture math to stay pure/deterministic.
- **`web/src/components/viz/GrowChamber.tsx`**
  - Already receives `conditionFlags` (`ConditionFlag[]`) and per-plant climate/dev
    state. The plant builder (`buildPlant`/`drawPlant`) is where the new
    `leafPostureAngle` output is applied to fan-leaf petioles/blades at draw time.
    Feed it `health` + the dominant `conditionFlags` flag/severity.
- **Server (read-only contract, do not change here):**
  `simulation/reactions.py::compute_conditions` (flags), `conditions.py`
  (`PlantCondition`, `Severity`), `engine.py::_health_target` (`health`),
  `horticulture.py::vpd_kpa` / `derived_metrics` (`vpd_kpa`, `dli_mol`). The
  renderer consumes these; it must never recompute health locally.

---

## 7. Reference-sheet acceptance criteria vs the Veg board

Validated against `docs/research/visual-reference/plants/02_veg.png` (the Veg board
with praying leaves) and `01_seedling.png`.

A **Thriving/Healthy Veg** plant rendered by the engine passes when:

1. **Pray is unmistakable.** Fan-leaf tips read clearly **above** horizontal
   (`+15°…+40°`), fingers fanned wide, matching the Veg board's macro inset where
   the 7–9 leaflets splay and lift. A grayscale screenshot still reads "up-canopy."
2. **Petioles spread, not sag.** Petioles sit ~`45–55°` off the stem with the
   board's symmetric, opposite phyllotaxy; laterals at the ~45° veg base angle.
3. **Edges flat, no curl.** No taco, no claw — crisp serrations like the board.
4. **Color is confirmation, not the message.** Deep saturated healthy green
   (`#4faf5a`, mature `#2f7d3a`); turning the image grayscale must NOT change the
   "healthy" verdict — posture alone carries it.
5. **Contrast test.** Forcing the same plant to `health = 20` (Neglected/Critical)
   must visibly collapse the canopy to tips-down (`−20°…−50°`) and curl the edges,
   so the *delta* between the Veg-board pray and the neglected droop is the
   dominant on-screen change — color shift is the lesser change.
6. **Seedling check.** A healthy seedling (`01_seedling.png`) keeps cotyledons
   flat (~0°) with first true leaves gently praying (≤`+25°`), pale `#8fd49a`,
   small on screen.

---

## 8. Desktop validation & cross-references

**Desktop-first validation (per directive):**
- **1920×1080 (primary):** the plant is the warm hero center on `#060a14`. At this
  size the full `+40°→−50°` posture sweep and taco/claw edge states must be
  resolvable without zoom. JetBrains Mono health readouts (e.g. `health 92 ·
  vpd 1.1 kPa`) sit in the control frame; Inter for labels.
- **1440×900 and 1366×768 (laptop):** the **2-second glance read** is the binding
  test here — in a multi-pod grid each plant thumbnail must still answer
  "okay / not okay" from canopy attitude alone. If posture is only legible at
  1080p hero scale and not in a 1366-wide grid cell, the angles are too subtle —
  widen the pray/droop sweep, do not lean on color.
- **Mobile (secondary):** posture remains the read; reduce sway and consider
  snapping to the five discrete §3 anchors rather than continuous interpolation to
  keep small-screen thumbnails legible.

**Cross-references (sibling ART-002 deliverables — author/keep in sync):**
- `docs/art-direction/CANONICAL_VISUAL_LANGUAGE_V1.md` — owns the shared canon
  constants (greens `#8fd49a`/`#4faf5a`/`#2f7d3a`, fade `#e3c84a`/`#d98a3a`, bg
  `#060a14`, Inter/JetBrains Mono) and principle #3 (Health Through Posture). This
  guide is the detailed expansion of that principle; if a constant changes there,
  update §1 and the §3 tint column here.
- `docs/art-direction/PLANT_ENGINE_VISUAL_TARGETS.md` — owns the per-stage
  morphology targets (node spacing, branch angle, bud stacking, frost, fade). This
  guide supplies the **health/posture layer** that composes over those stage
  targets; the petiole/branch base angles in §3 must match that doc's veg/flower
  branch-angle targets (~45° veg) so posture and stage geometry never contradict.
- Upstream canon: `docs/research/visual-reference/2026-06-14-growpod-visual-reference-catalog.md`
  (principle #5, Veg leaf-posture note) and `knowledge/whole-plant-architecture.md`
  (`leafDroop`, circadian, delayed-physics airflow).

---

*ART-A05 / Directive ART-002. Concept and art-direction only — no engine changes
were made. The sim remains server-authoritative; the renderer reads `health`,
`water_level`, `vpd_kpa`, and `condition_flags` and never recomputes them.*
