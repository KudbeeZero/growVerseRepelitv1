# Screenshot Moments Guide — GrowPod Empire

> **Directive:** ART-002 (art-direction mission) · Worker: ART-A08
> **Status:** CONCEPT / ART-DIRECTION ONLY — no engine, renderer, or code changes. This is a
> capture-and-composition spec for the chamber view (`web/src/lib/chamber/chamberCore.ts`,
> `view="chamber"` and `view="macro"`). It tells the camera, lighting, FX, and UI layers *what to
> do at four named moments*; it does not implement them.
> **Frame budget:** desktop-first. Every moment is designed at **1920×1080** first, then noted for
> laptop (**1440×900**, **1366×768**); mobile is a secondary crop.

---

## 0. The governing rule — the 2-second read

**THE SUCCESS CRITERION (non-negotiable):** a stranger glancing at any screenshot from this game
for **2 seconds** must instantly think:

> *"That's GrowPod Empire — a premium sci-fi genetics laboratory with living collectible cultivars
> and insanely frosty plants."*

Every moment in this guide is judged against that single test. If a composition does not pass the
2-second read, it is wrong no matter how technically pretty it is. The three pillars that make the
read fire instantly:

1. **Neon-on-charcoal frame.** The `#060a14` near-black field + the cool blue LED ring practical
   (`#34a8ff` core / `#bfe4ff` inner) is the brand silhouette. It must be present and unmistakable.
2. **A frosty, warm-lit hero plant.** The plant is the warm organic hero inside the cool sci-fi
   pod. Frost (milky `#eef6ff` heads, `#ffffff` specular) is the single most ownable texture — it
   is what people screenshot.
3. **A rarity / value signal.** Color = rarity. A fade ramp, an aura, or a gilded chrome element
   tells the eye "this is collectible and valuable" before any text is read.

Miss any one pillar and the screenshot reads as "generic plant render," not GrowPod Empire.

### Shared canon constants (verbatim — used by every moment below)

| Token | Value | Use |
|---|---|---|
| Background | `#060a14` | The charcoal field. Trailer/fan asset already uses this. |
| Neon blue | `#34a8ff` (core) / `#bfe4ff` (inner highlight) | LED ring, rim light, UI accents |
| Violet | `#9b5cff` | Secondary neon, genetics/DNA motif, epic accents |
| Rarity — Common | `#4faf5a` | green |
| Rarity — Rare | `#34a8ff` | blue (= the house neon) |
| Rarity — Epic | `#b45cff` | purple |
| Rarity — Legendary | `#f5c542` | gold |
| Trichome — milky | `#eef6ff` | resin-head body |
| Trichome — specular | `#ffffff` | sparkle glint |
| Trichome — amber | `#d9a441` | ripe heads |
| Fade ramp | `#4faf5a → #e3c84a → #d98a3a → #c2487a → #7a3fae → #b23a3a` (green→yellow→amber→magenta→purple→red) | ripeness / premium color |
| Type — body | Inter | UI chrome |
| Type — numeric/code | JetBrains Mono | stats, IDs, traits |

> The chamber shell already paints toward these: background gradient `#060d16→#04080e`, the halo
> ring stroke `#cfeeff` with `rgba(150,222,250,0.9)` glow, the floor ring `rgba(127,212,240,…)`.
> These moments push that existing palette to its expressive peak — they do not invent a new one.

---

## 1. The four hero moments

Each spec is concrete: subject placement on the 1920×1080 grid, the camera move, the three-light
rig, the FX stack, what UI is shown vs. hidden, the palette pulled from canon, the emotional beat,
and an explicit **"passes the 2-second read because…"** line.

Grid convention: thirds lines fall at **x = 640 / 1280** and **y = 360 / 720**. "Power points" are
the four thirds intersections. The pod's LED halo ring sits at the top of the cap (chamber shell
`cap.haloY`); the soil/floor ring sits low (`cap.floorY`).

---

### (A) FROST EXPLOSION — the signature money shot

