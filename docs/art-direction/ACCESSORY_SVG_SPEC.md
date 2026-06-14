# ACCESSORY SVG SPEC — GrowPod Empire Hardware Line

> **Directive:** ART-002 · **Worker:** ART-A06 (also folds in **ART-A07** — visual→gameplay mapping)
> **Status:** CONCEPT-ONLY art direction. No code, no renderer changes. Documentation deliverable.
> **Date:** 2026-06-14 · **Viewport priority:** desktop-first — 1920×1080 primary, laptop 1440×900 / 1366×768; mobile secondary.

---

## 1. Header — the AI→code translation premise

The eight accessory boards in `docs/research/visual-reference/accessories/` (`01_fan.png` …
`08_premium_accessories.png`) are **AI-generated concept art** (Higgsfield Nano Banana). They define
the *mood, silhouette, palette, and neon language* — they are **not** the shipped asset.

The **fan A/B test settled the pipeline**: AI key-art is for hero/marketing; the shipped in-game
asset is **deterministic, hand-built SVG**. The proof is `my-video/index.html` — a HyperFrames
composition that rebuilt board `01_fan.png` as a pure SVG turnaround (front + 3/4 + side) with
`<defs>` gradients, a blue-LED glow filter, and a seek-safe GSAP spin. Pixel-identical at any zoom,
recolorable per upgrade tier, no raster bloat.

**This spec translates each concept board into that SVG register.** Every accessory below is
specified as SVG primitives, shared `<defs>`, LED/neon accents, gameplay-driven states, and exact
desktop pixel dimensions — so an implementer can build the shipped asset without re-deriving it from
the picture.

Rule of the line (see §4): **accessory art maps 1:1 to a real sim mechanic.** We never draw a
control the game does not actually simulate.

---

## 2. Shared SVG construction kit

Every accessory reuses one `<defs>` block so the hardware reads as a single product family. These
are lifted and generalized from the proven fan in `my-video/index.html` (lines 54–73).

### 2.1 Canon constants (verbatim, do not drift)

| Token | Hex | Use |
|---|---|---|
| `bg` | `#060a14` | scene background (radial to `#02040a` at edges) |
| `panel` | `#0b1424` | card / inset panel fill |
| neon blue | `#34a8ff` | primary LED ring + edge glow |
| neon blue bright | `#bfe4ff` | inner hairline highlight / specular core |
| violet | `#9b5cff` | secondary accent (UV, holo, premium) |
| brushed metal mid | `#2c3a52` | body shells, ring metal mid-stop |
| Rarity / upgrade-tier: Common | `#4faf5a` | tier-0 LED color |
| Rarity / upgrade-tier: Rare | `#34a8ff` | tier-1 LED color (== house blue) |
| Rarity / upgrade-tier: Epic | `#b45cff` | tier-2 LED color |
| Rarity / upgrade-tier: Legendary | `#f5c542` | tier-3 LED color (gold trim) |

Fonts: **Inter** (UI/labels), **JetBrains Mono** (readouts/values).

### 2.2 The common `<defs>` (reuse in every accessory `<svg>`)

```svg
<defs>
  <!-- Brushed-metal shell, vertical light-to-dark (from #ringMetal, my-video L60-64) -->
  <linearGradient id="metal" x1="0" y1="-1" x2="0" y2="1">
    <stop offset="0%"  stop-color="#5b6f8f"/>
    <stop offset="50%" stop-color="#2c3a52"/>
    <stop offset="100%" stop-color="#141d2e"/>
  </linearGradient>

  <!-- Recessed hub / dark core (from #hub, my-video L55-59) -->
  <radialGradient id="hub" cx="50%" cy="40%" r="70%">
    <stop offset="0%"  stop-color="#2a3b57"/>
    <stop offset="60%" stop-color="#16223a"/>
    <stop offset="100%" stop-color="#0a1120"/>
  </radialGradient>

  <!-- Blue LED glow filter (from #glow, my-video L69-72) -->
  <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="9" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>

  <!-- Tier LED tint — swap stop-color per upgrade tier (see §2.4) -->
  <linearGradient id="ledTier" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"  stop-color="#bfe4ff"/>
    <stop offset="100%" stop-color="#34a8ff"/>
  </linearGradient>

  <!-- Violet emitter (UV / holo / premium) -->
  <linearGradient id="violet" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"  stop-color="#cdb0ff"/>
    <stop offset="100%" stop-color="#9b5cff"/>
  </linearGradient>
</defs>
```

