# Rarity Color System — GrowPod Empire

> **Directive:** ART-002 · **Ratified + extended by:** ART-004 (2026-06-14) · **Worker:** ART-A04
> **Status:** CONCEPT / SPEC ONLY — documentation, no code changes. This is a design
> contract for how *rarity* is communicated visually across the web client. It defines the
> canonical **5-tier** color system (4 fixed-color tiers + an animated **Mythic** capstone), the
> per-tier chrome treatment, and — most importantly — the rules that keep rarity color from
> colliding with the plant's own maturity/health colors.
>
> **ART-004 update:** the canon now includes a fifth tier, **Mythic** (animated multi-spectrum
> gradient), above Legendary. Sections 1, 2, and 7 reflect it.
>
> **Viewport priority:** Desktop-first. All radii, glow sizes, and particle counts below are
> authored for **1920×1080**, validated to read at **1440×900** and **1366×768**. Mobile is
> secondary (scale rules noted where relevant).
>
> **Cross-references:**
> `docs/art-direction/CANONICAL_VISUAL_LANGUAGE_V1.md` (house palette, neon-on-charcoal, type) ·
> `docs/art-direction/SCREENSHOT_MOMENTS_GUIDE.md` (the legendary cultivar reveal) ·
> `docs/research/visual-reference/2026-06-14-growpod-visual-reference-catalog.md`
> (fade ramp, frost, health-posture) · `knowledge/genetics-system.md`,
> `knowledge/strain-dna.md`, `knowledge/mutation-system.md` (what earns rarity).

---

## 0. Why this document exists

GrowPod Empire has **three independent color stories happening on the same plant at the same time**:

1. **Rarity** — how special/scarce the *cultivar* is (a property of its genome).
2. **Maturity fade** — the plant's natural ripeness color ramp (green → yellow → amber → magenta →
   purple), a property of *this grow's life stage*.
3. **Health posture/signal** — whether *this plant right now* is happy or neglected.

If we paint rarity onto the plant body, all three fight for the same pixels and the player can no
longer tell "this is a Legendary strain" from "this plant is ripe" from "this plant is dying."
**This document's core ruling (Section 4) is: rarity lives in the UI chrome, never on the plant
body.** Everything else here serves that ruling.

### Reconciling the canon with the existing code

The canon (as ratified by **ART-004**) defines **5 tiers**: `Common · Rare · Epic · Legendary ·
Mythic`. The shipped client (`web/src/lib/types.ts`) currently models a different 5 —
`common · uncommon · rare · epic · legendary` — with hex tints in `web/src/lib/format.ts`
(`RARITY_HEX`) that do **not** match the canon hexes, and **no Mythic tier**.