*Grounded in board `plants/06_frost_explosion.png` and `knowledge/macro-bud-rules.md`. This is the
beat that validated the whole art department; it is the default marketing frame.*

**Trigger / system:** the plant crosses peak trichome density in late flower — `dev.trich`
approaching max with resin heads still milky (`trichHead` in its `< 0.9` cloudy-white band, before
amber dominates). See §3 mapping. Best captured in `view="macro"` (the Detailed Bud View) for the
crystalline payoff, with a `view="chamber"` variant for the whole-plant silhouette.

**Composition @ 1920×1080:**
- Macro variant: a single cola spine runs slightly **left of center**, its mass column occupying
  roughly **x = 480 → 1040** (the macro builder centers at `W*0.5`, `baseY = H*0.9`; nudge the
  capture frame left so the cola's left edge lands on the x=640 third). The frosted apex sits on the
  **upper-left power point (640, 360)**.
- Reserve the **right third (x > 1280) as negative space** — deep charcoal falloff — so the eye has
  somewhere to rest and the frost reads as the only event in frame. The reference board does exactly
  this with its dark right gutter.
- A **macro inset bubble** (the board's circular detail loupe) may ride the **upper-right** at
  ~(1440, 320), 360 px diameter, showing glandular heads at extreme magnification — only in the
  "discovery loupe" variant; omit for the clean marketing frame.

**Camera move:** slow **push-in** (dolly) along the cola, ~6 s, from a 3/4 framing to a tight macro
on the frostiest calyx cluster. Ease "none" → gentle out. No orbit (orbit muddies the specular
sparkle; the frost wants a stable light angle). Hold the final frame 1.5 s for the screenshot grab.

**Lighting (three-point):**
- **Warm key** on the bud from upper-left (~35° above, camera-left), low saturation amber-white, so
  the green base and resin read warm and organic — the plant is the warm hero.
- **Cool neon rim** from behind-right in `#34a8ff`, kissing the cola's right contour so it separates
  from the charcoal and every trichome stalk catches a blue edge. This is the brand light.
- **Ring practical:** the pod LED halo (`#bfe4ff` inner / `#34a8ff`) overhead provides the ambient
  fill and is partly visible at the top of frame to anchor "this is a pod."

**FX stack:**
- **Frost sparkle:** dense milky heads (`#eef6ff`) with intermittent `#ffffff` specular glints that
  twinkle as the camera moves — the glint catches the blue rim, so sparkles flash faintly cyan at
  their cores. Density scales with `dev.trich` (per `macro-bud-rules.md`: additive `lighter` specks
  building into frost patches, anchored per calyx).
- **Volumetric haze:** a thin cool ground haze (`#34a8ff` at ~6% opacity) drifting bottom-up so the
  rim light has atmosphere to bloom through.
- **No rarity aura here** unless the plant is also Rare+; this moment sells *texture*, not tier.

**UI chrome:** HIDDEN for marketing. Screenshot Mode (§2) strips HUD. Optional minimal lower-third:
strain name in Inter + a tiny `JetBrains Mono` trichome-maturity readout (e.g. `TRICH 0.92 ·
MILKY`) at lower-left, 28 px, 60% opacity — never covering the bud.

**Palette:** charcoal `#060a14` field; green base under milky `#eef6ff`/`#ffffff` frost veil; pistils
white→cream (`pistilFiber`/`pistilBall` early band); blue rim `#34a8ff`/`#bfe4ff`. Warm key keeps
the only warmth in frame.

**Emotional beat:** awe + ownership — *"I grew that, and it's dripping."* The 70–80% impact target
is measured against this exact frame.

**Passes the 2-second read because:** the frost veil is unmistakably this game's signature texture,
the blue rim + visible LED halo brand it as the sci-fi pod, and the charcoal negative space makes
the crystalline bud the only thing the eye can land on — premium genetics-lab in one glance.

---

### (B) HARVEST HERO SHOT — the trophy

*Grounded in board `plants/08_harvest.png` and the catalog's "harvest = Bud Swell mass + Frost peak
+ Fade color, combined." This is "the screenshot players will share."*

**Trigger / system:** stage transitions to `harvest` (`stageOf() === "harvest"`) — peak cola mass
(`P.budDev` maxed, late-flower `lateMass` swell), trichomes mostly cloudy with amber onset, fade
color expressed. Captured in `view="chamber"` (whole-plant trophy) — the heft and stacked colas are
the story, so the full silhouette must be in frame.

**Composition @ 1920×1080:**
- **Whole plant centered**, base on the floor ring, apex cola reaching the **upper third
  (y ≈ 360)**. The chamber builder centers the plant at `cap.cx` (~screen center); keep it there but
  frame so the fat top cola sits on the **vertical centerline crossing the upper-third line**
  (1280-wide field → plant centered at 960, cola apex at y≈340).
- Use **symmetry deliberately** here (unlike A): the pod is a temple, the plant is the idol on the
  altar. The LED halo ring frames the apex; the floor ring frames the base — top and bottom brackets.
- Negative charcoal space left and right of the plant (roughly x<560 and x>1360) keeps the
  silhouette legible and gives social-crop safe margins.

**Camera move:** slow **pull-back / craft-reveal**, ~7 s, starting tight on the top cola then easing
out to reveal the full heavy plant standing in the lit pod — the "behold the trophy" reveal. End on
a held wide. A faint **2–3° parallax drift** (not a full orbit) adds dimensionality without
disturbing the symmetric frame.

**Lighting (three-point):**
- **Warm key** from front-upper-left, richer/warmer than A (this is golden-hour ripeness), making
  the fade colors glow — ambers and purples want warm light.
- **Cool neon rim** `#34a8ff` from behind, full-height, so the entire plant silhouette is haloed in
  blue and lifts off the charcoal.
- **Ring practical:** the overhead pod halo is fully in frame and brighter than in A — it is the
  altar's spotlight, with a soft `#bfe4ff` cone of volumetric light coming down onto the canopy
  (chamber shell already paints a `rgba(140,214,244,…)` downward cone — push it).

**FX stack:**
- **Fade color ramp** as the hero: leaves and sugar leaves express the canon ramp
  `#4faf5a→#e3c84a→#d98a3a→#c2487a→#7a3fae→#b23a3a`, autumn gradient from edges inward, purple
  pooling in lower/cooler tissue (per catalog stage 7/8). This is the premium signal.
- **Frost** present (cloudy + amber heads `#d9a441`) but secondary to the fade — resin-glossy.
- **Gold dust motes** drifting up through the warm cone (the engine already spawns gold dust when
  flowering, `spawnDust` `gold: true`) — celebratory particles.
- **Volumetric haze** warm-tinted near the floor, cool near the halo (the pod's two-register light).

**UI chrome:** Screenshot Mode HIDES the control panel/sliders. KEEP an optional **harvest banner**:
a clean lower-third with strain name (Inter, large), yield + potency in `JetBrains Mono`, and a small
rarity chip (see RARITY_COLOR_SYSTEM cross-ref) — this frame doubles as a shareable "I harvested X"
card. Banner must sit below y=860 so it never crosses the plant.

**Palette:** charcoal `#060a14`; full fade ramp on foliage; cloudy+amber `#d9a441` frost; blue rim
and halo `#34a8ff`/`#bfe4ff`; warm gold key + gold dust.

**Emotional beat:** payoff and pride — completion of the core loop. The trophy on the altar.

**Passes the 2-second read because:** a heavy, fade-colored, frosted plant standing centered and
spotlit inside the blue-ringed pod is the entire game's promise in one symmetric frame — premium,
living, collectible, grown-by-me.

---

### (C) RARE PHENOTYPE DISCOVERY — the "what did I just grow?!" beat

*Grounded in `knowledge/whole-plant-architecture.md` (recognizable per-strain silhouette, DNA-driven
expression) and the genetics/breeding loop. The thrill is recognizing an unusual expression appear.*

**Trigger / system:** a grow/breeding outcome resolves to a notable phenotype — a distinctive
silhouette (e.g. heavy foxtailing `S.foxtail`, strong `purpleExpression`/anthocyanin, unusual
`calyxHue` accent fraction via `budColor.accentHue`), or a roll above the Rare threshold. The reveal
fires when the player first inspects the new cultivar. Rarity tier here is **Rare (`#34a8ff`)**.

**Composition @ 1920×1080:**
- The new plant enters **center-right**, its distinctive trait placed on the **right power point
  (1280, 360)** so the eye is led straight to the *thing that's different* (the foxtail spike, the
  purple bract, the odd cola shape).
- **Left third** carries a **DNA / trait card** sliding in: a holographic helix motif (violet
  `#9b5cff`, the genetics motif) over a frosted-glass panel, listing the discovered traits in
  `JetBrains Mono`. This is the one moment where UI is a *feature* of the composition, not chrome to
  hide — the card IS the discovery.
- Negative space minimal; the frame is a deliberate "lab readout" split: organism right, data left.

**Camera move:** quick **snap-in** then settle — a sharp ~0.6 s push to the trait, then a slow
0.4°/s **orbit** around the distinctive feature so the player can read the 3D shape of the phenotype
(orbit is wanted here because shape, not surface, is the story).

**Lighting (three-point):**
- **Warm key** on the plant, neutral so true trait color reads honestly.
- **Cool neon rim** `#34a8ff` — doubling as the **Rare-tier color cue** (rim and aura share the
  rarity hue, so the lighting itself announces the tier).
- **Ring practical:** pod halo dimmed slightly so the trait card's violet glow and the blue aura
  carry the frame.

**FX stack:**
- **Rare aura (`#34a8ff`):** a soft pulsing rim-bloom around the whole plant per the RARITY_COLOR_
  SYSTEM aura spec — blue, ~1 Hz gentle pulse, scaled to "this is uncommon, not legendary" (restraint
  is what makes the Legendary reveal later feel bigger).
- **Holographic helix** sweep on the trait card (`#9b5cff` → `#bfe4ff` scanline).
- **Trait spark:** a single bright pulse on the discovered feature at the moment of reveal — a
  `#bfe4ff` ring-flash emanating from the foxtail/purple bract.
- Frost as appropriate to stage; restrained so the *trait* is the read, not the frost.

**UI chrome:** the trait card is SHOWN and central to the shot. Everything else (sliders, nav) is
hidden. The card uses Inter for labels, `JetBrains Mono` for trait values and the cultivar ID.

**Palette:** charcoal `#060a14`; Rare blue `#34a8ff`/`#bfe4ff` aura+rim; violet `#9b5cff` helix;
the plant's own honest trait color (e.g. anthocyanin purples pulled from the fade ramp's
`#7a3fae`/`#c2487a` stops).

**Emotional beat:** surprise + curiosity — *"wait, what IS this? look at that."* The collector's
spark.

**Passes the 2-second read because:** the split "organism + holographic DNA readout" frame screams
*genetics laboratory*, the blue aura tags it as a rare collectible, and the distinctive silhouette on
the right power point makes the discovery instantly legible as something special.

---

### (D) LEGENDARY CULTIVAR REVEAL — the jackpot

*The rarest, biggest moment. Reserve maximum spectacle; everything restrained in A–C pays off here.
Rarity tier: **Legendary gold (`#f5c542`)**. This is the "pull of the year" frame.*

**Trigger / system:** a Legendary-tier roll resolves (top breeding outcome / rarest phenotype band).
This is the loudest, least-frequent event in the game; it earns full-screen treatment.

**Composition @ 1920×1080:**
- The cultivar is **dead center, heroically large**, breaking the usual restraint — apex cola near
  y=300, base near y=860, the plant nearly filling the vertical frame. Strong central symmetry like
  the harvest altar but *bigger and brighter*.
- **Radiating composition:** gold light rays / aura emanate from the plant toward all four corners,
  so the entire frame points back at the cultivar. The LED halo behind it reads like a halo/crown.
- Negative space is *consumed by glow* rather than charcoal — but a thin charcoal vignette at the
  extreme corners keeps it from blowing out and preserves the brand field.

**Camera move:** **slow majestic push-in** with a subtle upward tilt (hero-from-below by a few
degrees), ~8 s, building to a held glory frame. Optional very slow orbit (≤0.3°/s) for the render
trailer; keep the screenshot grab on the symmetric front-on glory frame.

**Lighting (three-point):**
- **Warm-gold key** — the warmest, brightest key of all four moments; the plant glows as if lit from
  within.
- **Cool neon rim** still `#34a8ff` so it never loses the brand (gold + blue is the legendary combo:
  warm idol, cool sci-fi frame). The rim keeps it from becoming a generic gold trophy.
- **Ring practical:** the pod halo blooms to full intensity, a `#bfe4ff` crown over the apex, with
  god-ray shafts coming down through gold haze.

**FX stack:**
- **Legendary aura (`#f5c542`):** the strongest aura tier per RARITY_COLOR_SYSTEM — a gold
  rim-bloom + radiating rays + a slow rotating gold caustic, clearly the loudest aura in the game.
- **Gold particle burst:** a celebratory upward fountain of gold motes (extend the existing gold
  `spawnDust`), denser than the harvest motes, peaking at the reveal then settling to a steady drift.
- **Frost + fade both at peak:** milky/amber frost (`#eef6ff`/`#d9a441`) AND the full fade ramp — a
  Legendary should look like the best harvest *plus* the gold aura. Maximum surface richness.
- **Volumetric god-rays** in `#f5c542` through gold haze, with the cool `#34a8ff` rim cutting through
  so both registers coexist.
- A single **screen-wide flash** (`#bfe4ff`→`#f5c542`) at the instant of reveal as a punctuation.

**UI chrome:** HIDDEN at the peak frame for shareability, then a **LEGENDARY banner** lands: the
word LEGENDARY in gold (`#f5c542`, Inter, large, letter-spaced like the trailer title), cultivar name
beneath, ID + traits in `JetBrains Mono`. Banner is the only chrome and it is part of the spectacle.
A prominent **Share** button appears after the reveal settles (see §2).

**Palette:** gold `#f5c542` dominates (aura, rays, key, banner); charcoal `#060a14` vignette holds
the corners; blue `#34a8ff`/`#bfe4ff` rim + halo keep the brand; plant carries full frost + fade.

**Emotional beat:** elation / jackpot — *"NO WAY. I pulled a Legendary."* Maximum dopamine; this is
the screenshot that gets posted with all-caps.

**Passes the 2-second read because:** a gilded, radiating, frost-and-fade-loaded cultivar enthroned
under a blooming blue LED halo is unmistakably a premium collectible jackpot inside *this* sci-fi
pod — gold + blue + frost says GrowPod Empire and "rare and valuable" in the same instant.

---

## 2. Capture & shareability

**Aspect / format:**
- **Desktop screenshot (primary):** 1920×1080, 16:9, PNG (lossless for frost detail) for in-app
  capture; JPEG q90 for auto-share. Laptop captures at 1440×900 (16:10) and 1366×768 (16:9) must
  keep the hero subject and the LED halo inside a 16:9 safe area centered in frame so a later 16:9
  crop never loses the brand elements.
- **Social crops (derived from the 1920×1080 master):**
  - **1:1** (1080×1080) — Instagram feed. Center-crop; subject must survive the square (moments B
    and D are centered for exactly this reason; A keeps the bud left-of-center but inside x=300→1080
    so the 1:1 still holds it).
  - **9:16** (1080×1920) — Stories/Reels/TikTok. Vertical re-frame: in moments B/D the tall plant is
    ideal; A re-frames to the cola only; C drops the side trait card and stacks it below.
  - **16:9** (1280×720) — YouTube/Twitter card, direct downscale of the master.
- Always render the master at 1920×1080 first and derive crops — never compose natively to a crop.

**Where the Share button lives:**
- A persistent, low-prominence **camera/share icon in the chamber HUD's top-right** (where it never
  overlaps the plant), Inter label, `#34a8ff` accent.
