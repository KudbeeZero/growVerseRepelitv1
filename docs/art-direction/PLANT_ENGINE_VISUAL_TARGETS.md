# Plant Engine Visual Targets — Silhouette · Fade · Engine Priorities

> **Directive ART-002 · Worker ART-A03+A04+A09 · CONCEPT ONLY.**
> No production code, no renderer changes — this is a study-grounded target spec.
> It consolidates three assignments into one surface:
> **A03** per-strain silhouette rules · **A04** fade progression standard · **A09**
> ranked Plant Engine priorities. Every number below extends a parameter the
> **real** engine already exposes (`web/src/lib/chamber/morphology.ts`,
> `chamberCore.ts`, `budPhysics.ts`, `budDna.ts`, `strainVisuals.ts`). Where this
> doc and the code disagree on a name, the **code wins** — fix the doc.
>
> **Target:** procedural plants that capture **70–80% of the emotional impact** of
> the flowering reference clip (see the visual-reference catalog,
> `docs/research/visual-reference/2026-06-14-growpod-visual-reference-catalog.md`).
> **Layout target:** desktop-first — 1920×1080 hero, then laptop 1440×900 /
> 1366×768. Mobile is secondary. The chamber view (`view="chamber"`) is the
> emotional core; macro (`view="macro"`) is the inspection/NFT layer.

## Shared canon (verbatim — do not drift)
- **Plant greens:** seedling `#8fd49a` · healthy `#4faf5a` · mature `#2f7d3a`.
- **Fade ramp:** green `#4faf5a` → yellow `#e3c84a` → amber `#d98a3a` → magenta
  `#c2487a` → purple `#7a3fae` → red `#b23a3a`.
- **Trichomes:** milky `#eef6ff` · specular `#ffffff` · ripe-amber `#d9a441`.
- **Background:** `#060a14`. **Type:** Inter (UI) / JetBrains Mono (data).
- These supersede the in-engine HSL placeholders (e.g. `trichHead()` returns
  `rgba(236,250,255,…)` ≈ `#eef6ff`; the canon hexes are the authoring target).

---

## 1. How the real engine maps to these targets (orientation)

The chamber plant is built **continuously from two structs**, not from presets:

- **`Morphology`** (`morphologyFor(indicaRatio)`) — colour + leaf + bud-cluster
  knobs, lerped between the `SATIVA` (ratio 0) and `INDICA` (ratio 1) archetypes.
- **`Silhouette`** (`silhouetteFor(slug, indicaRatio)`) — the *skeleton* knobs
  (node density, vertical stacking, branchlets, spread, cola mass, stem strength,
  bud weight). Authored per curated strain, else lerped from `indicaRatio`.

Geometry is assembled in `chamberCore.ts` `buildPlant()`; bud-mass droop/lean live
in `budPhysics.ts`; macro cola measurements live in `budDna.ts` (`BudDNA`). The
sections below give numeric targets **in those existing names** so the work is
"tune the knob," not "add a system."

---

## 2. A03 — Per-strain silhouette rules

Four archetypes. Indica/Sativa are the literal endpoints of `morphologyFor` /
`silhouetteFor`; **Hybrid** is the `indicaRatio ≈ 0.5` midpoint; **Autoflower** is
a *modifier overlay* (compressed timeline + Ruderalis-short structure) applied on
top of whatever indica/sativa base the genome carries.

Engine values cited are the **current** archetype constants — read them as the
authored target, and the per-strain authored `Silhouette`/`BudDNA` presets (G13,
PDP, etc.) as worked examples.

### 2.1 Indica (`indicaRatio → 1`; ref: Veg board, Bud Swell, White Rhino preset)
- **Height / proportion:** short, wide, bushy. `heightMul 0.74`; canopy reads
  ~1 : 1 (as wide as tall). Board read: dense Christmas-tree with a fat top.
