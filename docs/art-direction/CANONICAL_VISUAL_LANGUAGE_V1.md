# GrowPod Empire — Canonical Visual Language (V1)

> **Directive:** ART-002 · **Version:** V1 · **Date:** 2026-06-14
> **Status:** RATIFIED CANON — concept-only. No renderer/code changes are made by this document.
> **Worker:** ART-A01 · **Scope:** the house style every ART doc and every shipped surface inherits.

This is the **top art-direction layer**: the constitution. The five principles below and the color
table in §4 are binding. Sibling ART docs (see §9) expand individual systems but may not contradict
these hexes, the two-register split, or the asset-split rule. Where an AI key-art board disagrees
with botany or the sim, **botany and the sim win** (per `knowledge/botanical-bible.md`).

This spec is **desktop-first**. Every value, contrast target, and layout note is validated at
**1920×1080** and re-checked at **1440×900** and **1366×768**. Mobile is supported but secondary;
where a value must change for mobile it is called out explicitly, otherwise desktop governs.

Grounded in: `docs/research/visual-reference/2026-06-14-growpod-visual-reference-catalog.md`;
`knowledge/botanical-bible.md`, `whole-plant-architecture.md`, `environment-rules.md`; the live
renderer (`web/src/lib/chamber/chamberCore.ts`, `strainVisuals.ts`); and the neon-fan asset
(`my-video/index.html`).

---

## 1. The North Star (the 2-second read)

Everything here serves one goal. A player glancing for two seconds must think:

> **"GrowPod Empire — a premium sci-fi genetics laboratory with living collectible cultivars
> and insanely frosty plants."**

Five words carry that read: **premium · sci-fi · laboratory · living/collectible · frosty.**
Each principle in §2 defends one or more of those words. The full success test is in §8.

---

## 2. The Five Ratified Principles

### Principle 1 — Two Registers, One Universe
The frame holds **two visual registers that never blend into mush**: a **WARM register** (the living
plant, the hero) and a **COOL register** (the sci-fi lab pod, hardware, and UI that frames it). The
plant is the warm organic protagonist; the pod is the cool neon stage around it.
*Implementation meaning:* warm and cool are kept on **separate layers** with a hard tonal boundary —
the plant is lit ~3200–3600K warm, the environment ~6500–8000K cool blue. They meet at a **rim**, not
a gradient (see §3). This is already true in the live chamber: the plant uses warm green HSL
(`S.hue`) while the shell, LED ring, and floor halo paint in cyan/blue (`rgba(127,212,240,…)`,
`#34a8ff`). Canonized in §3.

### Principle 2 — Frost-First Doctrine
**Trichome frost is the single most ownable, most screenshotted asset.** It is invested in first and
protected above all else. *Implementation meaning:* on any flowering/harvest hero surface, frost is
the **last thing drawn and the brightest non-light element in the frame** — milky `#eef6ff` heads,
true-white `#ffffff` speculars, ripe-amber `#d9a441` only at the very end of life. Frost coverage
scales with stage and peaks at Frost Explosion. The cool neon rim exists partly **to give the frost
something to sparkle against** — speculars catch the blue ring. Details in `FROST_FIRST_IMPLEMENTATION_GUIDE.md`.

### Principle 3 — Health Through Posture (color is secondary)
Plant health reads through **silhouette and leaf posture first, color second**. Praying leaves
(fingertips up, ~+15–35° from horizontal) = healthy; droop/claw (tips down) = neglect.
*Implementation meaning:* never communicate "sick" with a single recolor when posture can carry it.
The renderer already encodes this (`claw`, `branchDroop`, condition `bodyAnim: "droop" | "wilt-hard"`).
Color shifts (yellowing, dark greens under drought) are a **reinforcing second signal**, never the
sole one. This keeps health legible at a glance even before color is parsed. See
`LEAF_POSTURE_HEALTH_GUIDE.md`.

