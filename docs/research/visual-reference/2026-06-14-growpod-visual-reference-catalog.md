# GrowPod Empire — Visual Reference Catalog (Plant Engine + Asset Teams)

> **Department:** Plant Reference & Asset Generation (Higgsfield AI Art Department)
> **Date:** 2026-06-14 · **Status:** RESEARCH & CONCEPT ONLY — no production code, no renderer changes.
> **Mission:** Feed the Plant Engine and Asset teams a studied visual target so procedural
> plants can eventually capture **70–80% of the emotional impact** of the flowering reference clip
> that validated this direction.

This catalog is a *study target*, not a spec. Every board is an AI-generated reference (Higgsfield
Nano Banana Pro for plants, Nano Banana for accessories). Treat them as mood/morphology guides —
the canonical truth still lives in the sim + `strain_knowledge.yaml`. Where a board contradicts
botany or the sim, botany wins.

---

## How to use this catalog

- **Plant Engine team:** read each stage's *Study notes* — they translate the picture into the
  parameters the procedural plant already exposes (node spacing, branch angle, leaf posture, bud
  stacking, trichome density, color). The boards show the *target silhouette and texture* each
  growth stage should hit.
- **Asset team:** the *SVG/game-art recreation* section lists which boards are worth rebuilding as
  deterministic code assets (the cheap, consistent, shippable layer) vs. which stay as AI key-art.
- **Both:** the *Canonical visual language* section is the proposed house style — adopt it so plants
  and accessories read as one universe.

Images live alongside this doc:
- `visual-reference/plants/01_seedling.png … 08_harvest.png`
- `visual-reference/accessories/01_fan.png … 08_premium_accessories.png`

---

## Part 1 — Plant reference boards by growth stage

The eight stages mirror the sim's lifecycle and the Director's named beats. Each board is a
full side-profile + a macro detail inset.

### 1. Seedling
- **Silhouette:** tiny, two rounded cotyledons + first 1–2 nodes of serrated true leaves.
- **Node spacing:** N/A yet (1–2 internodes, very short).
- **Branch angles:** none — single stem.
- **Leaf posture:** cotyledons flat/horizontal; first true leaves reaching up, 3→5 fingers.
- **Color:** tender pale-to-bright green, slightly translucent.
- **Emotional read:** fragility + potential. The "it begins" beat.
- **Study notes (Plant Engine):** this is the floor state — height ≈ near-zero, one growth axis,
  no lateral branching. Keep it *small* on screen; the contrast against later stages is the payoff.

### 2. Veg (Vegetative)
- **Silhouette:** bushy, broad, leafy; classic Christmas-tree fill starting.
- **Node spacing:** moderate and even — the canonical "healthy vigor" cadence.
- **Branch angles:** laterals push out at ~45° from the main stem; symmetric, opposite phyllotaxy.
- **Leaf posture:** large 7–9 finger fan leaves, fingers spread wide and *praying* (tips up) when
  healthy — this is the single strongest "happy plant" signal. Droop = the unhealthy tell.
- **Color:** deep saturated green.
- **Emotional read:** growth, momentum, reward for care.
- **Study notes:** node spacing here is the lever for "healthy vs stretched." Tight + even = vigor;
  long internodes = light-starved stretch (use as a *neglect* visual state, not default).

### 3. Preflower
- **Silhouette:** slight vertical stretch ("the stretch"), still leafy, first sex signs.
- **Node spacing:** elongating at the top as the plant transitions.
- **Branch angles:** upper laterals tighten toward vertical to form cola positions.
- **Leaf posture:** still praying; tiny white pistils appear at nodes.
- **Color:** green, with the very first calyx structures forming.
- **Emotional read:** anticipation — "something is coming."
- **Study notes:** the transition tell is *pistils at nodes* + top stretch. Small change, big
  narrative weight; worth a distinct silhouette from Veg even if subtle.