- After moments **C and D resolve**, a **prominent contextual Share button** appears center-bottom
  (`#34a8ff` for Rare, `#f5c542` for Legendary) — peak emotion is when people share, so surface it
  exactly then. It fades after ~8 s back to the persistent HUD icon.
- The share flow opens a preview of the captured 1920×1080 master with crop toggles (1:1 / 9:16 /
  16:9) before export.

**Watermark / branding policy:**
- Shared images carry a **small, tasteful watermark**: lower-right, the GrowPod Empire wordmark in
  Inter + a tiny blue LED-ring glyph (the recurring motif), `#bfe4ff` at ~70% opacity, max ~3% of
  frame height. Never across the plant.
- For Legendary shares, the watermark may sit beside a `JetBrains Mono` cultivar ID so the post is
  also a provenance card (ties to the on-chain asset layer; the chain is a *mirror*, the ID shown is
  the DB truth).
- In-app screenshots (not shared) are watermark-free so players can frame their own captures.

**"Screenshot Mode" (HUD-hidden) — recommended:**
- A one-key/one-tap **Screenshot Mode toggle** that hides ALL HUD chrome (sliders, panels, nav,
  stat overlays) leaving only the lit chamber + plant + (optional) a single minimal lower-third.
- While active, the chamber should bias toward the **held "glory frame"** of whichever moment is
  active (push-in/pull-back parked at its hold pose), motion reduced to the ambient sway + frost
  twinkle + dust so the grab is clean but still alive.
