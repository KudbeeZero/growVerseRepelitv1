# FINAL ART DIRECTION REPORT — GrowPod Empire

> **Directive:** ART-002 — Canonical Visual Language Ratification
> **Lead Agent:** ART-A00 · **Workers:** ART-A01–A10 · **Date:** 2026-06-14
> **Status:** ✅ **CERTIFIED** — all deliverables complete, cross-consistent, and implementation-ready.
> **Scope discipline:** Concept & documentation only. No renderer modifications, no code changes,
> no asset replacements, no PR created. Every spec is written so the Plant Engine and Asset teams
> can implement immediately.

---

## 1. Mission outcome

GrowPod Empire now has a ratified, single-source art direction. The Higgsfield visual research
(16 reference boards + study catalog, ADR 2026-06-14) is formally adopted as the official house
style, and that direction is expanded into **eight implementation-ready specifications** under
`docs/art-direction/`.

The governing success test is met by design across every doc:

> **The 2-second read:** a player glancing at a screenshot for two seconds should instantly think —
> *"That's GrowPod Empire — a premium sci-fi genetics laboratory with living collectible cultivars
> and insanely frosty plants."*

## 2. Deliverables (all present, certified)

| # | Document | Owner | Lines | Covers |
|---|----------|-------|------:|--------|
| 1 | `CANONICAL_VISUAL_LANGUAGE_V1.md` | A01 | 359 | 5 principles, two-register system, full palette, lighting, type/icon, desktop-first |
| 2 | `FROST_FIRST_IMPLEMENTATION_GUIDE.md` | A02 | 426 | Trichome density model, specular, deterministic sparkle, frost-by-stage, perf budget |
| 3 | `RARITY_COLOR_SYSTEM.md` | A04 | 319 | 4 tiers, chrome-not-body ruling, per-surface application, accessibility |
| 4 | `LEAF_POSTURE_HEALTH_GUIDE.md` | A05 | 288 | 5 health states with leaf-tip angles, sim-signal mapping, recovery anim |
| 5 | `ACCESSORY_SVG_SPEC.md` | A06 (+A07) | 403 | Shared SVG kit, 8 accessory specs, gameplay-system mapping |
| 6 | `PLANT_ENGINE_VISUAL_TARGETS.md` | A03+A04+A09 | 473 | Per-strain silhouettes, fade standard, bud stacking, ranked priorities |
| 7 | `SCREENSHOT_MOMENTS_GUIDE.md` | A08 | 435 | 4 hero moments at 1920×1080, capture/share, trigger mapping |
| 8 | `FINAL_ART_DIRECTION_REPORT.md` | A00/A10 | — | This certification |

Grounding: every worker read the reference boards (`docs/research/visual-reference/`), the canon in
`knowledge/`, and the **real** renderer (`web/src/lib/chamber/*`) + sim (`simulation/`) — so targets
extend actual parameter names, not invented ones.

## 3. Ratified canonical principles (the spine)

1. **Two Registers, One Universe** — warm photoreal-leaning plants (the hero) inside a cool
   neon-on-charcoal sci-fi lab (the frame). Hard rim/edge rules keep the plant from drowning in neon.
2. **Frost-First Doctrine** — dense trichomes + specular sparkle are *the* signature; highest Plant
   Engine priority; the 70–80% emotional-impact bar is measured against the frost board.
3. **Health Through Posture** — praying leaves (tips up) = healthy, drooping = neglected; **color is
   secondary**. Posture is the primary, glanceable health read.
4. **Color = Rarity** — Common green · Rare blue · Epic purple/pink · Legendary gold — applied to
   **UI chrome (aura/frame/badge), never the plant body**.
5. **Asset Split** — AI for marketing/loading/splash/trailers/hero renders; Code/SVG for live
   plants, growth stages, accessories, genetics visuals, chamber animations.

## 4. Certification — cross-document consistency

Verified mechanically and by review:

- ✅ **Shared canon constants used verbatim.** Background `#060a14` appears in all 7 specs; rarity
  gold `#f5c542`, rare blue `#34a8ff`, epic `#b45cff`, and the fade ramp (`#4faf5a → #e3c84a →
  #d98a3a → #c2487a → #7a3fae → #b23a3a`) appear consistently in exactly the docs that reference
  color/rarity. **Zero off-canon stray hexes** detected.
- ✅ **No contradictions** between docs. The three color systems are cleanly separated:
  **rarity = chrome/aura**, **fade = maturity on the plant body**, **health = posture (+ secondary
  tint)**. RARITY_COLOR_SYSTEM defines a charcoal "moat" so rarity glow never bleeds onto the plant.
- ✅ **Determinism honored.** Frost sparkle (A02), posture recovery (A05), and accessory motion (A06)
  are all specified as seeded + composition-time-driven — consistent with the engine's
  no-`Math.random()`/no-`Date.now()` rule.
- ✅ **Single-source detail.** Frost detail lives only in FROST_FIRST; posture detail only in
  LEAF_POSTURE; rarity only in RARITY_COLOR; PLANT_ENGINE_VISUAL_TARGETS cross-references rather than
  duplicating. No conflicting numbers across files.
- ✅ **Desktop-first** validated at 1920×1080 + 1440×900 + 1366×768 in every doc; mobile noted as
  supported-but-secondary per the phase reminder.
- ✅ **2-second-read test** restated and satisfied as the governing rule in CANONICAL and SCREENSHOT.

**Verdict: PASS.** The package is internally consistent and aligned to the canonical GrowPod Empire
identity.

## 5. The 70–80% plan (ranked, for the Plant Engine)

From PLANT_ENGINE_VISUAL_TARGETS + FROST_FIRST:
1. **Frost density + specular sparkle** — biggest awe-per-effort; the signature.
2. **Per-strain fade ramp** — cheap "premium" win.
3. **Bud-stacking fusion / mass-over-foliage** (tipping at `budDev ≈ 0.45`) — the "real bud" read.
4. **Leaf-posture health signal** — legibility of the care loop.
5. **Node spacing** — vigor vs. stretch silhouette honesty.
6. **Branch angle** — candelabra fullness + bud-weight bow.

**Items 1–3 likely clear the 70–80% bar; 4–6 make it read as alive.**

## 6. Implementation reconciliation notes (flagged by workers — NOT acted on)

These are real code↔canon gaps the specs surfaced. They are **recorded for the implementation phase**,
not changed here (this directive is concept-only):

1. **Rarity tiers (A04):** shipped `web/src/lib/.../format.ts` uses **5 tiers with off-canon hexes**;
   canon is **4 tiers**. The eventual reskin must retint `RARITY_HEX`/`RARITY_STYLES` to canon and
   fold `uncommon` into the Common-green family.
2. **Frost determinism (A02):** `chamberCore.ts spawnDust()` currently uses `Math.random()`. Frost
   must **not** follow that pattern — the spec mandates a seeded `mulberry32` + position-hash, driven
   by composition time. (Also worth auditing `spawnDust` itself for seek-safety.)
3. **Frost onset timing (A02):** recommend shifting the trichome ramp from `(day-48)/18` to
   `(day-44)/22` so faint frost appears during Bud Swell, matching board intent. Flagged, not changed.

## 7. Hand-off

The Plant Engine and Asset teams can begin immediately:
- **Plant Engine** → start at PLANT_ENGINE_VISUAL_TARGETS (priorities 1–3), with FROST_FIRST and
  LEAF_POSTURE as the deep specs; reconcile notes #2/#3 first.
- **Asset team** → start at ACCESSORY_SVG_SPEC (shared kit → 8 accessories) and RARITY_COLOR_SYSTEM;
  the HyperFrames fan (`my-video/index.html`) is the proven SVG pattern; reconcile note #1.
- **Marketing/Cinematics** → SCREENSHOT_MOMENTS_GUIDE + the AI side of the asset split (Higgsfield).

All work is tracked against the canonical principles. Supersede any doc via a new dated version;
do not edit history.

---

*Certified by ART-A00. Concept & documentation only — no engine, sim, or asset code was modified in
the production of this directive.*