### 4. Bud Set
- **Silhouette:** bud sites visible at every node and the apex; colas defined but small.
- **Node spacing:** locked; flower clusters now read at each node.
- **Branch angles:** laterals carry their own bud tips → candelabra read.
- **Leaf posture:** fan leaves begin tucking *behind* emerging flowers.
- **Bud stacking:** clusters just starting to stack — discrete calyx pods, not yet fused.
- **Color:** green dominant, white pistils prominent.
- **Study notes:** this is where the **bud-stacking model** starts mattering. Reference shows
  discrete clusters that will later fuse — the existing "continuous silhouette behind calyxes"
  approach (PR #25) is the right call; this stage is the *pre-fusion* look.

### 5. Bud Swell
- **Silhouette:** colas thicken into solid columns; plant reads "heavy."
- **Bud stacking:** dense — clusters fuse into stacked masses (the De-Grape target).
- **Branch angles:** laterals may bow slightly under bud weight (ties to bud-weight-physics, #26).
- **Leaf posture:** fan leaves mostly subordinate to flowers; sugar leaves emerging.
- **Trichome density:** ramping — first frost on calyxes.
- **Color:** green with pistils ranging white→cream.
- **Study notes:** silhouette width follows the per-cluster width curve already in the renderer.
  This is the stage where *mass* should visibly outweigh *foliage* — the visual tipping point.

### 6. Frost Explosion ★ (the validated beat)
- **Silhouette:** dense colas, but the story is the **surface**, not the shape.
- **Trichome density:** peak — milky/cloudy crystalline heads blanketing calyxes + sugar leaves.
- **Texture:** sparkle/specular glints; sugar-frosted read; macro inset shows glandular heads.
- **Color:** green base under a white/silver frost veil; pistils cream→amber starting.
- **Emotional read:** **this is the money shot** — the clip that validated the whole department.
  Awe + "I grew that." The 70–80% target is measured against *this* board.
- **Study notes:** trichomes are a *texture/particle* problem, not geometry. Prioritize: (a) a
  frost overlay density that scales with stage, (b) specular sparkle that catches the pod's neon,
  (c) macro payoff on tap/zoom. Getting frost right buys most of the emotional impact.

### 7. Fade
- **Silhouette:** unchanged mass; the drama is color.
- **Color transitions:** fan leaves fade green→yellow→magenta/purple/red (anthocyanin); a true
  autumn gradient, often from leaf edges inward and lower leaves first.
- **Fade patterns:** purple tends to pool in cooler/older tissue; yellowing reads as nutrients
  drawing back. Per-strain bias (some never purple) — tie to genetics.
- **Trichome density:** cloudy→amber shift.
- **Emotional read:** ripeness, luxury, the "premium" signal. Color = perceived rarity.
- **Study notes:** fade should be a **per-strain color ramp** driven by maturity, not a global tint.
  This is the cheapest big win after frost — a good fade ramp makes any bud look premium.

### 8. Harvest
- **Silhouette:** fat, dense, fully ripe colas; peak heft.
- **Bud stacking:** maximal — solid stacked columns.
- **Trichome density:** mostly cloudy with amber; macro shows ripe glandular heads.
- **Color:** deep green + purple + the fade palette, resin-glossy.
- **Emotional read:** payoff/completion — the harvestable trophy.
- **Study notes:** harvest = Bud Swell mass + Frost peak + Fade color, combined. If the engine nails
  6 and 7, harvest is mostly composition. This is the screenshot players will share.

### Cross-stage parameter cheat-sheet (for the Plant Engine)
| Parameter | Drives | Strongest at |
|---|---|---|
| **Node spacing** | vigor vs. stretch read | Veg → Preflower |
| **Branch angle** | candelabra fullness, bud-weight bow | Veg, Bud Swell |
| **Leaf posture (pray/droop)** | health signal #1 | Veg |
| **Bud stacking (fusion)** | "real bud" vs. "grapes" | Bud Set → Harvest |
| **Trichome density (texture)** | awe / the money shot | Frost Explosion |
| **Color transition (ramp)** | ripeness / premium read | Fade → Harvest |

---

## Part 2 — Accessory concept boards

Sci-fi grow-pod upgrades, blue/purple neon house style, front + 3/4 views. Concept-tier
(Nano Banana, 1 credit each) — these are *ideation*, not final art.

1. **Fan** — circulation module, glowing blue LED ring (also the SVG/HyperFrames test subject).
2. **CO₂ system** — canister + regulator + diffuser vapor.
3. **Water canister** — translucent reservoir with glowing level indicator.
4. **Nutrient injector** — dosing unit with colored vials + precision injector.
5. **UV module** — slim spectrum/UV bar with violet emitter strip.
6. **Dry rack** — tiered mesh drying rack with neon edge lighting.
7. **Genetic scanner** — handheld DNA scanner with holographic helix readout.
8. **Premium accessories** — deluxe set (holo emitter, gold-trim sensors, automation hub).

These map directly onto existing/планned systems: climate (fan, CO₂, UV), feeding (water, nutrient
injector), post-harvest (dry rack), and genetics (scanner) — i.e. the accessory line is a visual
front-end for mechanics the sim already models, which keeps art and systems honest.

---

## Part 3 — Recommended assets to recreate in SVG/game art

The fan A/B (Higgsfield AI vs. HyperFrames code) showed the split: **AI for hero/key-art,
deterministic code for shipped UI.** Applying that here:

**Recreate as SVG/code (cheap, consistent, shippable):**
- All **accessory icons** (fan, CO₂, water, nutrient, UV, dry rack, scanner) — geometric, benefit
  from pixel-identical repetition and per-tier recoloring. The HyperFrames fan proves this is viable.
- **Stage silhouettes** (Seedling → Harvest) — the *shape/architecture* layer is procedural already;
  use the boards to tune node spacing / branch angle / stacking curves, not to trace pixels.
- **Fade color ramps** — encode as per-strain gradient stops, not images.

**Keep as AI-generated key-art (don't trace to code):**
- **Frost Explosion / Harvest hero shots** — trichome texture is a particle/shader problem; AI
  key-art is the marketing/loading-screen layer, while the engine chases the *in-game* 70–80%.
- **Store/marketing boards, strain reveals, App Store imagery.**

**Hybrid:**
- **Trichome frost** — author as a procedural sparkle/overlay in-engine, but use the macro insets as
  the density + specular target.

---

## Part 4 — Recommendations: canonical GrowPod Empire visual language

1. **One house style, two registers.** *Plants* = photoreal-leaning, botanically honest, warm
   organic greens→fade palette. *Hardware/UI* = sci-fi pod, blue (#34a8ff) + purple neon, brushed
   dark metal, volumetric glow. The plant is the warm hero; the pod is the cool frame around it.
2. **Neon-on-charcoal is the brand.** Dark charcoal/near-black backgrounds (#060a14) with a blue
   LED ring as the recurring motif (pod, fan, scanner, level indicators). Already consistent across
   the trailer, the fan asset, and these boards — make it canon.
3. **Frost is the signature.** The frost-explosion sparkle is the single most ownable visual.
   Invest there first; it's what players screenshot and what validated this department.
4. **Color = rarity.** Use the fade palette (purple/magenta/amber) as the premium/ripeness signal
   across plants, accessory tiers (premium = gold trim), and UI rarity states.
5. **Health reads through posture, not just color.** Praying leaves = healthy; droop = neglect.
   Bake this into the canonical plant so the care loop is legible at a glance.
6. **Accessories visualize real mechanics.** Keep the upgrade line 1:1 with sim systems (climate /
   feeding / post-harvest / genetics) so the art never promises a mechanic that doesn't exist.

### The 70–80% target, concretely
Ranked by emotional-impact-per-effort for the Plant Engine:
1. **Frost density + specular sparkle** (Frost Explosion) — biggest awe per unit work.
2. **Per-strain fade color ramp** (Fade/Harvest) — cheap "premium" win.
3. **Bud stacking fusion + mass-over-foliage tipping** (Bud Swell/Harvest) — "real bud" read.
4. **Leaf-posture health signal** (Veg) — legibility of the care loop.
5. **Node-spacing vigor curve** (Veg/Preflower) — silhouette honesty.

Hit 1–3 and you likely clear the 70–80% bar; 4–5 are polish that make it read as *alive*.

---

*Generated by the Higgsfield AI Art Department. Concepts only — no engine changes were made.
Adopt, reject, or re-shoot any board; this is a study target, not a contract.*