- Respect `motionOK` / reduced-motion: if motion is off, Screenshot Mode parks a fully static glory
  frame.
- Add a faint optional **rule-of-thirds / safe-crop overlay** in Screenshot Mode (toggleable) so
  players self-compose to the same grid these moments use.

---

## 3. Moment → system mapping (what fires each)

| Moment | Gameplay event / sim trigger | Chamber view | Source signal |
|---|---|---|---|
| **(A) Frost Explosion** | Trichome density crosses peak in late flower (frost peak, still milky pre-amber) | `macro` (hero) + `chamber` (silhouette) | `dev.trich` near max; `trichHead` in cloudy-white `<0.9` band |
| **(B) Harvest Hero** | Stage enters `harvest` — mass + frost + fade all expressed | `chamber` | `stageOf()==="harvest"`, `P.budDev` peak, `lateMass`/`P.ripe`, fade ramp expressed |
| **(C) Rare Phenotype** | Grow/breeding resolves a notable phenotype OR a Rare-tier roll; first inspection | `chamber` | distinctive `S.foxtail` / `purpleExpression` / `budColor.accentHue`+`accentFrac`; rarity ≥ Rare |
| **(D) Legendary Reveal** | A Legendary-tier roll resolves (rarest band) | `chamber` | rarity == Legendary |