### 2.3 Recurring motifs (the family DNA)

1. **The neon edge** — every shell has a thin (`stroke-width` 2) `#bfe4ff` hairline *over* a thicker
   (6–7) `#34a8ff` stroke carrying `filter="url(#glow)"`. This is the fan ring at
   `my-video/index.html` L76–78 and is the single most "GrowPod" signal. Apply it to ring, bar, or
   reservoir outline.
2. **The ring** — a circle/ellipse of `url(#metal)` (`stroke-width` 16–18) is the load-bearing motif
   (fan ring, scanner lens, premium sensor pucks).
3. **The recessed dark core** — `#070c16` fill behind active elements so the glow has contrast.
4. **The mono readout** — small JetBrains-Mono value chips (`#bfe4ff` on `#0b1424`) for any
   accessory that reports a number (CO₂ ppm, nutrient EC, water %).

### 2.4 Tier recolor (the one knob)

Upgrade tier is expressed **only** by recoloring the LED layer — the metal shell never changes.
Implementers swap the `#ledTier` / glow-stroke color:

| Tier | LED color | Extra |
|---|---|---|
| Common | `#4faf5a` | green LED, no aura |
| Rare | `#34a8ff` | house-blue LED (default look) |
| Epic | `#b45cff` | violet LED + faint second glow ring |
| Legendary | `#f5c542` | gold LED + gold hairline replaces `#bfe4ff`, subtle particle aura |

### 2.5 viewBox / sizing conventions (desktop UI)

- **Centered-origin viewBox** like the fan: `viewBox="-W/2 -H/2 W H"` so rotation/scale animate about
  (0,0). The fan front uses `viewBox="-210 -210 420 420"` at `width=420 height=420`.
- **Two canonical views per accessory:** **FRONT** (square-ish, used as the inventory/shop icon) and
  **3/4 ANGLE** (wider, used as the hero in the upgrade detail panel). Side view optional — only the
  fan needs it. This mirrors the `.views` row in `my-video/index.html` L50–167.
- **Icon grid sizes (desktop):** shop/inventory tile **96×96** and **160×160**; detail-panel hero
  **320×320** (3/4 view rendered at up to **440×420** like the fan iso). All from one source SVG —
  SVG scales losslessly, so author at the hero size and downscale.
- **Stroke widths are authored for the hero size**; when used at 96px the glow `stdDeviation` should
  drop to ~5 to avoid a blurry blob (expose as a CSS var or filter swap).

---

## 3. Per-accessory spec (all 8)

Each entry: **board read → SVG build → LED accent → states → desktop px.**

---

### 3.1 Fan — `01_fan.png` (REFERENCE IMPLEMENTATION — already built)

- **Board read:** two axial-fan modules (front + 3/4) in dark cylindrical barrels; a thick brushed
  ring; a **glowing blue LED ring** just inside the rim; ~7 swept turbine blades; a central hub with
  a tiny blue eye. Cyan rim-light on the barrel side. This is the house-style anchor.
- **SVG build (shipped, see `my-video/index.html` L52–166):**
  - Outer ring: `<circle r=200 stroke=url(#metal) stroke-width=18>`.
  - LED ring: `<circle r=178 stroke=#34a8ff stroke-width=7 filter=url(#glow)>` + `<circle r=178
    stroke=#bfe4ff stroke-width=2>`.
  - Dark face: `<circle r=168 fill=#070c16>`.
  - Blades: one `<path id=bladeProto>` reused via `<use transform="rotate(n*51.4)">` ×7, fill
    `url(#blade)` (blue→navy linear).
  - Hub: `<circle r=46 fill=url(#hub)>` + glowing `<circle r=14 stroke=#34a8ff filter=url(#glow)>` +
    `#bfe4ff` core dot.
  - 3/4 view: same parts on ellipses (`scale(1,0.6)` on the blade group); side view = rounded rect
    barrel with a vertical LED bar + grille lines.
