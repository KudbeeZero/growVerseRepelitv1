# DXT Cycle 01 — FTUE, Mobile & Accessibility Audit

**Team:** Design & Experience (Player Obsession) · **Date:** 2026-06-14
**Scope reminder:** Tier-1 polish only — UI/CSS/animation/copy/a11y/onboarding. No
backend, economy, sim, chain, schema, or API changes. Backend needs are logged as
work orders at the bottom.

---

## What shipped this cycle

**The Grow Guide — a game-state-driven FTUE coach** (Objective 2). A floating,
mobile-first card that reads the player's real grow state and points at the single
next action in the core loop, advancing on its own as the player acts:

| Player state (server-authoritative) | Guide step |
|---|---|
| No pod | 1 · Set up your first pod |
| Pod, no usable seed | 1 · Grab a seed (→ Lab) |
| Pod + seed, no plant | 1 · Plant your first seed |
| Live plant, pod climate unset (`temperature == null`) | 2 · Dial in the climate |
| Live plant, climate set, growing | 3 · Keep it thriving (→ plant) |
| Plant at `harvest` stage | 4 · Your plant is ripe! (→ plant) |
| First harvest banked | 5 · 🎉 What strain next? (→ Lab) |
| Harvested **and** replanted | guide steps aside (graduated) |

- **Auto-advancing:** every branch keys off a durable signal (`pods`, `seeds`,
  `plants`, `harvests`) — no manual "next", and it can never drift from the
  dashboard because it reads the same queries.
- **Mobile-first & safe-area aware:** floats above the home indicator / notch via
  `env(safe-area-inset-*)`; full-width on phones, compact bottom-right on desktop.
  Added `viewport-fit=cover` + theme-color so those insets resolve.
- **Accessible:** labelled landmark region, `aria-live="polite"` instruction so
  screen readers announce each new step, native buttons (keyboard/touch/mouse),
  Esc to collapse, collapse-to-pill that remembers the step.
- **Reduced-motion:** the only animations (`animate-fade-up`, celebratory
  `animate-twinkle`) are already neutralised by the global reduced-motion block.
- **Non-nagging:** finishing or skipping persists per-player (`gpe.ftue`); never
  shown again unless reset.
- **Pure brain, tested:** all step logic lives in `web/src/lib/ftue.ts` and is
  covered by `ftue.test.ts` (10 cases — every branch + progress-range invariant).

Files: `web/src/lib/ftue.ts`, `web/src/lib/ftueStore.ts`,
`web/src/components/onboarding/GrowGuide.tsx`, mounted in `AppShell`;
viewport in `app/layout.tsx`; tests in `web/src/lib/__tests__/ftue.test.ts`.

---

## Tutorial audit

**Before:** onboarding ended at "account created → here's your dashboard." The
starter pod+seed grant (#34) put a pod and seed in the player's hands but nothing
told them what to do with them. First 15 minutes = a blank-stare risk.

**After:** the loop teaches itself, step by step, without a modal takeover. We
deliberately chose a *calm directional coach* over a DOM-spotlight tour: spotlights
are brittle across responsive breakpoints and route changes, and a takeover fights
the "just check my plants for a minute" north star. The coach earns the same result
— the player always knows the next tap — without trapping them.

**Gap vs. the 14-step brief:** the brief lists discrete "Set Temperature / Water /
Check" forced steps. We collapsed Water+Check into one "Keep it thriving" step
because watering has no durable completion signal (water level decays), so a forced
"you watered" gate would be fragile. Splitting them cleanly needs a backend signal
(see work order WO-1).

---

## Mobile audit (this cycle's slice)

- ✅ Safe-area insets now real (`viewport-fit=cover`); the new coach respects them.
- ✅ Coach is full-width on small screens, doesn't cover the nav, collapses to a pill.
- ⚠️ **Carried friction (not yet fixed):** the top `NavBar` renders all 7 links in a
  wrapping flex row — on iPhone SE width this wraps to 2–3 rows and eats vertical
  space. Candidate for a bottom tab bar or overflow menu (FP-1).
- ⚠️ Dashboard "Recover a plant" + "Environment & Weather" are discoverable only by
  scrolling/toggling; fine, but the planting CTA could be more thumb-reachable.

---

## Accessibility audit (this cycle's slice)

- ✅ New coach: live region, labelled region, keyboard-operable, reduced-motion safe.
- ⚠️ Carried: no global skip-link; some icon-only buttons elsewhere rely on emoji
  without `aria-label`; color-contrast pass on `text-gray-500` instrument labels
  against `ink-900` is borderline (FP-6).

---

## Top friction points (prioritised, for the next polish sprint)

1. **FP-1 · NavBar wraps on small phones.** Move to a bottom tab bar (thumb zone)
   or collapse secondary links into a "More" menu. *High impact, mobile.*
2. **FP-2 · No empty-state for "you have a seed but no pod".** Dashboard empty-state
   assumes you start podless; the starter grant means most players land with both.
   Tune copy to the granted state.
3. **FP-3 · Planting is buried in PodCard.** The single most important first action
   should be visually primary on the dashboard for a brand-new grower.
4. **FP-4 · No "what changed since I left" moment** on return (obsession driver).
5. **FP-5 · Care buttons give no celebratory feedback** (no micro-animation/haptic
   on water/feed/harvest). Cheap dopamine, big retention lever.
6. **FP-6 · Contrast + icon-button labels** sweep for a11y AA.
7. **FP-7 · Loading states are plain spinners**; skeletons would feel more premium.
8. **FP-8 · No reduced-motion / colorblind toggles surfaced** (we honour OS
   reduced-motion, but offer no in-app control).
9. **FP-9 · Harvest reward is a toast**; deserves a screenshot-worthy moment.
10. **FP-10 · Chamber → dashboard navigation** lacks persistent "back to grow".

## Obsession score (cycle 01, subjective baseline)

| Lever | Before | After | Note |
|---|---|---|---|
| First-15-min clarity | 3/10 | 8/10 | Guide removes the blank stare |
| Mobile native feel | 5/10 | 6/10 | Safe-area fixed; nav still wraps |
| Screenshot moments | 4/10 | 4/10 | Untouched this cycle (FP-9) |
| Delight / micro-interaction | 4/10 | 5/10 | Coach polish only |

---

## Backend work orders (Tier-2 — require approval, NOT done here)

- **WO-1 · Per-action "last cared at" / care-acknowledged signals** so the tutorial
  can cleanly gate discrete Water/Feed/Check steps without guessing from decaying
  levels. (Enables the full 14-step brief.)
- **WO-2 · A lightweight "session delta" endpoint** (what changed since last seen:
  stage advances, new buds, frost gained) to power the FP-4 "welcome back" moment.

---

## Recommended next polish sprint

FP-1 (bottom nav) + FP-3 (primary plant CTA) + FP-5 (care-action feedback). Highest
retention-per-effort, all Tier-1, no backend dependency.