### Principle 4 — Color = Rarity
Hue is the **rarity language**, applied consistently across plants, accessory tiers, UI chrome, and
card frames. The ladder is fixed:
**Common = green `#4faf5a` · Rare = blue `#34a8ff` · Epic = purple/pink `#b45cff` (alt `#ff6ad5`) ·
Legendary = gold `#f5c542`.**
*Implementation meaning:* a rarity color owns the glow, the frame stroke, and the accent — it is never
spent on unrelated decoration. The premium-accessories board already shows this (gold-trim deluxe tier
vs. blue/violet standard tier). Note the deliberate overlap: Rare-blue **is** the brand neon `#34a8ff`,
which is intentional — blue reads as "lab-grade / verified." Full mapping in `RARITY_COLOR_SYSTEM.md`.

### Principle 5 — Asset Split (AI vs. Code-SVG)
Two production pipelines, cleanly divided so neither is misused:
- **AI-generated key-art** (Higgsfield/Nano Banana lineage): **marketing, loading screens, splash,
  trailers, hero strain renders, App Store imagery.** Trichome texture is a particle/shader problem;
  AI owns the painterly money shots.
- **Code / SVG (deterministic)**: **live plants, growth-stage silhouettes, accessory icons, genetics
  visuals, and chamber animations.** Anything the player sees *in the running game* is procedural,
  pixel-consistent, and per-tier recolorable.

*Implementation meaning:* the in-engine plant chases **70–80% of the emotional impact** of the AI
Frost-Explosion board; it does not trace it. AI art is the aspiration and the marketing layer; code
is the shipped layer. The HyperFrames fan (`my-video/index.html`) proves the SVG accessory path; see
`ACCESSORY_SVG_SPEC.md` and `PLANT_ENGINE_VISUAL_TARGETS.md`.

---

## 3. The Two-Register System (in depth)

The whole house style is the controlled collision of two registers in one frame.

### WARM register — the hero plant
- **Subject:** the living plant (whole-plant view) and the macro bud.
- **Color temperature:** ~**3200–3600K** key light. Greens are warm and saturated:
  seedling pale `#8fd49a` → healthy vibrant `#4faf5a` → mature deep `#2f7d3a`; fade ramp pushes into
  amber/magenta/purple (§4).
- **Feel:** photoreal-leaning, botanically honest, organic, tactile. Matte surfaces (real flower
  scatters light — the renderer deliberately avoids wet-plastic speculars on calyxes; the *only*
  specular allowed is on trichome frost).
- **Saturation/contrast:** mid-to-high saturation, soft internal shadows. The plant is the warmest,
  most chromatically rich object in any frame.

### COOL register — the sci-fi lab frame
- **Subject:** the pod shell, LED ring, floor halo, accessories, HUD/UI chrome, background.
- **Color temperature:** ~**6500–8000K**. Blue neon `#34a8ff` (bright tint `#bfe4ff`) is primary;
  violet `#9b5cff` is the secondary accent (UV, Epic tier, holographic readouts).
- **Feel:** brushed dark metal, volumetric glow, glass, holographics. The pod is precise, engineered,
  cold — a **laboratory**, not a greenhouse.
- **Background:** deep charcoal. Canonical backdrop is the radial vignette from the fan asset:
  `radial-gradient(120% 120% at 50% 30%, #0b1424 0%, #060a14 55%, #02040a 100%)` — panel `#0b1424`,
  field `#060a14`, vignette floor `#02040a`.

### How they coexist in one frame
1. **The plant is the warm-lit hero; the cool neon is the environment around it.** Center mass = warm.
   Periphery (ring, shell, floor, HUD) = cool.
2. **Vignette pulls the eye in.** The `#060a14 → #02040a` darkening at the edges frames the warm
   center automatically.
3. **The blue LED ring is the recurring motif** — it appears as the grow-light halo, the fan ring,
   the genetic-scanner bezel, level indicators, and accessory tier glows. It is the brand's signature
   shape (§6).

