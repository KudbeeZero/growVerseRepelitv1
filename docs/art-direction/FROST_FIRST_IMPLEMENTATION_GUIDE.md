# Frost-First Implementation Guide

> **Directive:** ART-002 · **Worker:** ART-A02 · **Date:** 2026-06-14
> **Status:** CONCEPT / SPEC ONLY — no renderer changes were made by this document.
> **Scope:** Desktop-first (validate at 1920×1080, then laptop 1440×900 and 1366×768; mobile secondary).
> **Cross-refs:** `PLANT_ENGINE_VISUAL_TARGETS.md`, `CANONICAL_VISUAL_LANGUAGE_V1.md` (sibling ART-002 docs in this folder).

This guide specifies the **frost layer** — trichome density, specular catch, and a deterministic
sparkle system — for the GrowPod Empire plant renderer. It is a target and a math/parameter
contract, **not** code. The Plant Engine team owns implementation against the real pipeline named
in §8.

---

## 0. Hard determinism rule (read first)

The renderer is **deterministic and seek-safe**. The same `(seed, day, stage, strain, frameTime)`
must always produce the same pixels, on any machine, forwards or backwards on the timeline.

- **NO `Math.random()`** anywhere in the frost path. The current `spawnDust()` helper in
  `chamberCore.ts` uses `Math.random()` — frost must **not** copy that pattern. Use the existing
  seeded PRNG `mulberry32` (already imported in `chamberCore.ts`) at **build time**, and a pure
  hash of `(stableId, position)` for any per-particle value.
- **NO `Date.now()` / `performance.now()` as an animation clock.** Twinkle phase is driven by the
  **composition time `tt`** that is already passed into `draw(tt)` / `drawMacro(tt)`. `tt` is the
  seek-safe timeline coordinate; scrubbing back to the same `tt` must show the same sparkle frame.
  (Note: `morphology.ts` `ageDays()` defaults to `Date.now()` — that is the *grow clock*, not the
  *render clock*. Frost animation must read `tt`, never wall-clock.)
- **NO network.** All frost data is derived locally from strain DNA + stage.
- Particle **positions, counts, sizes, and phase offsets** are computed once per build (seeded),
  cached, and only re-derived on a coarse DNA-signature change — mirroring the existing
  `buildMacro()` / macro-bokeh caching policy in `macro-bud-rules.md`. Per-frame work is limited to
  evaluating a cheap twinkle function of `tt`.

---

## 1. Why frost is the signature

Frost is the **Frost-First Doctrine**: the single most ownable, most-screenshotted visual in the
game, and the beat that validated the whole art department (board `06_frost_explosion.png`).

- **Biggest emotional-impact-per-effort.** The visual-reference catalog ranks "Frost density +
  specular sparkle" as **#1** of five Plant Engine wins — "biggest awe per unit work." Trichomes
  are a *texture/particle* problem, not geometry, so they layer on top of the cola the engine
  already builds.
- **The 70–80% target is measured against the frost board.** The department's stated goal is to
  capture "70–80% of the emotional impact" of the validated flowering reference. That bar is judged
  against `06_frost_explosion.png` specifically (the milky blanket + the macro mushroom-head inset),
  and the amber shift against `08_harvest.png`.
- **Color = rarity** is the #2 win (fade), and frost is what makes that color read as *premium
  resin* rather than just a tint. Get frost right and the rest of the premium read comes cheaply.

This is concept-only direction; the doctrine here governs *what* the frost should be, while §8 maps
it onto the real functions.

---

## 2. Trichome density model

Define a scalar **`frostDensity ∈ [0,1]`** per cola, the master input to every frost effect below:

```
frostDensity(stage, strain) = clamp( stageCurve(stage, budDev) × strainMul × envMul , 0, 1 )
```

### 2a. Stage curve (drives the ramp)