**Cadence note:** A and B are common (every successful grow earns them). C is occasional. D is rare
by design — its spectacle is calibrated against the restraint of A–C, so do not over-trigger it
(inflating the Legendary frame cheapens the 2-second jackpot read). Rarity thresholds and roll bands
are owned by the genetics/economy services, not the renderer — these moments only *read* the result.

---

## 4. Acceptance criteria (per moment, tied to canon + boards)

A capture passes only if ALL of its boxes are true.

**Global (every moment):**
- [ ] Background is the canon charcoal `#060a14` field (or its chamber-shell gradient); no foreign
      background color.
- [ ] The blue LED ring practical (`#34a8ff` core / `#bfe4ff` inner) is present and identifiable.
- [ ] Subject placed on the specified thirds/power point; specified negative space preserved.
- [ ] Type is Inter (UI) / JetBrains Mono (numeric) only.
- [ ] Passes the 2-second read (§0) when shown cold to someone who has not seen the game.
- [ ] 1:1 and 9:16 crops derived from the 1920×1080 master keep the hero + LED ring in frame.

**(A) Frost Explosion:**
- [ ] Frost reads as the dominant texture — milky `#eef6ff` heads with `#ffffff` specular sparkle,
      density matching board `06_frost_explosion.png`'s blanket coverage on calyxes + sugar leaves.