### Rim / edge rules — never lose the plant in the neon
This is the load-bearing rule of the whole register system. The plant must **read as separate from**
the cool field behind it, at all three desktop resolutions.
- **Cool rim light:** the plant carries a thin cool rim (`#34a8ff` at ~25–45% alpha, or `#bfe4ff` for
  the brightest catch) along the edge facing the neon environment. This is a **rim**, ≤ ~3–4 px wide at
  1920×1080 — an edge, never a fill. It both separates the plant and lets frost speculars fire.
- **Warm core / cool edge:** body interior stays warm; only the silhouette edge goes cool. Never tint
  the plant's interior blue — that collapses the two registers into one and kills the "living" read.
- **Minimum separation contrast:** the plant's silhouette must hold **≥ 3:1 luminance contrast**
  against the immediately-adjacent background. If the bud sits over the brightest part of the halo,
  push a darker contact shadow / vignette behind it so the edge survives.
- **No neon spill onto matte plant surfaces:** blue glow may bloom in the air (haze) and on frost, but
  must not wash the leaf/calyx bodies — they stay warm and matte.

---

## 4. Official Color Palette

All hexes below are **canon**. Every ART doc shares these exact values; do not invent alternates.
`R` = register (W warm / C cool / N neutral). Format note: greens are easiest to reason about in HSL
in code (`S.hue`, `calyxHue`), but the canonical reference is the hex.

### Backgrounds & structure (COOL / NEUTRAL)
| Token | Hex | R | Usage | Do / Don't |
|---|---|---|---|---|
| `bg/charcoal` | `#060a14` | N | Default app/scene field | Do use as the base everywhere. Don't go pure black (#000) — it kills the neon bloom. |
| `bg/panel` | `#0b1424` | C | Cards, HUD panels, vignette top | Do use for raised surfaces. Don't use for the plant's contact shadow. |
| `bg/vignette` | `#02040a` | N | Outer vignette / frame edges | Do darken the periphery to frame the warm center. Don't let it creep into the focal third. |

### Neon accents (COOL)
| Token | Hex | R | Usage | Do / Don't |
|---|---|---|---|---|
| `neon/blue` | `#34a8ff` | C | LED ring, lab accents, Rare tier, primary glow | Do reserve for the brand ring + Rare. Don't tint plant interiors with it. |
| `neon/blue-bright` | `#bfe4ff` | C | Ring inner highlight, brightest cool catch, rim peaks | Do use for the thin specular catch on the ring/frost. Don't use as a fill color. |
| `neon/violet` | `#9b5cff` | C | UV module, holographics, secondary accent | Do use for UV/genetics/sci-fi readouts. Don't confuse with Epic-tier `#b45cff` (see below). |

### Plant greens (WARM)
| Token | Hex | R | Usage | Do / Don't |
|---|---|---|---|---|
| `plant/seedling` | `#8fd49a` | W | Seedling, fresh growth tips | Do keep it pale + slightly translucent. Don't oversaturate — it should read fragile. |
| `plant/healthy` | `#4faf5a` | W | Vigorous veg foliage (also Common rarity) | Do treat as the "happy plant" baseline. Don't use for mature/late tissue. |
| `plant/mature` | `#2f7d3a` | W | Mature deep foliage, lower canopy | Do darken lower/older leaves toward this. Don't push past it into black-green. |

### Fade ramp (WARM → premium signal)
Per-strain maturity ramp (anthocyanin/senescence). Drive by maturity, **not** a global tint; some
strains never purple (`environment-rules.md`: cool nights = +purple, scaled by strain palette share).
| Token | Hex | R | Usage |
|---|---|---|---|
| `fade/green` | `#4faf5a` | W | Ramp start (unfaded) |
| `fade/yellow` | `#e3c84a` | W | First senescence (nutrients drawing back) |
| `fade/amber` | `#d98a3a` | W | Mid fade |
| `fade/magenta` | `#c2487a` | W | Anthocyanin pooling in cooler/older tissue |
| `fade/purple` | `#7a3fae` | W | Deep cool-tissue purple |
| `fade/red` | `#b23a3a` | W | Ramp end / dramatic finish |