- **LED accent:** the inner ring + hub eye.
- **States:** *off* = LED ring at `opacity 0.25`, no glow, blades static; *active* = full glow, blades
  spin (§5.1), speed scales with the pod airflow setting. *Tiers* recolor the ring per §2.4.
- **Desktop px:** front `420×420` (icon down to 96/160); 3/4 `440×420` hero.

---

### 3.2 CO₂ system — `02_co2.png`

- **Board read:** an upright **canister/regulator unit**, dark rounded-rectangle body with a small
  **graph display** at the top (a green sensor readout), magenta+blue neon edge piping down both
  sides, a circular diffuser port low-center, and a **white vapor plume** escaping the base. 3/4 view
  shows the same with a heavier blue rim-light.
- **SVG build:**
  - Body: `<rect x=-70 y=-150 width=140 height=300 rx=24 fill=url(#metal) stroke=#2c3a52>`.
  - Top readout: `<rect>` chip filled `#0b1424` with a tiny polyline graph in `#4faf5a` (JetBrains
    Mono "1480 ppm" label).
  - Side neon piping: two `<rect width=8>` bars, blue glow left, violet glow right (`filter=url(#glow)`).
  - Diffuser port: `<circle r=30 fill=url(#hub)>` + glowing inner `<circle r=12 filter=url(#glow)>`.
  - Vapor: a `<g id=co2-vapor>` of 3–4 soft `<ellipse>`/`<path>` blobs, white at low opacity, with a
    `feGaussianBlur` — animated per §5.2.
- **LED accent:** the side piping + the diffuser port (port brightness scales with CO₂ ppm).
- **States:** *off* = no vapor, port dim, readout `--- ppm`; *active* = vapor rising, port glow scales
  with ppm (mirrors chamber rule: "CO₂ canister glow scales with CO₂"). *Tiers* recolor port/piping.
- **Desktop px:** front `260×360`; 3/4 hero `360×360`.

---

### 3.3 Water canister — `03_water_canister.png`

- **Board read:** a faceted **translucent reservoir** (octagonal/beveled glass) glowing with a
  bright blue liquid **level** inside; **cyan + violet neon edge** tracing every facet seam; a dark
  pedestal base with a round glowing button. Both views near-identical (front + slight rotate).
- **SVG build:**
  - Tank body: `<path>` octagon, fill a semi-transparent blue (`#34a8ff` at `fill-opacity 0.12`),
    seams stroked `#34a8ff` with `#9b5cff` accent on alternate edges.
  - **Liquid:** an inner `<rect id=water-level>` clipped to the tank `<clipPath>`; top edge is the
    waterline (`#bfe4ff` hairline) — its `y`/height is the player's water value 0–100 (§5.3).
  - Liquid gradient: `url(#ledTier)` vertical, brighter at the meniscus.
  - Base: rounded-rect `url(#metal)` pedestal + a glowing pump button `<circle filter=url(#glow)>`.
- **LED accent:** the facet seams + the waterline glow.
- **States:** *off/empty* = liquid height ≈ 0, button dim; *active* = liquid fills to the plant's water
  level, gentle surface wobble (§5.3); *low-water* = waterline tints orange (`#f59b34`) below ~45 (the
  drought threshold in `environment-rules.md`). *Tiers* recolor liquid + seams.
- **Desktop px:** front `260×360`; 3/4 hero `340×360`.

---

### 3.4 Nutrient injector — `04_nutrient_injector.png`

- **Board read:** a **dosing head** carrying a rack of **4 colored vials** (red/green/blue/amber) on
  top, a wide **LCD readout** across the front (EC / dose values in mono), a precision **needle
  injector** pointing down, hexagonal blue neon framing in the scene. 3/4 view rotates the rack.