This spec is authored against the **5 canonical tiers** and treats the code's `uncommon` as a
**sub-band of Common** (same green family, see Section 7). When the client is reskinned to this
system, the existing `RARITY_HEX`/`RARITY_STYLES` maps in `format.ts` are the single edit point;
the `Rarity` type must **add `mythic`** and retint to canon, with `uncommon` rendering in the
Common-green family at slightly higher intensity. No code is changed by this document — this is the
**Rarity Retint** reconciliation item (ART-004 implementation priority #3).

---

## 1. The five tiers

| Tier | Hex | Token name | Meaning |
|------|-----|-----------|---------|
| **Common** | `#4faf5a` | `rarity.common` (green) | Base catalog / landrace / ordinary cross. The everyday workhorse. |
| **Rare** | `#34a8ff` | `rarity.rare` (neon blue) | A genuinely good roll — notable trait expression or a clean stabilized cross. |
| **Epic** | `#b45cff` | `rarity.epic` (purple-pink); accent `#ff6ad5` | A standout phenotype: high-value trait stacking or a rare mutation expressed. |
| **Legendary** | `#f5c542` | `rarity.legendary` (gold) | The trophy. A near-perfect, fully stabilized, mintable cultivar — the screenshot moment. |
| **Mythic** | *animated multi-spectrum gradient* (cycles `#34a8ff → #b45cff → #ff6ad5 → #f5c542` and back) | `rarity.mythic` | The apex — beyond Legendary. The rarest possible outcome (e.g. a fully stabilized cultivar carrying a top-tier mutation *and* a perfect trait stack). The chrome itself is **alive**. |

**Mythic is defined by motion, not a single hex.** Where every other tier is a fixed color, Mythic
is an animated spectrum sweep — it must read as "this is rarer than gold" at a glance. Because the
renderer is deterministic/seek-safe, the gradient phase is driven by composition/UI time (no
`Date.now()`); see Section 2.

`#34a8ff` is also the brand's house **neon blue** (it doubles as the pod/LED accent). This is
intentional: Rare reads as "this belongs to the elite machine layer of the game." Backgrounds for
all rarity chrome are the canon charcoals **`#060a14`** (deep) / **`#0b1424`** (panel).

### 1.1 What earns each tier (tied to genetics)

Rarity is a **property of the genome**, derived at seed/breed time (see `knowledge/genetics-system.md`:
catalog `rarity` + `cross()` → derived offspring rarity). It is NOT a property of how well you grew
a given plant. The visual system must therefore be **stable for a cultivar across all of its grows**.

| Tier | Earned by (genetics / phenotype rarity) | Emotional intent |
|------|------------------------------------------|------------------|
| **Common** | Base catalog strains; low-novelty crosses; unstabilized early-gen offspring. | Comfortable, safe, "this is your bread and butter." No spectacle. |
| **Rare** | Clean stabilization of a desirable trait; a cross that surfaces a wanted terpene/THC band; first appearance of an anthocyanin (purple) bias. | A pleasant surprise. "Oh, nice — this one's worth keeping." |
| **Epic** | A rare **mutation** expressed and preserved (deep-purple / pink-pistil from `knowledge/mutation-system.md`'s ladder), or multiple high-value traits stacked in one genome. | Excitement, pride. "I made something unusual." |
| **Legendary** | A fully stabilized, high-stability (mintable: `stability ≥ 0.85`, non-common — see `StrainCard.tsx`) cultivar that also carries a top-tier mutation or trait stack; the rarest derived-rarity outcome. | Awe + ownership. "I grew a legend." This is the moment built around `SCREENSHOT_MOMENTS_GUIDE.md`. |
| **Mythic** | The apex outcome: a Legendary-grade genome that *also* lands a top-rung mutation (e.g. `Pink Pistils`/`Albino` from the ladder) **and** a near-perfect trait stack at max stability — the rarest result the breeding system can produce. Should be vanishingly rare by design. | Disbelief + bragging rights. "This shouldn't exist." The endgame trophy above the trophy. |

> **Genetics tie-in, explicit:** the mutation ladder
> `Green → Lime → Deep Green → Purple → Black Purple → Pink Pistils → Albino`
> (`knowledge/mutation-system.md`) describes **what color the bud actually is** — that is *maturity/
> mutation expression on the plant body*, NOT rarity chrome. A deep-purple bud does not make a card
> purple-framed; rarity is computed from the genome's scarcity and rendered separately in chrome.
> An **Albino/white** mutation might be Epic-or-Legendary *rare*, but its plant body is white-frost —
> its card still gets the gold/purple-pink **chrome**, never a white frame.

---

## 2. Per-tier visual treatment (deterministic, desktop-scaled)

All values below are deterministic — no per-render randomness — so the same cultivar renders
identically every time (matches the project's "pure/deterministic" conventions). "Aura" = the soft
glow drawn *behind/around* a card or the plant container; "frame" = the card/panel border;
"badge" = the text chip; "particles" = optional ambient sparks in chrome only.

Glow values use CSS box-shadow / radial-gradient terms. Radii are in px at 1920-wide layouts.

### Common — `#4faf5a`
- **Aura/glow:** none, or a 0–2px inner hairline at 8% opacity. Common must feel *quiet*.
- **Frame/border:** 1px solid `#4faf5a` at 35% opacity on `#0b1424`. No outer glow.
- **Badge:** filled chip, text `#4faf5a` on `rgba(79,175,90,0.14)`, 1px `#4faf5a@40%` border. Icon: ● (small dot) or "C".
- **Card stock:** flat `#0b1424`. No texture.
- **Particles:** none.
- **Animation:** none (static).

### Rare — `#34a8ff`
- **Aura/glow:** outer box-shadow `0 0 18px rgba(52,168,255,0.30)`, radius ≈18px. Steady, no pulse.
- **Frame/border:** 1.5px solid `#34a8ff` at 70% opacity; subtle 1px inner highlight.
- **Badge:** text `#34a8ff` on `rgba(52,168,255,0.16)`, border `#34a8ff@60%`. Icon: ◆ (diamond) or "R".
- **Card stock:** `#0b1424` with a faint top-down blue gradient (≤6% `#34a8ff` at top edge).
- **Particles:** none (keep the brand neon clean here).
- **Animation:** none, or a one-time 250ms glow fade-in on first appearance.

### Epic — `#b45cff` (accent `#ff6ad5`)
- **Aura/glow:** dual-stop radial — inner `#b45cff@40%`, outer `#ff6ad5@22%`, radius ≈28px,
  box-shadow `0 0 28px rgba(180,92,255,0.36)`.
- **Frame/border:** 2px gradient border `#b45cff → #ff6ad5` (135°). Corners get a 2px brighter node.
- **Badge:** text `#ff6ad5` on `rgba(180,92,255,0.18)`, border gradient `#b45cff→#ff6ad5`. Icon: ✦ (4-point star) or "E".
- **Card stock:** `#060a14` with a very low-opacity purple-pink corner vignette (top-left).
- **Particles:** 3–5 slow-drifting magenta/violet sparks confined to the **card bounds** (chrome), 0.8–1.4px, opacity ≤25%.
- **Animation:** slow aura breathe — opacity 0.30↔0.42 over ~3.2s, ease-in-out. Subtle.

### Legendary — `#f5c542`
- **Aura/glow:** layered gold — inner `#f5c542@50%`, mid `#f5c542@28%` (radius ≈40px),
  box-shadow `0 0 44px rgba(245,197,66,0.45)`. The brightest, largest aura in the system.
- **Frame/border:** 2.5px solid `#f5c542` with an animated **shimmer sweep** (see Animation).
  Inner 1px `#fff4cf` highlight line for a "polished metal" read.
- **Badge:** text `#060a14` on solid `#f5c542` (dark-on-gold for max punch), or `#f5c542` on
  `rgba(245,197,66,0.20)` for inline contexts. Icon: ♛ (crown — matches existing `TitleBadge`) or "L".
- **Card stock:** `#060a14` with a faint gold caustic/sheen in the upper third.
- **Particles:** 6–10 gold motes drifting upward within the card bounds, 0.8–1.6px, opacity ≤30%,
  plus occasional single-frame "twinkle" highlights.
- **Animation:** **gold shimmer** — a 35%-wide specular highlight sweeps across the border once every
  ~4.5s (left→right, 900ms, ease-out). Aura breathes 0.45↔0.55 over ~3.5s. This is the system's
  signature motion; reserve it strictly for Legendary so it stays special.

### Mythic — *animated multi-spectrum gradient*
- **Aura/glow:** the largest in the system — radius ≈52px, box-shadow `0 0 56px` whose **color
  animates** through the spectrum sweep (`#34a8ff → #b45cff → #ff6ad5 → #f5c542 → #34a8ff`). The
  glow itself shifts hue, so a Mythic card visibly *cycles color* while every other tier holds steady.
- **Frame/border:** 3px **animated gradient border** running the full spectrum, rotating phase
  continuously (a conic/linear gradient whose angle advances over time). Inner 1px white highlight.
- **Badge:** text `#060a14` on the animated gradient fill (or white text on dark for inline). Icon:
  ✸ / a small rotating prism glyph, or "M".
- **Card stock:** `#060a14` with a faint moving iridescent caustic across the upper third.
- **Particles:** 8–12 motes whose color samples the current gradient phase (so they shimmer through
  the spectrum), within card bounds, opacity ≤30%.
- **Animation:** the **defining trait** — a continuous spectrum phase advance, full cycle ≈6s,
  linear. **DETERMINISTIC:** the phase is `(uiTimeSeconds / 6) mod 1` (or composition time in a
  rendered context) — never `Date.now()`/`Math.random()` — so it is seek-safe and renders identically
  for a given timestamp. Reserve all spectrum-cycling motion for Mythic exclusively; Legendary keeps
  its single-color gold shimmer so the two never blur.

> **Why Mythic is motion-defined:** every fixed-color tier can be ranked by brightness, but Mythic
> must read as *categorically* beyond gold. A living, color-cycling chrome is unmistakable at the
> 2-second glance and impossible to confuse with any static tier or with the plant's own colors.

### Intensity ladder (the through-line)
Glow radius, border weight, and motion all climb monotonically:
`Common (0px / 1px / none) < Rare (18px / 1.5px / none) < Epic (28px / 2px / breathe) <
Legendary (44px / 2.5px / gold shimmer) < Mythic (52px / 3px / spectrum cycle)`. A player should rank two cards by **brightness and motion
alone**, before reading any text.

> **Reduced motion:** `prefers-reduced-motion` (already honored in `Constellation.tsx`) disables the
> Epic breathe, Legendary shimmer, and the **Mythic spectrum cycle** — render a single bright static
> frame (for Mythic, freeze the gradient at a balanced phase showing all four spectrum stops) so the
> tier is still unmistakable without motion.

---

## 3. Surface scaling (desktop tiers)

| Surface zoom | 1920×1080 | 1440×900 | 1366×768 | Mobile (secondary) |
|---|---|---|---|---|
| Mythic aura radius | 52px | 46px | 40px | 26px |
| Legendary aura radius | 44px | 40px | 36px | 24px |
| Epic aura radius | 28px | 26px | 24px | 16px |
| Rare aura radius | 18px | 16px | 16px | 12px |
| Particle counts | full (6–10 / 3–5) | full | −1 to −2 | halve, or drop to 0 |

Auras must never bleed past their card's grid gutter at 1366×768 — clamp radius so adjacent cards
don't visually merge. On dense grids (market, GenBank legend) particles may be dropped entirely;
border + aura carry the tier.

---

## 4. Disambiguation — the load-bearing rules

**THE RULING:** Rarity is communicated **only in UI chrome** — auras, frames, badges, card stock,
glow, and particles drawn *around* the plant. Rarity color is **never painted onto the plant body**
(leaves, calyxes, pistils, buds, trichomes). The plant body is reserved exclusively for **maturity
fade** and **health posture**.

Why this is correct:
- The plant body already owns a full color language: the **fade ramp**
  `green #4faf5a → yellow #e3c84a → amber #d98a3a → magenta #c2487a → purple #7a3fae → red #b23a3a`
  encodes *maturity/ripeness* (visual-reference catalog §7 Fade), and the mutation palette encodes
  *genetic expression*. There is no free color channel left on the plant for rarity.
- **The fade ramp and the rarity palette deliberately overlap** (both use green; both use a
  purple/magenta). If rarity tinted the plant, a ripe Common plant (naturally purple from fade)
  would be indistinguishable from an Epic plant. Quarantining rarity to chrome removes the
  collision by construction.
- Chrome is **stable per cultivar**; the plant body **changes every tick** as the grow matures.
  Putting a stable property (rarity) on a changing surface (the plant) would make rarity look like
  it flickers. Chrome is the only surface where rarity can be both stable and always-visible.

### 4.1 The three channels, kept separate

| Channel | What it means | Where it is drawn | Color source |
|---|---|---|---|
| **Rarity** | Cultivar scarcity (genome property) | **Chrome only** — aura, frame, badge, card stock, chrome particles | Section 1 palette (green/blue/purple-pink/gold) |
| **Maturity fade** | This grow's ripeness/life stage | **Plant body** — leaves/calyxes | Fade ramp `#4faf5a→#e3c84a→#d98a3a→#c2487a→#7a3fae→#b23a3a` |
| **Health** | Is this plant happy right now | **Plant body posture** + a small status icon | Posture (praying↔droop) primary; a non-rarity status color (e.g. amber/red caution) for alerts only |

> **Health note:** per the visual-reference catalog (§ "Health reads through posture, not just
> color"), the *primary* health signal is **leaf posture** — praying tips = healthy, droop =
> neglect. Health may use amber/red **caution accents on a status pill**, but those live in a
> dedicated health UI slot (the existing `SEVERITY_STYLES`/`URGENCY_STYLES` system), never as the
> card frame, so they cannot be mistaken for rarity gold/blue.

### 4.2 Do / Don't

| ✅ Do | ❌ Don't |
|------|---------|
| Put the gold Legendary glow as an **aura behind the plant container** and on the card frame. | Tint the plant's leaves or buds gold to show Legendary. |
| Let a Common plant show a **naturally purple fade** when ripe — it's maturity, not rarity. | Read that purple fade as "Epic" or add an Epic frame because the bud looks purple. |
| Keep the **fade ramp** on the plant body and the **rarity palette** in chrome, even though both contain green and purple. | Reuse the same purple swatch for both "ripe plant" and "Epic rarity" in the same view without spatial separation. |
| Signal **health via posture** (droop) + a status pill in the health slot. | Use the rarity blue/gold to indicate health, or color the frame red for a sick Legendary. |
| Reserve the **gold shimmer animation** for Legendary chrome only. | Animate a shimmer on the plant body or on lower tiers. |
| Render rarity chrome **identically every grow** of that cultivar. | Let rarity chrome change as the plant matures. |
| Always pair rarity color with a **shape icon + text label** (Section 6). | Rely on hue alone (fails colorblind + fails the blue-vs-green / fade-overlap cases). |

### 4.3 Spatial contract
On any surface showing both a plant and its rarity: the rarity chrome occupies the **frame/aura
ring and the badge corner**; the plant occupies the **interior**. There is always a charcoal
"moat" (`#060a14`, ≥8px) between the gold/blue/purple aura and the plant's own pixels, so the two
color stories never touch.

---

## 5. Application by surface

### 5.1 PDP (Plant Detail Page / live grow view)
- **Plant interior:** fade + posture only (untouched by rarity).
- **Container ring:** rarity aura drawn as a glow ring on the pod/chamber frame around the plant,
  per Section 2. A Legendary plant glows gold *around the pod*, not on the leaves.
- **Header badge:** rarity badge (icon + label) next to the cultivar name.
- **Stability/mint affordance:** when a strain becomes mintable (Section 1.1), the Legendary
  shimmer is the cue that the trophy state is reachable.

### 5.2 Strain Encyclopedia (`/lab/strains`, cards)
- Each `StrainCard` gets a **tier frame + aura** (replacing today's flat `RARITY_STYLES` chip-only
  treatment) and keeps the existing rarity badge (`RarityChip`).
- Card stock per Section 2. Grid clamps auras so neighbors don't merge (Section 3).
- The card thumbnail (if it shows a plant) follows the moat rule — plant interior is fade-colored,
  frame is rarity-colored.

### 5.3 GenBank / Constellation (`/lab/genbank`, `Constellation` graph mode)
- The constellation is **pure chrome** (glowing nodes on charcoal) — so here rarity color legitimately
  lives on the nodes themselves; there is no plant body to collide with. **Update `RARITY_HEX` to the
  canon palette:** Common `#4faf5a`, Rare `#34a8ff`, Epic `#b45cff`, Legendary `#f5c542` (with
  uncommon → Common-green family). This replaces the current off-canon tints in `format.ts`.
- Legendary nodes get the largest radius + brightest glow (the component already scales radius by
  `weight`/`hub`; map Legendary cultivars to `hub: true` and max weight).
- The existing GenBank **legend** (the dot + label row) becomes the canonical quick-reference swatch
  set (Section 7) and must add the **shape icon** beside each dot for colorblind safety (Section 6).
- Note: `graphAdapters.genomeGraph` currently uses purple `#a78bfa` / green `#76c024` to mark
  *expressed vs unexpressed loci* — that is a **trait-expression** encoding, not rarity. Keep it
  distinct from the rarity palette (it is an interior data channel, not a rarity badge); if confusion
  arises, retint expressed loci to a neutral cyan rather than the Epic purple-pink.

### 5.4 Market cards (`/market`)
- Same frame/aura/badge treatment as encyclopedia cards. In a dense market grid, drop chrome
  particles (Section 3) and let frame + aura carry the tier so scanning many listings stays calm.
- Price/rarity adjacency: keep the rarity badge in a fixed corner so buyers learn "top-right = tier"
  and can scan a wall of listings by glow brightness.

### 5.5 Harvest reveal (`HarvestsPanel`, and the dedicated reveal moment)
- The harvest result already carries `rarity` (`Harvest.rarity` → `RarityChip`). The **reveal**
  animation escalates by tier:
  - Common/Rare: badge stamps in, brief aura fade.
  - Epic: aura breathe + magenta spark burst (chrome) on reveal.
  - **Legendary: the full screenshot moment** — gold aura blooms, shimmer sweeps the frame, gold
    motes rise, crown badge stamps. This is the beat specified in `SCREENSHOT_MOMENTS_GUIDE.md`
    ("legendary cultivar reveal"); the plant interior stays fade/frost-colored (the bud is the
    hero), and the gold is entirely the chrome celebrating it.

---

## 6. Accessibility & contrast (desktop)

**Non-color secondary signal is mandatory.** Every rarity indicator carries **(a) a hue, (b) a
distinct shape icon, and (c) a text label**. Color is never the sole carrier. Icon set:
Common ● · Rare ◆ · Epic ✦ · Legendary ♛ · Mythic ✸. Single-letter fallbacks: C / R / E / L / M.
Mythic's animated spectrum is a fourth cue, but it must still carry the ✸ icon + label so it reads
under reduced-motion and for colorblind players.

### Contrast on charcoal (`#060a14` / `#0b1424`)
| Tier | Hex | As text on `#0b1424` | Guidance |
|------|-----|----------------------|----------|
| Common `#4faf5a` | green | passes for large/badge text; for body text use `#7fd08a` lightened variant | OK |
| Rare `#34a8ff` | blue | strong on charcoal | OK |
| Epic `#b45cff` | purple | adequate; prefer the `#ff6ad5` accent for small text (brighter) | use accent for fine text |
| Legendary `#f5c542` | gold | **gold-on-charcoal is high-contrast and the most legible** | OK; for the badge, dark-on-gold (`#060a14` text on `#f5c542`) is highest punch |

- **Gold on charcoal** is the highest-contrast pairing in the system — good, since Legendary must be
  unmissable. Use dark text on the solid gold badge for AAA-level legibility.
- **Blue vs green colorblind concern:** Common (green) and Rare (blue) are the most likely confusion
  for deuteranopia/protanopia. This is why the **shape icon (● vs ◆) and the intensity step
  (Rare has an aura, Common has none)** are required — they disambiguate without relying on the
  blue/green hue difference. Never place a Common and Rare swatch adjacent with hue as the only cue.
- **Epic purple vs the fade-ramp purple/magenta:** handled structurally by Section 4 (rarity purple
  is in chrome, fade purple is on the plant body, separated by the charcoal moat). Within chrome,
  Epic's purple-pink gradient + ✦ icon distinguishes it from any single-hue swatch.
- **Motion safety:** all shimmer/breathe/particle motion respects `prefers-reduced-motion`
  (Section 2) — the static peak frame still conveys tier via aura + frame + icon.

---

## 7. Legend / quick-reference

| Tier | Hex | Icon | Aura radius (1920) | Frame | Animation | Earns it |
|------|-----|------|--------------------|-------|-----------|----------|
| **Common** | `#4faf5a` | ● / C | none | 1px @35% | none | base catalog, low-novelty cross |
| *uncommon* (→Common family) | `#4faf5a`*↑int.* | ● | 0–8px faint | 1px @45% | none | mildly above-base cross |
| **Rare** | `#34a8ff` | ◆ / R | 18px | 1.5px @70% | none / fade-in | clean stabilization, wanted trait band |
| **Epic** | `#b45cff` (acc. `#ff6ad5`) | ✦ / E | 28px | 2px gradient | aura breathe | rare mutation expressed, trait stack |
| **Legendary** | `#f5c542` | ♛ / L | 44px | 2.5px + shimmer | gold shimmer sweep | stabilized trophy + top mutation, mintable |
| **Mythic** | *spectrum gradient* `#34a8ff→#b45cff→#ff6ad5→#f5c542` | ✸ / M | 52px | 3px animated gradient | spectrum cycle (~6s, deterministic) | apex: Legendary genome + top-rung mutation + perfect trait stack |

**Backgrounds:** deep `#060a14` · panel `#0b1424`. **House neon blue:** `#34a8ff` (= Rare).
**Type:** Inter (UI/labels), JetBrains Mono (instrument readouts / NODES counters / hex tags).
**Plant-body color (NOT rarity):** fade ramp `#4faf5a → #e3c84a → #d98a3a → #c2487a → #7a3fae → #b23a3a`.

**One-line mnemonic:** *Rarity glows around the plant; ripeness and health live on the plant.*

---

## 8. Implementation pointers (for the eventual reskin — not done here)

- `web/src/lib/format.ts` — `RARITY_HEX` (retint to canon) and `RARITY_STYLES` (add frame/aura
  classes) are the single source of truth; both `StrainCard`, `RarityChip`, GenBank legend, and
  `graphAdapters` consume them.
- `web/src/components/viz/Constellation.tsx` — already supports per-node `color`/`hub`/`weight` and
  honors reduced-motion; map Legendary → `hub:true` + max weight.
- `web/src/components/harvest/HarvestsPanel.tsx` — the reveal-escalation hook (Section 5.5).
- Keep `uncommon` in the `Rarity` type if removing it is risky; render it in the Common-green family.

*Concept/spec only. Adopt, refine, or reject per art direction. No code, git, or PRs were touched.*