*Do* run the ramp from leaf edges inward and lower leaves first. *Don't* apply it as a flat overlay —
it must follow leaf age/position to read as real autumn fade.

### Trichome / frost (WARM subject, COOL-catching)
| Token | Hex | R | Usage | Do / Don't |
|---|---|---|---|---|
| `frost/milky` | `#eef6ff` | W | Trichome head body (the dominant frosty band) | Do make this the brightest plant-body tone at peak frost. Don't tint it green. |
| `frost/specular` | `#ffffff` | W | True-white sparkle / glint on heads | Do reserve pure white for frost speculars ONLY (and ring catch). Don't use as a fill anywhere. |
| `frost/amber` | `#d9a441` | W | Ripe-amber heads, very late life only | Do introduce only near harvest. Don't let amber dominate before late fade. |

### Rarity tiers (cross-system color language — §2 P4)
| Token | Hex | R | Tier | Usage |
|---|---|---|---|---|
| `rarity/common` | `#4faf5a` | W | Common | Frame, glow, accent |
| `rarity/rare` | `#34a8ff` | C | Rare | Frame, glow, accent (= brand neon) |
| `rarity/epic` | `#b45cff` | C | Epic | Frame, glow, accent (purple/pink) |
| `rarity/epic-alt` | `#ff6ad5` | C | Epic (alt) | Hot-pink variant for pink-leaning Epics |
| `rarity/legendary` | `#f5c542` | W* | Legendary | Gold trim, gold glow, top-tier frame |

\* Legendary gold reads warm but lives in the cool chrome layer (it's hardware/frame trim, like the
premium-accessories board), so treat it as a privileged accent that may appear in either register.

### UI text & states (NEUTRAL / functional)
| Token | Hex | R | Usage | Do / Don't |
|---|---|---|---|---|
| `text/primary` | `#cfe3ff` | C | Primary UI copy on charcoal | Do use Inter at this tone (matches fan asset body color). Don't use pure white for body text. |
| `text/secondary` | `#6f93c8` | C | Labels, captions | Do use for de-emphasized chrome. Don't drop below ~4.5:1 on `#060a14`. |
| `text/muted` | `#46618c` | C | Footnotes, disabled | Do reserve for low-priority. Don't use for actionable text. |
| `data/numbers` | `#bfe4ff` | C | Live numeric data (JetBrains Mono) | Do tie data readouts to the neon-bright tint. Don't mix with body Inter. |
| `state/success` | `#4faf5a` | W | Healthy / success | Mirrors Common + healthy plant — intentional. |
| `state/warning` | `#e3c84a` | W | Caution (mirrors fade-yellow) | Do reuse fade-yellow for "attention." |
| `state/danger` | `#b23a3a` | W | Error / critical (mirrors fade-red) | Do reuse fade-red. Don't introduce a new red. |

---

## 5. Lighting Guide

A 3-point studio setup adapted to the two-register doctrine, validated at 1920×1080.

### 3-point setup (register-aware)
- **Key (warm, ~3200–3600K):** the dominant light on the plant. Comes from upper-front, biased to one
  side (~30–45° off-axis, ~20–35° elevation) so the silhouette has form and the praying-leaf posture
  reads. This light owns the warm greens and the fade colors.
- **Fill (cool, ~6500K, low intensity):** soft cool fill from the opposite side at ~25–40% of key,
  lifting shadow detail with a faint blue cast. It ties the plant to the cool environment **without**
  flattening the warm core.
- **Rim / back (neon, `#34a8ff` → `#bfe4ff`):** the separation light. A cool neon rim from behind/above
  carves the plant off the background and **lights the frost** (§3 rim rules, §2 P2). This is the most
  important of the three for the brand read.

### The blue LED ring as a PRACTICAL light
The ring is not just decoration — it is an **in-scene practical** that genuinely lights the top of the
plant. In the live chamber the halo casts a downward light cone
(`rgba(140,214,244,0.13) → transparent`) and an ellipse glow with `shadowBlur 26`. Canon:
- The ring is the apparent source of the cool rim and of frost speculars on the upper colas.
- Its falloff is top-strong → bottom-weak; lower canopy gets less cool light (stays warmer/darker),
  which reinforces the warm-core / cool-edge structure.