- **SVG build:**
  - Body: rounded-rect `url(#metal)`, broad and short.
  - Vial rack: 4 `<rect rx=4>` capsules across the top, each a different fill
    (`#e0556a`/`#4faf5a`/`#34a8ff`/`#f5c542`), each with a `#bfe4ff` highlight stripe — these ARE the
    rarity quartet, reinforcing the palette.
  - LCD: `<rect fill=#0b1424>` with JetBrains-Mono lines ("EC 1.8 · pH 6.1").
  - Injector needle: thin `<path>` + a glowing droplet `<circle filter=url(#glow)>` at the tip that
    pulses on a dose (§5.4).
- **LED accent:** the vials + the LCD backlight + the needle droplet.
- **States:** *off* = LCD blank, vials dim; *active* = LCD live, droplet pulses per feed event; *idle*
  = LCD on, no pulse. *Tiers* recolor the LCD frame + needle glow (vials keep their 4 colors).
- **Desktop px:** front `300×300`; 3/4 hero `360×320`.

---

### 3.5 UV module — `05_uv_module.png`

- **Board read:** a **slim spectrum bar** — dark rounded-rectangle housing with a single bright
  **violet emitter strip** running its length, small end caps with tiny indicator dots; cyan/violet
  neon frame. 3/4 view shows the bar tilted with a strong violet floor-glow.
- **SVG build:**
  - Housing: long `<rect rx=18 fill=url(#metal) stroke=#2c3a52>`.
  - Emitter: inner `<rect id=uv-strip fill=url(#violet) filter=url(#glow)>` + a `#cdb0ff` hairline
    core — this is the only primarily-violet accessory.
  - End caps: small `<rect>` blocks with `#34a8ff` indicator `<circle>`s (intensity dots).
  - Optional cast: a faint violet `<ellipse>` "spill" beneath in the 3/4 hero only.