- [ ] Specular glints pick up the `#34a8ff` rim (faint cyan sparkle cores).
- [ ] Cola left-of-center, right third is charcoal negative space (matches the board's dark gutter).
- [ ] No rarity aura unless the plant is independently Rare+.

**(B) Harvest Hero:**
- [ ] Full fade ramp expressed on foliage (`#4faf5a→…→#b23a3a`), purple pooling low, per board
      `08_harvest.png` and catalog stage 7/8.
- [ ] Cola mass reads "heavy" (peak `budDev`/swell); frost present as cloudy+amber `#d9a441`.
- [ ] Plant centered + symmetric, framed top by the halo ring and bottom by the floor ring.
- [ ] Gold dust motes drifting in the warm cone; warm key + cool blue rim both present.

**(C) Rare Phenotype:**
- [ ] The distinctive trait sits on the right power point and is instantly legible as "different."
- [ ] Rare aura is blue `#34a8ff` (matches RARITY_COLOR_SYSTEM Rare) and gently pulsing, NOT
      gold/purple.
- [ ] DNA/trait card present left, violet `#9b5cff` helix motif, values in JetBrains Mono.
- [ ] Frame reads as a lab "organism + data" split.

**(D) Legendary Reveal:**
- [ ] Gold `#f5c542` aura/rays are the loudest in the game; clearly bigger than the Rare aura in (C).
- [ ] Blue `#34a8ff` rim still present (gold + blue, never gold alone).
- [ ] Frost AND full fade both at peak on the plant (looks like best harvest + gold aura).
- [ ] Centered, radiating, halo-as-crown; LEGENDARY banner in gold Inter + JetBrains Mono ID.
- [ ] Prominent Share button surfaces after the reveal settles.

---

## 5. Cross-references (companion ART-002 docs)

This guide is the *capture/composition* layer of Directive ART-002. It depends on three companion
specs in `docs/art-direction/` (siblings under the same directive):

- **`CANONICAL_VISUAL_LANGUAGE_V1.md`** — the house style these moments must obey: neon-on-charcoal
  brand, two-register lighting (warm organic plant inside cool sci-fi pod), the `#060a14` field, the
  LED-ring motif, Inter / JetBrains Mono type. Every moment here is an *application* of that language;
  if the two ever disagree, the Canonical Visual Language wins on style and this guide adjusts.
- **`FROST_FIRST_IMPLEMENTATION_GUIDE.md`** — the authority on the frost texture that powers Moment
  (A) and the frost layers of (B)/(D): milky `#eef6ff` / specular `#ffffff` / amber `#d9a441` heads,
  density scaling, specular sparkle, the "frost is the signature" mandate. This guide tells the camera
  *how to shoot* frost; that guide tells the engine *how to render* it.
- **`RARITY_COLOR_SYSTEM.md`** — the authority on the rarity auras used in (C) and (D): Common
  `#4faf5a` / Rare `#34a8ff` / Epic `#b45cff` / Legendary `#f5c542`, aura intensity/pulse per tier.
  This guide consumes that system; aura color and behavior are defined there, not here.

Source grounding for this document: `docs/research/visual-reference/2026-06-14-growpod-visual-
reference-catalog.md`, boards `plants/06_frost_explosion.png` + `plants/08_harvest.png`,
`knowledge/whole-plant-architecture.md`, `knowledge/macro-bud-rules.md`,
`web/src/lib/chamber/chamberCore.ts` (the chamber/macro renderer these moments are captured in), and
the `my-video/` fan-asset turnaround as tonal reference (`#060a14` field, `#34a8ff`/`#bfe4ff` LED
ring, Inter, glow filters).

---

*Directive ART-002 · concept / art-direction only · no engine or renderer changes made.*