The renderer already exposes `P.trich` from `morphology.ts devParams()`:
`trich = smooth(clamp((day - 48) / 18, 0, 1))` — trichomes ramp day 48→66, eased with smoothstep.
**Use `P.trich` as `stageCurve`.** Concrete values across the named beats (nominal ~60-day cycle):

| Stage | Day (nominal) | `P.budDev` | `stageCurve` (= `P.trich`) |
|---|---|---|---|
| Bud Set | ~34 | 0.00 | **0.00** |
| Bud Swell | ~44 | 0.32 | **0.00** (first frost just starting at day 48) |
| Bud Swell (late) | ~50 | 0.45 | **0.11** |
| Frost Explosion ★ | ~58 | 0.70 | **0.55** |
| Frost Explosion (peak) | ~62 | 0.81 | **0.78** |
| Fade | ~66 | 0.90 | **1.00** |
| Harvest | ~70+ | 1.00 | **1.00** |

> Note: the design intent (catalog) says "first frost on calyxes" appears at **Bud Swell**. The
> current `(day-48)/18` ramp starts frost slightly *after* visible bud swell. **Recommended tuning
> (data-driven, no code change in spirit):** shift the trichome window earlier to `(day-44)/22` so a
> faint frost (~0.05–0.10) is visible during Bud Swell, matching board intent. This is a one-line
> constant in `devParams()`; flag it to the Plant Engine team, do not silently change.

### 2b. Per-strain multiplier (`strainMul`)

Already authored as **`BudDNA.trichomeDensity`** in `budDna.ts`. It is the strain frost trait —
use it verbatim as `strainMul`. Authored values (for reference):

| Strain | `trichomeDensity` | Read |
|---|---|---|
| G13 | 0.70 | medium frost (slim green spear) |
| Purple Diddy Punch | 0.85 | heavy frost, purple |
| Gelato | 0.85 | heavy frost, colorful |
| White Rhino | 0.88 | very frosty indica |
| Wedding Cake | 0.93 | heavy frost, tight pack |
| Animal Mints | 0.95 | extremely frosty |
| White Fire OG | 0.97 | max frost (the "white" IS frost) |
| Derived default | `0.6 + anthocyanin×0.25` | |

### 2c. Environmental multiplier (`envMul`)

Already modeled in `applyEnvironmentToBudDNA()`: high UV adds to density
(`trichomeDensity + uv×0.25`, clamped). Treat env as a modifier *to `strainMul`* (it already
mutates `trichomeDensity`), so `envMul` is folded in for free. **High UV → frostier** is canon
(botanical-bible §11). No additional env term is needed at the frost layer.

### 2d. Where trichomes appear (placement priority)

Strict botanical ordering — resin glands are densest on flower tissue, absent on fan leaves:

1. **Calyx surface — primary.** Heaviest coverage; trichomes anchor to a host calyx and reveal with
   it (matches `macro-bud-rules.md`: "anchored to a host calyx and only drawn once that calyx is
   revealed"). Coverage scales with `frostDensity`.
2. **Sugar leaves — secondary, ~50% of calyx density.** The small leaves protruding from the cola
   carry frost but less than calyxes. Use a 0.5× multiplier on per-host count for `sugar` hosts.
3. **Fan leaves — NONE.** Large fan leaves stay clean green (`drawFan()`); never sprinkle frost on
   them. This keeps the contrast that makes the frosted cola pop (board 06: clean dark-green fan
   leaves framing a white-dusted cola).

Density gradient on the cola: keep front-depth calyxes frostier than back-depth (the existing
`grow < 0.04 + t.depth*0.35` reveal gate already biases this). Top/apex of the cola reads frostiest
in board 06 — bias `frostDensity` up by **+0.08** for calyxes in the top 30% of `budH`.

---

## 3. Specular highlights (the wet/crystalline read)

Frost must read **crystalline** — tiny glass beads catching light — without reading as "wet
plastic." The current macro path deliberately uses *matte* dust (normal blend, cool cream-grey)
and avoids a white specular (see `drawPod()` and the macro frost comments). The Frost-First
doctrine **adds a sparse, controlled specular pass back in** for the heads only, kept tiny so it
sparkles rather than glosses.

### 3a. Two light sources to honor

The chamber lighting is established in `drawChamberShell()`:
- **Cool neon ring light** (the halo, `#cfeeff` stroke + `rgba(140,214,244,…)` glow) — comes from
  *above*. This is the dominant rim/key for the cola.
- A subtler warm fill is implied by the warm key in the canon palette.

Trichome heads should catch **both**: a cool-edged glint biased toward the top (ring light) and an
occasional warm micro-glint on the most ripe heads (amber). This dual catch is what sells "real
crystal."

### 3b. Highlight color & structure

Per sparkling head (only the subset selected in §4, not every trichome):
- **Core:** `#ffffff` (specular white), radius `r_core = 0.30 × headR`.
- **Cool edge / halo:** `#bfe4ff` (canon bright neon blue), radius `r_halo = 1.6 × headR`, low alpha.
- The core sits offset toward the **upper-left** of the head (`-0.3·headR, -0.3·headR`) to imply the
  ring light from above — consistent with the existing gradient origin in `drawPod()`.
- Milky head body underneath stays `#eef6ff` (canon trichome milky); ripe heads tint toward
  `#d9a441` (canon ripe-amber) per §5.

### 3c. Bloom / threshold policy

- **Threshold:** only heads with `frostDensity ≥ 0.45` **and** that fall in the sparkle-selected
  subset (§4) get a specular core. Below that, frost is matte dust only (the current look). This
  keeps early flower subtle and reserves the "explosion" sparkle for stage 6+.
- **Bloom:** the cool `#bfe4ff` halo *is* the bloom — a single soft radial, no multi-pass post
  blur. Draw the halo with `globalCompositeOperation = "lighter"` (additive) **only** for the halo
  ring, then reset to `"source-over"` for the white core and everything else. Additive is confined
  to the sparkle halo so it never washes the whole cola white.
- **Cap bloom intensity** with `frostDensity`: halo alpha `= 0.12 + 0.18 × frostDensity` (max
  ~0.30). Never let summed additive halos blow out — see the per-frame budget in §6.

### 3d. The "wet/crystalline" read, concretely

Crystalline (target) = many tiny, hard, *individual* glints that twinkle independently.
Wet/plastic (avoid) = a few large soft sheens that move with the surface. Therefore: **many small
specular cores (≤1.5 px at macro), high count, low individual alpha, independent twinkle phase.**
The sparkle field in §4 is what delivers this.

---

## 4. Sparkle particle spec — DETERMINISTIC

Sparkles are a **sub-selection of trichome heads** that twinkle. They are not new geometry — they
reuse the trichome positions already built in `buildMacro()` (`bud.trichs[]`) and in the chamber
`buildFlowerSite()` (`cl.tris[]`). This guarantees they sit *on* real resin heads.

### 4a. Seeding (stable, position-hashed)

Build-time selection uses the existing seeded PRNG; per-frame twinkle uses a pure position hash —
no `Math.random`, no wall clock.

```
stableId   = seed × 5077 + 7          // same constant buildMacro() already uses for the macro PRNG
                                       // (chamber view: seed × 7919 + 13, as buildPlant uses)
hash(t)    = fract( sin( (t.x × 12.9898 + t.y × 78.233 + stableId × 0.000_137) ) × 43758.5453 )
phaseOff   = hash(t) × TAU            // deterministic per-particle phase, stable across seeks
isSparkle  = hash2(t) < sparkleFrac   // hash2 = hash with a +1.0 salt on stableId
```

`hash()` is a pure function of the particle's stored position + the stable id — **identical every
frame and every seek**. (Equivalent: precompute `phaseOff` once at build time into each
`MacroTrich`/`tri` record and read it back; either is seek-safe. Precompute is preferred for perf.)

### 4b. Twinkle (driven by composition time `tt`)

```
twinkle(t, tt) = 0.5 + 0.5 × sin( tt × ω + phaseOff(t) )
headAlpha      = baseAlpha × (0.55 + 0.45 × twinkle)   // never fully off → frost stays present
specAlpha      = specBase  × twinkle^2                 // sharp glint pulse on the specular core
```

- **`ω` (twinkle angular speed):** `2.2 rad/s` → period ≈ **2.85 s** per particle. With random
  `phaseOff` the field shimmers asynchronously. (If `tt` is in seconds, use `ω` directly; if `tt`
  is a normalized 0..1 loop, scale `ω` to give ~1 cycle / 2.85 s of real playback.)
- Seek-safe: `twinkle` depends only on `(tt, phaseOff)`; scrubbing to the same `tt` reproduces the
  exact frame. No state accumulation.
- Honor `motionOK` (already in `ChamberCoreOpts`): if `motionOK` is false (reduced-motion), freeze
  `twinkle` at its `tt=0` value — frost still renders, just static.

### 4c. Sparkle fraction & particle counts

`sparkleFrac` = fraction of trichome heads that get the specular twinkle (the rest are matte dust):

```
sparkleFrac = clamp( 0.10 + 0.45 × frostDensity , 0, 0.50 )   // 10% early → 50% at peak
```

Total trichome head count is already `nT = round(calyxes.length × trichomeDensity × 2.4)`
(`buildMacro`). The catalog wants a **dense milky blanket**, so for the frost layer raise the macro
multiplier target and cap it:

| Density level (`frostDensity`) | Trichome heads (macro, ~120 calyxes) | Sparkle subset |
|---|---|---|
| 0.0–0.10 (Bud Swell) | ~30–60 | 0 (no specular below 0.45) |
| 0.45–0.55 (Frost Explosion) | ~320 | ~32% → ~100 sparkles |
| 0.78 (Frost peak) | ~520 | ~45% → ~235 sparkles |
| 1.0 (Fade/Harvest) | ~620 (hard cap) | 50% → ~310 sparkles |

> Recommendation: raise the macro head multiplier from `×2.4` toward `×3.5–4.0` at peak density so
> the cola reads as a **blanket** not scattered specks (board 06). Hard-cap absolute head count per
> cola at **MACRO_TRICH_MAX = 650** (see §6). Chamber-view per-site stays low (it already builds
> only `round(6 × lush²)` tris per cluster — leave as-is; sparkle only the brightest ~2 per cluster).

### 4d. Size range

- **Matte dust head radius (macro):** `0.8–1.6 px` (current `t.r × max(0.8, budW×0.014)` is fine).
- **Specular core (macro):** `0.5–1.5 px` — must stay sub-pixel-ish so it twinkles like crystal,
  never a blob.
- **Cool halo (macro):** `1.6 × headR` (so ~1.3–2.4 px).
- **Chamber view:** roughly half these sizes; frost there is suggestion, not detail (see LOD §4e).

### 4e. LOD plan (chamber distance vs macro view)

The renderer has exactly two views (`ChamberView = "chamber" | "macro"`). Map LOD to them, plus a
laptop-GPU degrade tier:

| View / tier | Frost representation | Sparkle | Per-cola head budget |
|---|---|---|---|
| **Macro (zoomed)** — the money shot | Full per-calyx heads + dust + sparkle + haze | Full (§4c) | ≤ 650 |
| **Chamber (distance)** — full plant | Per-site matte frost patch (current `cl.tris`) + a **frost-haze overlay** per cola; specular limited to top cola + a few heads | ≤ 2 sparkles / cluster, cola gets ~8 | ≤ 6 heads/cluster (current) |
| **Chamber, many plants / laptop** | Drop per-head dust; replace with the single radial **frost-haze gradient** per cola (already exists at `P.trich > 0.25`), tinted by `frostDensity` | none | 0 heads, 1 haze |

Distance rule: when a cola's on-screen `budW < ~40 px`, skip individual heads entirely and render
only the haze — individual trichomes are sub-pixel and waste fill. This mirrors the existing
`detailed = podW > 1.8` gate in `drawFlowerSite()`; extend the same idea to the frost pass.

---

## 5. Frost progression by stage

Maps each named beat to the frost layer's full parameter set. Tints use canon constants; the
amber-vs-milky ratio is the share of heads rendered in ripe-amber vs milky white.

| Stage | `frostDensity` | Trichome heads (macro) | Sparkles | Amber : Milky | Head/haze tint |
|---|---|---|---|---|---|
| **Bud Set** | 0.00 | 0 | 0 | — | none (clean green calyxes) |
| **Bud Swell** | 0.05–0.11 | 30–60 | 0 | 0 : 100 | milky `#eef6ff`, very faint, calyx tips only |
| **Frost Explosion ★** | 0.55 | ~320 | ~100 | 5 : 95 | milky blanket `#eef6ff` + `#ffffff` cores, `#bfe4ff` halo |
| **Frost Explosion (peak)** | 0.78 | ~520 | ~235 | 10 : 90 | dense milky, sparkle catches neon ring strongly |
| **Fade** | 1.00 | ~600 | ~290 | 35 : 65 | milky base, amber heads rising; warm micro-glints appear |
| **Harvest** | 1.00 | ~620 (cap) | ~310 | 55 : 45 | majority amber `#d9a441` heads over milky base — "ripe" read |

**Amber rule (drives the harvest read, board 08).** The amber share is gated on **ripeness +
browning**, which the renderer already tracks as `P.ripe` (`(day-40)/22`) and `P.brown`
(`(day-58)/12`). The current head-color function uses maturity `clamp(P.trich - tr.mat×0.4, 0,1)`
and flips to amber only above 0.9. **Recommended frost-layer formula:**

```
amberShare = clamp( 0.05 + P.ripe × 0.35 + P.brown × 0.25 , 0, 0.6 )
```

So amber stays ≤5% through Frost Explosion (milky-dominant, board 06), then climbs to ~55% by
Harvest (board 08's brown-amber-tipped heads). Per-head choice is deterministic: head is amber if
`per-head-hash < amberShare` (stable, position-seeded — same head is amber every frame/seek).

Milky head: `#eef6ff` body, `#ffffff` specular, `#bfe4ff` halo.
Amber head: body lerps `#eef6ff → #d9a441` by `(amberShare-applies)`, specular warms to `#ffe9c2`,
halo drops the blue. Match the canon ripe-amber `#d9a441` exactly for the body endpoint.

---

## 6. Performance budget at 1920×1080

Target: **60 fps** at 1920×1080 on a mid desktop GPU; **≥45 fps** on the laptop tiers
(1440×900, 1366×768). Frost is the most fill-hungry layer, so it is the one that degrades first.

### 6a. Draw cost target

- Macro view is **one cola, full screen** — the expensive case. Budget the frost pass at **≤2.5 ms
  per frame** (≈15% of a 16.6 ms frame), leaving headroom for calyx geometry + pistils.
- Per-frame frost work must be **evaluate-only**: read precomputed positions, compute `twinkle(tt)`,
  fill. **No allocation, no PRNG, no gradient creation in the loop** (build gradients once, like
  `macroBokeh`). This is mandatory, not optional — it is what keeps it 60 fps.
- Specular halos use additive blend (`"lighter"`) — additive fills are costlier; cap halo count
  (= sparkle count) hard.

### 6b. Particle caps (hard ceilings)

| Constant | Value | Rationale |
|---|---|---|
| `MACRO_TRICH_MAX` | **650** | total heads drawn per cola in macro |
| `MACRO_SPARKLE_MAX` | **320** | specular+halo heads (the additive cost driver) |
| `CHAMBER_TRICH_PER_CLUSTER` | **6** | unchanged from current `round(6×lush²)` |
| `CHAMBER_SPARKLE_PER_CLUSTER` | **2** | only the 2 frontmost heads twinkle |
| `CHAMBER_COLA_SPARKLE` | **8** | top cola gets a few extra for the hero read |

When more heads *would* be generated than the cap, **stride-sample** the precomputed list
deterministically (`step = ceil(count / cap)`), never random-drop — keeps it seek-stable.

### 6c. Fallbacks for laptop GPUs

Detect by frame-time, not by GPU string. Maintain a rolling avg frame time; if it exceeds budget,
step **down** one tier (and back up when it recovers, with hysteresis so it doesn't flap):

1. **Tier 0 (full):** all of §4–§5.
2. **Tier 1:** halve `sparkleFrac`; drop the `#bfe4ff` additive halo (keep only the white core).
   This removes the additive-fill cost, the biggest GPU sink.
3. **Tier 2:** drop specular cores entirely → matte dust only (the current look) + haze.
4. **Tier 3 (floor):** drop per-head dust → single **frost-haze radial** per cola only (the
   existing `P.trich > 0.25` gradient), tinted by `frostDensity`. Always renders; lowest cost.

Tier floor must still read as "frosty" — the haze gradient alone communicates resin at distance.
Respect `prefers-reduced-motion` independently (freeze twinkle at `tt=0`, §4b) regardless of tier.

---

## 7. Acceptance criteria

Validate at **1920×1080** (primary), then 1440×900 and 1366×768. Compare side-by-side with the
boards.

### Against `06_frost_explosion.png` (Frost Explosion ★)
- [ ] **Dense milky blanket on calyxes:** at `frostDensity ≥ 0.55` the cola surface reads as a
      continuous white/silver veil over green, not scattered dots. Heads ≥ ~320 on the macro cola.
- [ ] **Macro mushroom-head trichomes:** in macro view, the inset-equivalent shows individual
      capitate heads (bulbous head on a short clear stalk), milky/cloudy — matching the board's
      glandular-head inset. Heads are *short* glands coating the surface (frost), not tall spikes.
- [ ] **Sparkle catches neon:** specular cores `#ffffff` with a `#bfe4ff` cool halo are visible and
      **twinkle asynchronously**; the catch reads as the cool ring light from above. Scrub the
      timeline back to a prior `tt` → identical sparkle frame (determinism check).
- [ ] **Fan leaves clean:** dark-green fan leaves frame the cola with **no** frost on them.
- [ ] **Milky-dominant:** amber share ≤ 5% here (no premature ripeness).

### Against `08_harvest.png` (Harvest / amber shift)
- [ ] **Amber shift present:** ~50–55% of heads render in ripe-amber `#d9a441` over the milky base;
      the cola reads "ripe/brown-tipped," matching board 08's warmer, browner resin.
- [ ] **Warm micro-glints:** the most-mature heads catch a warm (`#ffe9c2`) glint instead of pure
      cool — the dual-light read.
- [ ] **Frost still dense:** density stays at 1.0 (frost does not *thin* at harvest, it *warms*).
- [ ] **Pistils browned** alongside (already handled by `P.brown` in the pistil color path) — frost
      amber and pistil brown should rise together for a coherent ripeness read.

### Determinism / safety (must pass for all stages)
- [ ] No `Math.random()` or `Date.now()`/`performance.now()` in the frost path; grep-clean.
- [ ] Same `(seed, day, stage, strain, tt)` → identical render across two machines.
- [ ] Reduced-motion: frost renders, twinkle frozen.
- [ ] Performance: 60 fps macro @ 1920×1080 mid-desktop; ≥45 fps laptop tiers; auto-degrades.

---

## 8. Integration notes for the Plant Engine team

Specify-don't-write. The frost layer attaches to these **real** functions/files (do not rename;
extend in place):

- **`web/src/lib/chamber/chamberCore.ts`**
  - `buildMacro()` — already builds `MacroTrich[]` (`bud.trichs`) seeded via `mulberry32(seed×5077+7)`.
    Extend each `MacroTrich` record with a precomputed `phaseOff` and an `isSparkle`/`isAmber` flag
    (both seeded here, at build time — not per frame). Raise `nT` multiplier toward the §4c target and
    apply `MACRO_TRICH_MAX`.
  - `drawMacro()` frost block (~lines 1455–1487) — currently matte dust + haze. This is where the
    sparkle/specular pass (§3–§4) is added, reading `tt` for twinkle. Keep the existing haze as the
    Tier-3 fallback.
  - `trichHead(p)` (~line 214) — the maturity→color function. Replace the hard 0.9 amber cutoff with
    the `amberShare` model in §5; keep `#eef6ff`/`#ffffff`/`#d9a441` canon stops.
  - `drawPod()` (~line 166) — leave the matte calyx body as-is; specular lives on heads, not bodies.
  - `buildFlowerSite()` / `drawFlowerSite()` (chamber view) — `cl.tris[]` already exists; apply the
    chamber LOD caps (§4e, §6b) and sparkle only the frontmost heads + top cola.
  - **Do NOT** copy the `spawnDust()` `Math.random()` pattern into frost.
- **`web/src/lib/chamber/budDna.ts`** — `BudDNA.trichomeDensity` is `strainMul` (§2b);
  `applyEnvironmentToBudDNA()` already folds UV into it (§2c). No schema change required for frost,
  though `highlightBoost` (already present, UV-driven) may scale `specBase` if desired.
- **`web/src/lib/chamber/morphology.ts`** — `devParams().trich` is `stageCurve` (§2a); `ripe`/`brown`
  drive `amberShare` (§5). The optional earlier-frost tuning (`(day-44)/22`) is here.
- **`web/src/lib/chamber/budPhysics.ts`** — no frost dependency; listed for completeness (frost does
  not affect droop/lean).

Constants (`MACRO_TRICH_MAX`, `MACRO_SPARKLE_MAX`, twinkle `ω`, `sparkleFrac` coefficients) belong
near the other tuning surfaces — keep them grouped and named so a balance pass has one place to turn
knobs (mirroring `budPhysics.ts`'s tuning-surface convention).

---

## 9. Cross-references

- **`PLANT_ENGINE_VISUAL_TARGETS.md`** (sibling, this folder) — the per-stage silhouette/morphology
  targets; this guide is the *frost* layer that rides on top of those targets. Defer to it for cola
  shape, stacking, and stage geometry.
- **`CANONICAL_VISUAL_LANGUAGE_V1.md`** (sibling, this folder) — the house palette/typography. Frost
  uses the shared canon verbatim: bg `#060a14`; neon blue `#34a8ff` / bright `#bfe4ff`; plant greens
  `#8fd49a`/`#4faf5a`/`#2f7d3a`; trichome milky `#eef6ff`, specular `#ffffff`, ripe-amber `#d9a441`;
  fade ramp green `#4faf5a` → yellow `#e3c84a` → amber `#d98a3a` → magenta `#c2487a` → purple
  `#7a3fae` → red `#b23a3a`; Inter / JetBrains Mono.
- Source-of-truth knowledge: `knowledge/botanical-bible.md`, `knowledge/macro-bud-rules.md`,
  `knowledge/plant-anatomy-reference.md`. Where this guide and botany disagree, **botany wins**.
- Study target: `docs/research/visual-reference/2026-06-14-growpod-visual-reference-catalog.md`
  (stage 6 + the 70–80% ranking) and boards `plants/06_frost_explosion.png`, `plants/08_harvest.png`.