- **LED accent:** the violet emitter strip (its opacity/length-lit scales with UV/light setting).
- **States:** *off* = strip `opacity 0.2`; *active* = full violet glow; *high-UV* = add a second wider
  glow ring (ties to the `light > 600` trichome/specular boost in `environment-rules.md`). *Tiers*
  recolor the **indicator dots only** (the emitter stays violet — it's a UV device).
- **Desktop px:** front `360×140` (it's a bar — wider than tall); 3/4 hero `420×220`.

---

### 3.6 Dry rack — `06_dry_rack.png`

- **Board read:** a **cylindrical tiered mesh drying rack** — three stacked circular mesh shelves in
  a wire cage, **blue neon edge lighting** on each tier ring, a domed top with a small fan/vent, hung
  buds implied on the mesh. Both views near-identical (slight rotate). Cooler, calmer than the active
  hardware — it's a *post-harvest* object.
- **SVG build:**
  - Cage: 4 vertical `<line>` posts + 3 `<ellipse>` tier rings (perspective squash `ry≈0.4·rx`).
  - Each tier ring: `url(#metal)` base + a `#34a8ff` glow ellipse (`filter=url(#glow)`).
  - Mesh: per tier a faint cross-hatch `<path>`/`<pattern>` at low opacity inside the ellipse.
  - Top dome: `<ellipse fill=url(#hub)>` + a tiny vent `<circle>`.
  - Drying buds (optional): small muted-green `<ellipse>` clusters on each tier (no frost — these are
    *curing*, color is muted, see §4 curing mapping).
- **LED accent:** the three tier rings (steady, slow breathing — not energetic).
- **States:** *empty* = rings dim, no buds; *curing* = rings lit + bud clusters present, slow breathe;
  *cure-complete* = a single bright ring pulse / gold edge if Legendary tier. *Tiers* recolor tier rings.
- **Desktop px:** front `300×340`; 3/4 hero `360×360`.

---

### 3.7 Genetic scanner — `07_genetic_scanner.png`

- **Board read:** two forms — a **handheld scanner module** (rounded block with a bright blue scan
  pad) and a **pistol-grip DNA scanner** — both projecting a **holographic DNA double-helix** above
  in cyan/violet, inside a thin neon ring "containment" circle. The most overtly sci-fi/genetics piece.
- **SVG build:**
  - Body: `url(#metal)` rounded block (or pistol-grip `<path>` for the alt form).
  - Scan pad: `<rect fill=url(#hub)>` + a bright `#34a8ff` glowing center `<circle filter=url(#glow)>`.
  - **Holo helix:** a `<g id=dna-helix>` of two sine `<path>` strands (one `#34a8ff`, one `#9b5cff`)
    with `<line>` "rungs" between them, all under `filter=url(#glow)` at reduced opacity — animated
    per §5.5.
  - Containment ring: `<circle stroke=#34a8ff stroke-width=2 opacity=0.5>` around the helix.
- **LED accent:** the scan pad + the holo helix.
- **States:** *off* = no helix, pad dim; *scanning* = helix rotates, pad bright; *result/locked* = helix
  freezes + a rarity-colored ring flashes the scanned strain's rarity (this is the literal
  genetics→color hook). *Tiers* recolor the containment ring + pad.
- **Desktop px:** front (module) `300×300`; 3/4 hero (pistol) `360×320`. Helix occupies the top ~40%.

---

### 3.8 Premium accessories set — `08_premium_accessories.png`

- **Board read:** a **deluxe tray/automation hub** — a glowing platform tile holding a cluster of
  **gold-trimmed sensor pucks**, a central **holographic emitter** throwing a violet/magenta bloom,
  and a small upright module. Reads as a *bundle / top-tier* — the Legendary register.
- **SVG build:**
  - Platform: `<path>` parallelogram tile, edge-lit `#f5c542` (gold) replacing the usual `#bfe4ff`
    hairline — the tier tell.
  - Sensor pucks: grid of small `<circle>`s, each `url(#hub)` with a gold ring + a colored center dot
    (mix of the rarity quartet).
  - Holo emitter: a `<g id=holo-bloom>` cone `<path>` (violet→transparent gradient) + a floating
    rarity-colored `<polygon>` gem, all glowing.
  - Side module: a mini version of the metal shell with a gold neon edge.
- **LED accent:** **gold** edge-lighting throughout + the violet holo bloom (the premium signal =
  gold trim per the catalog's "premium = gold trim" rule).
- **States:** *off* = gold dimmed to bronze, no bloom; *active* = full gold + holo bloom rotating;
  this set is **inherently Legendary-tier** — its "tiers" are cosmetic prestige variants, not the
  Common→Legendary ladder.
- **Desktop px:** hero only `440×360` (it's a showcase bundle, shown large in the store).

---

## 4. ART-A07 — Gameplay mapping (visual systems → sim mechanics)

**The rule (load-bearing):** *every accessory's art must map 1:1 to a real, simulated mechanic.* If
the sim does not model it, we do not draw a control for it. Concept boards may *imply* more; the
shipped asset only visualizes what `simulation/` + the chamber actually compute. This keeps art and
systems honest (catalog §Part 4.6) and is downstream of the CLAUDE.md invariant that the **sim is
server-authoritative** and the **DB is the truth** — art is a read-only front-end on real state.

### 4.1 Mapping table

| Accessory | Sim system | Real mechanic it visualizes | Source of truth |
|---|---|---|---|
| **Fan** | Climate (airflow) | Blade speed = airflow; high airflow → windburn streaks; affects sway | `grow-tent-rules.md` (chamber fan, "blade speed scales with airflow"); `climateModel()` in `web/src/lib/chamber/morphology.ts` |
| **CO₂ system** | Climate (CO₂) | Port/vapor glow = CO₂ ppm; optimal band ~800–1500; drives a growth hint | `grow-tent-rules.md` ("CO₂ canister, glow scales with CO₂"); optimal bands `balance.yaml` |
| **UV module** | Climate (light/UV spectrum) | Emitter intensity = light/PPFD setting; high light → trichome + specular boost | `environment-rules.md` (`light > ~600` → trichomeDensity/highlightBoost; `> ~850` → foxtail/topStretch); PPFD band ~300–900 |
| **Water canister** | Feeding (hydration) | Liquid level = plant water 0–100; low (<~45) = drought tint | `environment-rules.md` (`water` input, drought at `< ~45`); chamber water level feeds `applyEnvironmentToBudDNA` |
| **Nutrient injector** | Feeding (nutrients / EC·pH) | LCD = EC/pH; dose pulse = feed event; over/under maps to deficiency/burn | `simulation/conditions.py` (`NUTRIENT_DEFICIENT`, `NUTRIENT_BURN`); pH band ~6.0–7.0 (`balance.yaml`) |
| **Dry rack** | Post-harvest (drying / curing) | Tiers hold curing buds; ring pulse = cure progress/complete; muted (no frost) | `simulation/curing.py` (`cure_progress`, compute-on-read quality curve, optimal window) |
| **Genetic scanner** | Genetics (genome / breeding / rarity) | Helix = scanned genome; result ring flashes strain rarity | `genetics-system.md`; `src/growpodempire/genetics/` (`cross`, `genome_from_traits`); rarity from `strains.yaml` |
| **Premium set** | Cross-cutting / automation + research tier | Top-tier cosmetic; gold = Legendary; automation hub | autocare/research register (`services/autocare_service.py`, `services/research_service.py`); cosmetic prestige, not a new mechanic |

### 4.2 Honesty notes per accessory

- **Fan** is explicitly a *visual-only FAN* in the chamber CLIMATE tab (it drives sway/windburn
  visuals, not a persisted field) — so its art animates but must not imply a sixth saved climate
  value. The five persisted fields are temp/humidity/CO₂/light/pH.
- **CO₂ / UV / Water** map to *persisted* climate/water values — their states are allowed to read
  the real saved value and the optimal-band tint.
- **Dry rack** must read *calm and muted* — curing is a slow quality process (`curing.py`), not an
  energetic live grow. No frost sparkle here; frost belongs to the *plant* at Frost Explosion, not
  the rack.
- **Nutrient injector**'s deficiency/burn states must only fire where `conditions.py` actually grades
  them — don't invent a nutrient mechanic the sim doesn't expose.
- **Genetic scanner**'s rarity flash must pull the *real* rarity from the genome, never a decorative
  random color (provably-fair breeding is a core invariant).
- **Premium set** is the one accessory that does **not** add a mechanic — it is a cosmetic/prestige
  bundle. Its art may not promise automation the research tree hasn't shipped; gate any
  automation-implying state behind the actual `autocare`/`research` capability.

---

## 5. Animation spec — deterministic & seek-safe

**Hard rule (from `my-video/CLAUDE.md` + HyperFrames):** all motion is driven by **composition time**
on a paused, registered `window.__timelines` GSAP timeline. **No `Math.random()`, no `Date.now()`, no
network.** Seeking to time *t* must always produce the identical frame (the fan proves this:
`my-video/index.html` L172–180). In-game, the same animations run as CSS/transform loops keyed off a
deterministic clock or the sim's compute-on-read value — never wall-clock entropy.

| # | Accessory | Animation | Deterministic recipe |
|---|---|---|---|
| 5.1 | **Fan** | blade spin | `gsap.to("#blades-front",{rotation:360,ease:"none",duration:D})`; angular speed = `f(airflow)`. Continuous, loops seamlessly (360°). Exactly the proven fan tween. |
| 5.2 | **CO₂** | vapor plume | each blob in `#co2-vapor` tweens `y -= rise`, `opacity 0.6→0`, `scale 0.8→1.3`, **staggered** by index (not random) on a repeating timeline; phase from `t`. |
| 5.3 | **Water** | level + surface wobble | `#water-level` height set from the *value* (water 0–100) — not animated by entropy; a tiny `±2px` meniscus `y` sine wobble keyed on `t` for "liquid" feel. |
| 5.4 | **Nutrient** | injector pulse | needle droplet `<circle>` scales `1→1.6→1` + glow opacity pulse, one cycle per dose; repeat interval is fixed, phase from `t`. LCD digits step on integer frames. |
| 5.5 | **Scanner** | DNA helix | the two sine strands shift phase with `t` to read as a rotating double-helix (translate the rung set + redraw via a CSS var on the path), `ease:"none"`, looping; result state freezes the timeline at a fixed seek. |
| (5.6) | **UV** | emitter shimmer | subtle `opacity 0.85↔1` breathe on `#uv-strip`, sine on `t`; high-UV adds a second glow ring (state, not motion). |
| (5.7) | **Dry rack** | tier breathe | slow `opacity` breathe on the three tier rings, phase-offset per tier by index; cure-complete = one fixed-position bright pulse. |
| (5.8) | **Premium** | holo bloom | `#holo-bloom` cone slow `rotation` + the floating gem bobs on a sine of `t`; gold edge steady. |

**Seek-safety checklist (per asset):** (a) timeline `paused:true` + registered on `window.__timelines`;
(b) every animated value is a pure function of `t` or of a sim value, never RNG/clock; (c) loops close
on themselves (no drift); (d) state changes (off/active/tier) are discrete attribute swaps, not
time-dependent — so a tier recolor is identical at every `t`.

---

## 6. Acceptance criteria & cross-references

### 6.1 Acceptance criteria (Definition of Done for a shipped accessory)

1. **Built as SVG**, not raster — single source file, FRONT + 3/4 views, scales 96→440px losslessly.
2. **Reuses the §2.2 shared `<defs>`** (`metal`, `hub`, `glow`, `ledTier`, `violet`) — no bespoke
   gradients that fork the family look.
3. **Uses only canon hexes** from §2.1 / the shared canon constants. No off-palette colors.
4. **Tier recolor works by swapping the LED layer only** (§2.4) — metal shell unchanged across
   Common/Rare/Epic/Legendary.
5. **States implemented:** off / active (+ accessory-specific states in §3); each state is a discrete,
   seek-stable attribute set.
6. **Animation is deterministic & seek-safe** per §5 (no `Math.random`/`Date.now`; registered timeline).
7. **Maps 1:1 to a real sim mechanic** per §4 — no state visualizes a mechanic the sim doesn't model;
   values read from the authoritative sim/DB, not invented.
8. **Desktop-first:** authored at hero size, verified legible at 1920×1080 and at laptop 1440×900 /
   1366×768 (icon tiles 96/160 stay readable; glow `stdDeviation` reduced for small sizes).
9. **Matches its concept board's silhouette & neon read** (§3) without tracing pixels.

### 6.2 Cross-references

- **`docs/art-direction/CANONICAL_VISUAL_LANGUAGE_V1.md`** (sibling deliverable) — the house style
  this spec inherits: neon-on-charcoal, the blue LED ring motif, brushed dark metal, Inter/JetBrains
  Mono. Any change to the shared `<defs>` or canon constants must be reconciled there first.
- **`docs/art-direction/RARITY_COLOR_SYSTEM.md`** (sibling deliverable) — the authoritative tier
  palette (Common `#4faf5a` / Rare `#34a8ff` / Epic `#b45cff` / Legendary `#f5c542`). §2.4's tier
  recolor and the scanner's rarity flash (§3.7) must use that doc's values; if it diverges from §2.1
  here, that doc wins.
- **Grounding sources:** `my-video/index.html` (proven SVG fan pattern), the 8 boards in
  `docs/research/visual-reference/accessories/`, `docs/research/visual-reference/2026-06-14-growpod-visual-reference-catalog.md`,
  and the sim mechanics in `knowledge/{environment-rules,grow-tent-rules,genetics-system}.md` +
  `src/growpodempire/simulation/`.

---

*Concept/art-direction only. No code, renderer, or balance changes are made by this document.*