- **Node spacing:** **tight.** `internode 0.08` (densest), `vertStack 1.16` packs
  nodes toward the apex; `nodeDensity ~1.18` fills the canopy. Reads as the
  "healthy vigor" cadence in the Veg board (#2).
- **Branch angle:** wide laterals, **~45–55°** from the main stem (bushy skirt).
  In-engine this is the splayed `lowerSpread ~1.32` + low `tilt`. Lower branches
  splay widest (skirt), upper tuck in (`upperShorten ~0.4`).
- **Leaf:** **broad, dark, 7–9 fingers.** `leafW 1.3` (widest), `leafletMax 9`,
  colour toward mature `#2f7d3a`. Board #2 macro inset: fat overlapping fingers.
- **Internode pattern:** even, short, slightly tighter at the apex (`vertStack`
  exponent `1.0→1.22`). Symmetric opposite phyllotaxy low, spiral toward top.
- **Cola structure:** **single dominant fat cola** + heavy stacked side colas.
  `clusterFat 1.3`, `colaScale ~1.28` (White Rhino), `pattern "nodal"`,
  `nodeBudFrac 0.55` (many node buds). Macro `maxBudWidth/budHeight` high (chunky).
- **Flowering speed:** standard photoperiod (~8–9 wk flower; `flowerFrom 0.18`).

### 2.2 Sativa (`indicaRatio → 0`; ref: Preflower board, G13 spear preset)
- **Height / proportion:** tall, airy, lean. `heightMul 1.22`, `stretch 1.58`
  (explodes upward at flip). Canopy ~1 : 2+ (twice as tall as wide).
- **Node spacing:** **stretched.** `internode 0.112` (longest), `vertStack 0.96`
  (loose), `nodeDensity ~0.92`. Long internodes = airy, open structure — but
  note: in *care* terms long internodes also = light-starved stretch, so for a
  healthy sativa keep it native, not exaggerated (see §6 priority 5).
- **Branch angle:** **narrow, ~60–75°** toward vertical (spear / Christmas-tree).
  `lowerSpread ~0.96` (modest skirt), `upperShorten ~0.22` (long upper branches).
- **Leaf:** **thin, light, long, 9 fingers.** `leafW 0.62` (narrowest), light
  green toward `#4faf5a`, higher `lit 41`. Board #3: slender drooping fingers.
- **Internode pattern:** long and regular; less apex-tightening.
- **Cola structure:** **slim spear cola, many small foxtailing flowers.**
  `clusterLen 1.45` (longest), `clusterFat 0.74` (slimmest), `pattern "spiral"`,
  `foxtail 0.6`, `bracts 9`, `nodeBudFrac 0.3` (fewer node buds). Macro cola is
  a slim spear (low `maxBudWidth/budHeight`).
- **Flowering speed:** slow photoperiod (10–14 wk; `flowerFrom 0.3` — flowers
  start later relative to the cycle).

### 2.3 Hybrid (`indicaRatio ≈ 0.5`; ref: Bud Set board, Animal Mints preset)
- **Height / proportion:** medium, balanced; `heightMul ≈ 0.98`, `stretch ≈ 1.35`.
- **Node spacing:** moderate, even; `internode ≈ 0.096`, `vertStack 1.04–1.08`,
  `nodeDensity 1.18–1.3` (Animal Mints is *denser* than the lerp — dense stacking
  is its authored identity).
- **Branch angle:** balanced, **~55–60°**; `lowerSpread ~1.1`, `upperShorten ~0.3`
  — the "candelabra" read of Bud Set (#4), laterals carrying their own bud tips.
- **Leaf:** intermediate, 7–9 fingers; `leafW ≈ 0.96`, colour `#4faf5a`→`#2f7d3a`.
- **Internode pattern:** even with a mild apex taper.
- **Cola structure:** **dominant top cola + several competitive side colas**
  ("golf-ball" stacked clusters). `pattern "hybrid"` (the in-engine third bud
  pattern), `clusterFat ≈ 1.0`, `colaScale 1.07`, `nodeBudFrac ≈ 0.43`.
- **Flowering speed:** standard (~8–10 wk).

### 2.4 Autoflower (modifier overlay on the indica/sativa base)
Autoflower is **not** a fourth `indicaRatio` point — it is Ruderalis genetics that
compress and shorten. Concept overlay (extends, does not replace, the base):
- **Height / proportion:** **smallest.** Apply `heightMul × ~0.6`; squat single
  main stem with a short skirt. Reads closer to the Seedling→Veg scale even at
  harvest.
- **Node spacing:** very tight; bias `internode × ~0.85`, `vertStack +0.06`.
- **Branch angle:** modest, **~45–55°**; small `lowerSpread ~1.0`, few branchlets
  (`branchletFrac × 0.7`).
- **Leaf:** often narrower/Ruderalis-tinged, 5–7 fingers; bias `leafletMax −1`.
- **Internode pattern:** uniform and short top-to-bottom (little apex taper).
- **Cola structure:** **one modest main cola + small side buds**; lower
  `colaScale ~0.95`, `clusterLen × 0.85`.
- **Flowering speed (the defining trait):** **fastest and age-, not photoperiod-,
  triggered.** Flowering begins on a fixed short clock — set the effective
  `flowerFrom` *early and low* (~0.12–0.15) and **shorten the strain's flowering
  window** (the `floweringDays` passed to `stageForDay`/`previewDev`). Whole seed
  → harvest target ≈ 60–75 days vs. 90–120 for photoperiod. This is the one knob
  that must be unmistakable: an autoflower reaches the Frost/Fade beats *sooner*.

### 2.5 Silhouette quick-reference (current authored + lerped values)

| Knob (`Silhouette`/`Morphology`) | Sativa (r→0) | Hybrid (r≈0.5) | Indica (r→1) | Autoflower (overlay) |
|---|---|---|---|---|
| `heightMul` | 1.22 | ~0.98 | 0.74 | base × 0.6 |
| `internode` | 0.112 | ~0.096 | 0.08 | base × 0.85 |
| `stretch` | 1.58 | ~1.35 | 1.12 | base × 0.85 |
| `vertStack` | 0.96 | 1.04–1.08 | 1.16 | base + 0.06 |
| `nodeDensity` | 0.92 | 1.18–1.30 | 1.18 | base |
| `lowerSpread` | 0.96 | ~1.10 | 1.32 | ~1.0 |
| `upperShorten` | 0.22 | 0.30 | 0.40 | base |
| branch angle (deg) | 60–75 | 55–60 | 45–55 | 45–55 |
| `leafW` | 0.62 | ~0.96 | 1.3 | base |
| `leafletMax` (fingers) | 9 | 7–9 | 9 | base − 1 |
| `pattern` | spiral | hybrid | nodal | inherit |
| `clusterFat` | 0.74 | ~1.0 | 1.3 | base |
| `colaScale` | 0.95 | 1.07 | 1.14–1.28 | ~0.95 |
| `foxtail` | 0.6 | ~0.3 | 0.0 | inherit |
| flower window | 10–14 wk | 8–10 wk | 8–9 wk | **6–8 wk, age-triggered** |

---

## 3. A04 — Fade progression standard

Fade is the **second-biggest emotional win after frost** (catalog Part 4). It must
be a **per-strain colour ramp driven by maturity**, not a global tint. Today the
engine already shifts *bud* colour (`budColorFor` anthocyanin, `applyEnvironment-
ToBudDNA` cool-night purple) but **leaves stay green** (`drawFan` uses `S.hue`
unmodified). The A04 target is to add a **maturity-driven leaf fade ramp** that
rides the shared canon hexes.

### 3.1 The ramp (shared canon, as fade stops)
`#4faf5a` (green) → `#e3c84a` (yellow) → `#d98a3a` (amber) → `#c2487a` (magenta) →
`#7a3fae` (purple) → `#b23a3a` (red).

These are **leaf-tissue stops**. They are distinct from the *calyx/anthocyanin*
purple (`budColorFor` `calyxHue 272–306`) and from *trichome* amber
(`#d9a441`) — three independent systems that should peak together at harvest.

### 3.2 When fade begins (as a function of maturity %)
"Maturity %" = flowering progress `0..1` across the strain's window — i.e. the
same `p` used in `previewDev(day, floweringDays)`. Mapping to dev params: fade
should track **ripeness/browning**, which begin around `devParams` `ripe` (day ≈ 40
of the nominal cycle) and `brown` (day ≈ 58).

- **0–55% maturity:** full green. No fade. (`brown ≈ 0`.)
- **55–65%:** fade *onset* — yellow creeps in at the lowest, oldest fan leaves and
  at leaf edges. (`blush` starts at day 55 in `devParams`.)
- **65–80%:** yellow → amber spreads upward; lower third of canopy turning.
- **80–92%:** magenta/purple pools in cool, older tissue (lower + outer leaves);
  upper canopy amber. This is the Fade board (#7) look.
- **92–100% (harvest):** full autumn gradient — purple/red lows, amber/yellow
  mids, the apex cola still frosty green-violet. Harvest board (#8).

### 3.3 Spatial pattern (where each colour pools)
- **Leaf-edge inward:** fade starts at the serrated edges and tips, advancing
  toward the midrib — drive by a per-leaflet edge-distance term in `leafletPath`
  shading (edges fade first, vein last). Board #7 macro inset shows green midribs
  on already-purple blades.
- **Lower-leaves-first / older-tissue-first:** fade is a function of node age,
  i.e. the node's `f` (0 base → ~1 apex) **inverted** — *low `f` fades first*. Use
  `low = (1−f)^0.75` (already computed in `buildPlant`) as the fade-lead term.
- **Purple pools in cooler/older tissue:** purple/magenta concentrate at the
  **bottom + outermost** (coolest, oldest) leaves; the warm-lit apex stays
  amber/yellow. Couple to the same cool-night signal `applyEnvironmentToBudDNA`
  already computes (`cool = clamp((20−temp)/8, 0, 1)`).

### 3.4 Per-strain bias (genetics — some never purple)
Reuse the existing **anthocyanin** trait so leaf fade is consistent with bud
colour (no new genetics needed):
- **Purple-capable** (`budColorFor.anthocyanin > 0.4`, or a purple-band palette in
  `BudDNA`, e.g. PDP, Gelato, Wedding Cake): full ramp reaching magenta/purple/red.
- **Mild blush** (`anthocyanin 0.1–0.4`, e.g. Animal Mints, Wedding Cake base):
  green → yellow → amber, with only edge-magenta hints.
- **Never purple** (`anthocyanin ≈ 0`, e.g. G13, White Rhino, White Fire OG):
  green → yellow → amber → light brown **only**. Clamp the ramp before the
  magenta stop. A frosty white strain should fade *gold*, never violet.
- Drive the per-strain reachable end-stop from `anthocyanin`:
  `endStop = lerp(amber, red, anthocyanin)`.

### 3.5 Trichome cloudy→amber shift (runs alongside fade)
The frost maturity track is **separate** but peaks with fade. `trichHead(p)`
already encodes it; the canon hexes are the target:
- clear/early (`p < 0.5`): translucent (engine `rgba(236,250,255,0.6)`).
- **milky/cloudy** (`0.5 ≤ p < 0.9`): `#eef6ff` — the dominant frost band.
- **ripe amber** (`p ≥ 0.9`): `#d9a441` — only at the very end.
- Specular sparkle catches the pod neon at `#ffffff` (kept sparse — see frost
  guide). Trichome `p` tracks `devParams.trich` (day ≈ 48–66).

### 3.6 Maturity → colour table (the A04 standard)

| Maturity % | Lower/old leaves | Mid leaves | Apex / cola leaves | Trichome heads | Pistils |
|---|---|---|---|---|---|
| 0–55% | `#4faf5a` | `#4faf5a` | `#2f7d3a` (apex darker) | clear | white |
| 55–65% | `#e3c84a` edges | `#4faf5a` | green | clear→milky | white→cream |
| 65–80% | `#d98a3a` | `#e3c84a` edges | `#4faf5a` | `#eef6ff` milky | cream |
| 80–92% | `#c2487a`/`#7a3fae`* | `#d98a3a` | `#e3c84a` | `#eef6ff` milky | cream→amber |
| 92–100% | `#7a3fae`→`#b23a3a`* | `#c2487a`/`#d98a3a` | `#e3c84a`+frost-violet | `#d9a441` amber onset | amber→brown |

\* Purple/magenta/red columns apply **only** to purple-capable strains (§3.4).
Never-purple strains stop at amber (`#d98a3a`) → light brown.

---

## 4. Bud stacking / mass model (extends the De-Grape approach)

The engine already solves the "grapes" problem with the **De-Grape continuous
silhouette** in `chamberCore.ts` `drawFlowerSite()` (ported from PR #25): before
drawing individual calyx pods it paints **one fused, stacked column** behind them —
each developed cluster contributes an overlapping ellipse blob that reaches ~70%
of the gap to its neighbour, all in a single `fill()`, so adjacent sites merge
into a continuous mass. The calyx texture then rides *on* that mass. **Keep this;
the targets below tune it, not replace it.**

### 4.1 The mass-over-foliage tipping point (at Bud Swell)
Boards #4→#5→#6 show the inversion: at **Bud Set** flowers are discrete pods
(pre-fusion); at **Bud Swell** the colas read as solid columns and **mass visibly
outweighs foliage** — the visual tipping point. Drive it off `devParams.budDev`:
- **`budDev < 0.35` (Bud Set):** blobs do *not* fully fuse — keep gaps so clusters
  read as discrete pods. (`drawFlowerSite` already gates the mass on `g.d > 0.06`;
  keep early reach short.)
- **`budDev ≈ 0.35–0.55` (Bud Swell tipping point):** fusion completes — adjacent
  blobs merge into stacked columns; simultaneously the engine's existing leaf
  shrink kicks in (`leafSize × (1 − 0.4·budDev·f)` in `buildPlant`), so foliage
  recedes as mass grows. This crossover **is** the tipping point — tune both
  curves to cross at `budDev ≈ 0.45`.
- **`budDev > 0.55` (Bud Swell → Harvest):** mass dominates; `colaScale` × late
  `ripe` swell (`lateMass = 1 + ripe·0.2`) makes the apex the climax.

### 4.2 Width curve per cluster
Two width systems, both already present — keep them strain-coherent:
- **Whole-plant (chamber):** per-cluster `cw = baseW · cl.fat · cl.tipTaper ·
  (0.55 + 0.45·d)`; the De-Grape blob radius is `max(podW·1.15, cw·0.5)·(0.62 +
  0.38·d)`. Slim strains (G13 `clusterFat 0.74`, spiral) → slim spear column; fat
  strains (PDP/White Rhino `clusterFat 1.3`) → chunky stacked mass. **Do not let
  the fusion blur this — width must stay strain-recognisable.**
- **Macro (cola):** per-ring `widthCurve = sin(progress^widthExp · π)`, with
  `widthExp = lerp(1.0, 1.3, fatT)` so chunky strains carry the widest point
  **lower** (heavier base) — narrow top, wide centre, tapered base
  (`buildMacro`). `fatT` from `maxBudWidth/budHeight`. Ring count peaks mid
  (1·3·5·8·5·3 style). This is the canonical "real bud" stack.

---

## 5. Node spacing + branch angle numeric guidance (vigor vs stretch)

The single highest-impact silhouette knobs (catalog cheat-sheet: node spacing
strongest at Veg→Preflower; branch angle at Veg + Bud Swell).

### 5.1 Node spacing (internode)
- Engine knob: `Morphology.internode` (0.08 indica … 0.112 sativa) feeds
  `nodeTarget = floor((hN / internode) · nodeDensity · vertStack · flowerPack)`.
- **Vigor (healthy, default):** tight + even. Indica ≈ `0.08`, hybrid ≈ `0.096`.
  Reads as the Veg board's "healthy cadence." Maps to the catalog's `6–40px`
  internode range — **tight ≈ 6–14px equivalent.**
- **Stretch (sativa-native OR light-starved neglect):** long internodes ≈
  `0.112`+ (≈ 28–40px equivalent). For a healthy sativa this is native; for a
  *neglected* plant of any strain, lengthen internode as a **neglect visual
  state**, not the default (catalog #2 study note). Tie stretch animation to the
  existing flip ramp (`hN` lerp toward `0.6·S.stretch` over ~4 weeks in
  `buildPlant`) — sativas explode upward, indicas barely move.
- Per-node jitter (already present): `±0.045` on `f` plus apex tightening
  `stackExp = lerp(1.0, 1.22, vertStack)` — keep so nodes never read perfectly
  even (real plants vary).

### 5.2 Branch angle (from vertical / from stem)
- Engine knob: per-node `tilt` + `spread` (`lowerSpread`, `upperShorten`) in
  `buildPlant`. Canonical range (catalog + whole-plant-architecture §Core):
  **35–90° from the main stem.**
  - **45°** — bushy indica skirt (wide, low canopy).
  - **55–60°** — balanced hybrid candelabra.
  - **75°** — sativa Christmas-tree / spear (branches toward vertical).
  - **90°** — widest splay (rare; flat-canopy / trained look).
- **Vigor vs stretch coupling:** healthy plants hold their angle; under bud weight
  (Bud Swell) laterals **bow** — handled by `budPhysics.branchDroop` (clamped
  **0–12°**) and `colaLean` (top cola **1–5°**). Strong-stem strains (`branch-
  Strength > 1`, e.g. G13 1.2) sag least; weak-stem chunky strains (PDP 0.82,
  White Rhino 0.85) sag most. Never floppy, never cartoonish (hard ceilings in
  `budPhysics.ts`).
- **Lower vs upper:** lower branches splay widest (`spread = lerp(1, lowerSpread,
  low)`), upper tuck in + shorten (`shorten = 1 − upperShorten·f`) — the
  skirt-to-spear taper that gives each strain its profile.

---

## 6. A09 — Ranked Plant Engine priorities (impact-per-effort)

Ranked by **emotional-impact-per-unit-effort** (catalog Part 4). Each item names
its board, its acceptance criteria, and its engine touch-point.

### Priority 1 — Frost density + specular sparkle  ★ biggest awe/effort
- **Why:** the validated money shot (Frost Explosion board #6). Trichome texture
  is the single most ownable visual; "I grew that" lives here. Texture/particle
  problem, not geometry — high payoff, contained scope.
- **Board:** `06_frost_explosion.png` (+ macro insets on #5, #6, #8).
- **Acceptance criteria:**
  1. Frost overlay density scales with `devParams.trich` and per-strain
     `BudDNA.trichomeDensity` (0.7 G13 → 0.97 White Fire OG), visibly blanketing
     calyxes **and** sugar leaves by `trich > 0.7`.
  2. Heads read milky `#eef6ff` in the dominant band, ripe-amber `#d9a441` only at
     `p ≥ 0.9`; sparse specular `#ffffff` glints that catch the pod neon — **never
     wet-plastic** (matte glint, per `chamberCore` `drawPod` comment).
  3. Macro tap/zoom shows individual glandular heads (board #6 inset parity).
  4. At 1920×1080 the chamber cola reads "frosted" without zooming.
- **Detail owner:** `FROST_FIRST_IMPLEMENTATION_GUIDE.md` (frost spec lives there).
- **Engine:** `chamberCore.ts` trichome loop in `drawFlowerSite` + `trichHead()`;
  macro `buildMacro` trich anchoring; `BudDNA.trichomeDensity`.

### Priority 2 — Per-strain fade colour ramp  (cheap "premium" win)
- **Why:** colour = perceived rarity. The cheapest big win after frost — a good
  fade makes any bud look premium (catalog #7 study note). See §3 for the full
  standard.
- **Board:** `07_fade.png` (+ #8 harvest).
- **Acceptance criteria:**
  1. Leaf colour ramps along the shared canon hexes as a function of maturity %
     (§3.6 table), beginning ~55%, edges-inward + lower-leaves-first.
  2. Per-strain bias honoured: never-purple strains (G13, White Rhino) stop at
     amber; purple-capable (PDP, Gelato) reach purple/red.
  3. Purple pools in lower/outer (cool/old) tissue; apex stays warm.
  4. Trichome cloudy→amber shift peaks alongside (§3.5).
- **Engine:** add a maturity term to `drawFan` leaf colour (currently fixed
  `S.hue`); reuse `budColorFor.anthocyanin` for bias and `applyEnvironment-
  ToBudDNA.cool` for the purple-pool signal; gate on `devParams.brown`/`blush`.

### Priority 3 — Bud stacking fusion + mass-over-foliage tipping  ("real bud" read)
- **Why:** turns "grapes" into "real bud." Mostly **done** (De-Grape PR #25); the
  remaining work is tuning the fusion/leaf-shrink crossover (§4). Moderate effort.
- **Boards:** `04_budset.png` (pre-fusion) → `05_budswell.png` (fusion + tipping)
  → `08_harvest.png` (maximal mass).
- **Acceptance criteria:**
  1. Bud Set reads as discrete pods (`budDev < 0.35`); Bud Swell reads as fused
     stacked columns (`budDev > 0.45`).
  2. The mass-vs-foliage crossover lands at `budDev ≈ 0.45` (mass grows as leaves
     shrink) — board #5 "mass outweighs foliage" parity.
  3. Width stays strain-recognisable through fusion (G13 slim spear vs. White
     Rhino chunky column).
- **Engine:** `drawFlowerSite` De-Grape blob curve; `buildPlant` leaf-shrink term
  (`1 − 0.4·budDev·f`) + `colaScale`/`lateMass`.

> **70–80% bar:** hitting **Priorities 1–3** (frost + fade + stacking) likely
> clears the emotional-impact bar on its own — they are the awe, the premium read,
> and the "real bud." 4–6 below make it read as *alive* (polish/legibility).

### Priority 4 — Leaf-posture health signal  (care-loop legibility)
- **Why:** health reads through posture, not just colour. Praying leaves = healthy
  is the strongest "happy plant" signal (board #2); droop/claw = neglect. Makes
  the care loop legible at a glance.
- **Board:** `02_veg.png` (praying fans).
- **Acceptance criteria:**
  1. Healthy (low stress) → fan leaflets tilt **up** (praying); high stress →
     droop/claw downward.
  2. Driven by the existing climate model (`climateModel.stress`, the `claw` arg
     already threaded into `drawFan`), not a new system.
  3. Reads at 1920×1080 chamber distance without inspection.
- **Detail owner:** `LEAF_POSTURE_HEALTH_GUIDE.md` (posture spec lives there).
- **Engine:** `chamberCore.ts` `drawFan(size, n, topBoost, claw)` — extend `claw`
  to a signed pray↔droop term keyed off `climateModel`/health.

### Priority 5 — Node-spacing vigor curve  (silhouette honesty)
- **Why:** node spacing is the highest-impact silhouette knob (catalog
  cheat-sheet); tight+even = vigor, long = stretch/neglect. Cheap (numbers).
- **Boards:** `02_veg.png` (vigor cadence) + `03_preflower.png` (top stretch).
- **Acceptance criteria:**
  1. Healthy spacing reads tight/even per §5.1; neglect/light-starve lengthens
     internodes as a distinct *visual state*.
  2. Sativa stretch animates over ~4 weeks at flip (not a snap), indicas barely
     move — driven by `S.stretch`.
- **Engine:** `morphologyFor.internode`, `buildPlant` `nodeTarget` + `hN` stretch
  ramp; couple a stretch penalty to low light / high `stress`.

### Priority 6 — Branch angle  (candelabra fullness + bud-weight bow)
- **Why:** candelabra fullness and the bud-weight bow that sells "heavy flowers."
  Largely **done** (`budPhysics.ts` PR #26); remaining work is per-strain angle
  tuning (§5.2). Lowest marginal impact.
- **Boards:** `02_veg.png` (45° skirt) + `05_budswell.png` (bowing laterals).
- **Acceptance criteria:**
  1. Per-strain branch angle in the 35–90° range matches §2 archetypes
     (indica ~45°, sativa ~75°).
  2. Laterals bow 0–12° and the cola leans 1–5° under load, scaled by
     `branchStrength`/`budWeightMul` (hard ceilings honoured).
- **Engine:** `buildPlant` `tilt`/`spread`; `budPhysics.branchDroop`/`colaLean`.

### Priority ranking summary

| # | Priority | Board | Effort | Status | Clears 70–80%? |
|---|---|---|---|---|---|
| 1 | Frost density + sparkle | #6 | Med | partial | **core** |
| 2 | Per-strain fade ramp | #7 | Low | new (leaves) | **core** |
| 3 | Bud stacking fusion + tipping | #5 | Low–Med | mostly done | **core** |
| 4 | Leaf-posture health | #2 | Low | hook exists | polish |
| 5 | Node-spacing vigor | #2/#3 | Low | exists | polish |
| 6 | Branch angle | #2/#5 | Low | mostly done | polish |

---

## 7. Implementation hooks (names only — no code here)

The targets above extend these **existing** functions/params:

- **Silhouette/morphology:** `morphologyFor(indicaRatio)`, `silhouetteFor(slug,
  indicaRatio)`, the `INDICA`/`SATIVA` archetype constants, `patternForRatio` —
  all in `morphology.ts` / `strainVisuals.ts`. Autoflower = a new overlay applied
  to these outputs (not a new ratio point).
- **Whole-plant geometry:** `chamberCore.ts` `buildPlant()` (`nodeTarget`, `hN`
  stretch ramp, per-node `tilt`/`spread`/`f`/`low`, leaf-shrink term,
  `colaScale`/`lateMass`).
- **Fade (A04):** `drawFan()` leaf colour (add a maturity ramp term); reuse
  `budColorFor.anthocyanin` (bias) + `applyEnvironmentToBudDNA.cool` (purple pool)
  + `devParams.brown`/`blush`/`ripe` (timing). Encode the ramp as canon-hex stops,
  **not images** (catalog Part 3).
- **Bud mass (De-Grape):** `drawFlowerSite()` mass-blob loop; `clusterDev`,
  per-cluster `cw`/`fat`/`tipTaper`; macro `buildMacro` `widthCurve`/`widthExp`.
- **Frost:** `drawFlowerSite` trichome loop + `trichHead()`; macro trich anchoring;
  `BudDNA.trichomeDensity` (+ env `highlightBoost`). Spec: `FROST_FIRST_*`.
- **Posture:** `drawFan(size, n, topBoost, claw)` `claw` arg ← `climateModel`/
  health. Spec: `LEAF_POSTURE_HEALTH_GUIDE.md`.
- **Physics:** `budPhysics.ts` `branchDroop` / `colaLean` / `airflowWeighting`
  (ceilings `MAX_BRANCH_DROOP` 12°, `MAX_COLA_LEAN` 5°).
- **Determinism (hard rule):** all generation seeds from `seedForPlant(id)` via
  `mulberry32` — never `Math.random()` in generation (`procedural-generation.md`).

---

## 8. Cross-references

- **`FROST_FIRST_IMPLEMENTATION_GUIDE.md`** — the canonical home for frost detail
  (Priority 1): trichome density curve, specular sparkle, macro payoff. §3.5 and
  Priority 1 here are the *summary*; that guide is authoritative for frost.
- **`LEAF_POSTURE_HEALTH_GUIDE.md`** — the canonical home for leaf posture detail
  (Priority 4): pray↔droop/claw mapping to health/stress. Priority 4 here is the
  summary; that guide is authoritative for posture.
- **`CANONICAL_VISUAL_LANGUAGE_V1.md`** — the house style this spec adopts (canon
  hexes, neon-on-charcoal `#060a14`, Inter/JetBrains Mono, "frost is the
  signature," "colour = rarity," "health reads through posture").
- **Source knowledge:** `knowledge/whole-plant-architecture.md`,
  `macro-bud-rules.md`, `botanical-bible.md`, `strain-dna.md`,
  `plant-anatomy-reference.md`, `procedural-generation.md`.
- **Boards:** `docs/research/visual-reference/plants/01_seedling.png …
  08_harvest.png` + the catalog
  `docs/research/visual-reference/2026-06-14-growpod-visual-reference-catalog.md`.

---

*Directive ART-002 · ART-A03+A04+A09 · concept/study target only — no engine
changes were made. Tune the knobs named above; do not hand-place shapes.*