- Ring inner stroke = `#bfe4ff`, ring glow = `#34a8ff`. Same recipe as the fan asset
  (`stroke="#34a8ff" filter=glow` + inner `#bfe4ff`).

### Volumetric haze policy
- A faint cool haze is allowed in the **air around** the plant to sell atmosphere and let neon bloom —
  low alpha (~5–13%, matching the chamber halo cone and star-field link alphas of 0.05–0.13).
- Haze must **never** wash the matte plant body. It lives between the plant and the background, not on
  the subject. It is densest near light sources (ring, accessory glows) and clears in the focal third.

### Specular / bloom policy (sets up Frost-First)
- **Matte everything except frost.** Calyxes, leaves, and stems get soft volumetric gradients and
  **no white specular** (the renderer comment is explicit: a white highlight reads as "wet plastic").
- **Frost is the only place pure white speculars live** (`#ffffff` over `#eef6ff` heads). Bloom is
  reserved for: (a) frost speculars, (b) the neon ring/accent glows. Bloom radius stays tight on frost
  (sparkle, not a wash) and can be wider on the ring.
- Legendary `#f5c542` trim may carry a gentle gold bloom; no other rarity tier blooms warm.

### Exposure / contrast targets (validated 1920×1080)
- **Background luminance:** keep the field `#060a14` in the bottom ~5% of the value range; vignette
  edges `#02040a` near-floor. The scene is **low-key** — most pixels are dark.
- **Plant midtones:** healthy green `#4faf5a` sits around mid-value; this is the chromatic anchor.
- **Highlights:** frost milky `#eef6ff` and ring catch `#bfe4ff` are the brightest pixels; reserve the
  top ~5% of the value range for them so the frost "pops."
- **Separation contrast:** plant silhouette ≥ 3:1 luminance vs. adjacent background (§3).
- **Avoid clipping:** only frost speculars and the ring inner stroke may approach pure white; nothing
  else should clip to `#ffffff`.

---

## 6. Typography & Iconography

### Type
- **Inter** — all UI: titles, labels, body, buttons, navigation. Matches the fan asset
  (`font-family: "Inter"`, body `#cfe3ff`).
- **JetBrains Mono** — all **data and numbers**: stats, prices, ledger figures, environment readouts,
  DNA values, timers. Mono ties numeric truth to the "laboratory instrument" feel.
- **Rule:** never set running copy in mono, never set live data in Inter. Hero titles use Inter with
  wide tracking (the fan asset uses `letter-spacing: 10px` at 30px) and a soft blue glow
  (`text-shadow: 0 0 18px rgba(60,140,255,.55)`) — that glowing, tracked-out Inter title is canon for
  splash/hero. Color titles `#8fb6ff`; body `#cfe3ff`; labels `#6f93c8`.

### Iconography — the ring motif
The **ring/halo is the recurring icon language.** It already unifies the grow-light halo, the fan, the
genetic-scanner bezel, level indicators, and accessory tier glows. Canonize it:
- Icons favor **circular/ring-based geometry** with a glowing stroke (`#34a8ff`, inner `#bfe4ff`) on a
  dark fill (`#070c16`-ish), echoing the fan SVG construction (outer metal ring → glowing blue ring →
  bright inner highlight → dark face).
- Tier-color the glow per §4 (Common green … Legendary gold) so an icon's rarity is readable from its
  ring color alone.
- Geometric, deterministic, recolorable — these are **code/SVG** assets (§2 P5,
  `ACCESSORY_SVG_SPEC.md`).

### Spacing scale (desktop)
8-px base grid. Steps: **4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 120 px.** (The fan asset's layout
already lands on this grid: gaps of 120, blocks of 56/102/210/640.) HUD gutters ≥ 24 px at 1920×1080;
panel padding 16–24 px. Mobile may compress to the 4/8/12/16 steps; desktop uses the full ladder.

---

## 7. Desktop-First Validation Checklist

Validate **every** plant/UI surface at all three before shipping. Mobile is a secondary pass.

**1920×1080 (primary)**
- [ ] Plant silhouette holds ≥ 3:1 luminance contrast vs. adjacent background (§3).
- [ ] Cool rim present and ≤ ~3–4 px; plant interior stays warm/matte (no blue spill).
- [ ] Frost milky/specular is the brightest plant-body element; nothing else clips to white.
- [ ] Vignette frames the warm center; focal third is free of haze and edge-darkening.
- [ ] Body copy in Inter `#cfe3ff`; all live numbers in JetBrains Mono.
- [ ] Rarity color is consistent across frame, glow, and accent for that item.

**1440×900 (laptop)**
- [ ] Rim still reads (do not let it drop below 2 px — thicken slightly if needed, never to a fill).
- [ ] Ring/icon glows survive downscale; bloom not crushed into a flat blob.
- [ ] Text ≥ 4.5:1 contrast on `#060a14` (`#6f93c8` and lighter pass; `#46618c` only for non-actionable).

**1366×768 (small laptop)**
- [ ] Plant + cola still the clear focal mass; HUD does not crowd the focal third.
- [ ] Frost sparkle still legible (don't let trichome heads shrink below ~1 px effective).
- [ ] Spacing collapses gracefully on the 8-px grid; gutters ≥ 16 px.
- [ ] The 2-second read (§8) still lands.

---

## 8. The 2-Second-Read Success Test

Show any single hero frame to a fresh viewer for two seconds, then ask what they saw. **Pass = they
volunteer most of these without prompting:**

1. **"Sci-fi / lab / futuristic"** — from the charcoal field, blue neon ring, and cool hardware.
2. **"A plant / cannabis / it's growing"** — the warm green hero is unmistakably the subject.
3. **"It's frosty / crystally / premium"** — frost is the brightest, most textured element.
4. **"It's a collectible / it has rarity"** — the rarity color (frame/glow) registers as "tiered/valuable."
5. **"It looks alive / healthy (or sick)"** — posture reads before color.

**Fail conditions (any one fails the frame):**
- The plant blends into the neon (rim/contrast failure → fix §3).
- Frost is not the visual hero on a flowering shot (→ fix §2 P2 / §5 specular policy).
- It reads "greenhouse / cozy farm" instead of "laboratory" (cool register too weak → fix §3/§5).
- Body copy or numbers in the wrong typeface (→ fix §6).

Target sentence the frame should evoke:
> **"GrowPod Empire — a premium sci-fi genetics laboratory with living collectible cultivars
> and insanely frosty plants."**

---

## 9. Cross-References (the ART doc set)

This document is the constitution; these expand specific systems and inherit every value above.

| Doc | Owns | Inherits from here |
|---|---|---|
| `FROST_FIRST_IMPLEMENTATION_GUIDE.md` | Trichome frost density, specular/bloom recipe, frost-per-stage | §2 P2, §4 frost tokens, §5 specular policy |
| `RARITY_COLOR_SYSTEM.md` | Full rarity mapping across plants/accessories/UI/cards | §2 P4, §4 rarity tokens |
| `LEAF_POSTURE_HEALTH_GUIDE.md` | Pray/droop/claw angles, condition→posture mapping | §2 P3, §4 plant greens + states |
| `ACCESSORY_SVG_SPEC.md` | Code/SVG accessory icons, tier recoloring, ring construction | §2 P5, §6 ring motif, §4 neon + rarity |
| `PLANT_ENGINE_VISUAL_TARGETS.md` | The in-engine 70–80% targets per growth stage | §2 P5, §3 registers, §5 lighting |
| `SCREENSHOT_MOMENTS_GUIDE.md` | The shareable beats (Frost Explosion, Harvest) + composition | §1/§8 read test, §5 lighting, §3 rim |

---

*Ratified canon, V1 — Directive ART-002, 2026-06-14. Concept-only; no renderer changes. If a value
here is wrong, fix it here first — every ART doc reads this file.*
