# HANDOFF — the baton

> Single source of truth for **what the next chat does first**. Rewritten by `/closeout` at
> the end of every chat; read by `/handoff-audit` at the start of the next. If this file and
> the code disagree, the code wins — fix the baton. See `docs/SESSION_PROTOCOL.md`.

**Last rewritten:** 2026-06-14 · **By:** phyllotaxy-engine chat (PBSA charter)
**Active branch:** `claude/cannabis-growth-engine-s114yu` (base `main`, **NO PR opened** — owner did
not request one; branch pushed, ready to PR on request).
**main is at:** commit `dc6ccde` — FTUE starter-grant (#34), Launch Strain Pack (#33), PR #30
Dashboard wiring (#29 merge), PR #26 Bud Weight Physics (carrying #29 canonical-PNG), PR #25
De-Grape — **all merged**. This branch builds the procedural-engine (PBSA) track on top of that.
**Parked as of the previous (stale) baton — RE-VERIFY before touching:** **PR #27** Phenotype
Generator Foundation, **PR #28** Circadian Leaf Motion. Their open/merged state was not re-audited
this chat (the baton predated #30/#33/#34 merging) — `/handoff-audit` should confirm.

> **⚠️ Baton context.** The previous baton was frozen mid-graphics-phase (it still said "merging #26
> now" though #26/#29/#30/#33/#34 have all since merged to `main`). This chat works the **PBSA
> charter** ("Procedural Botanical Systems Architect" — own the plant: Engines 1–6) and started the
> engine track rather than the old "PR #30 dashboard" next-action (which has since merged anyway).
> The **backend OPEN RISKS below remain carried/NOT re-audited** — renderer-only work this chat.

---

## NEXT ACTION (the one scoped item the next chat does)

**Engine 1/2 polish, or Engine 6 (G×E) whole-plant expression — pick ONE.** Engines 3 (Phyllotaxy)
& 4 (Leaf Orientation) shipped this chat. Natural next scoped builds, all renderer-only, all on the
PBSA charter:
- **Engine 6 — G×E whole-plant expression:** extend `knowledge/whole-plant-architecture.md`
  §Environmental reactions to the *whole plant* (not just buds): high light → compact internodes ·
  low light → stretch · cool nights → anthocyanin creep up the stem · strong airflow → thicker stems
  · heat → leaf claw. The `climateModel` already exists in `morphology.ts`; thread its outputs into
  `buildPlant` height/internode/stem-width the way `growthMult` already nudges height.
- **Engine 1/2 — apical-dominance multi-cola:** low `apicalDominance` strains should grow several
  competing tops, not one cola + side branches. Currently a single spine + cola.
- **Reuse, don't rebuild:** the chamber renders through `web/src/lib/chamber/chamberCore.ts` (shared
  by the live `<GrowChamber>` and the headless `npm run gen:stages` generator) and the new pure
  `web/src/lib/chamber/phyllotaxy.ts`. Keep both as single sources. **Verify visuals with
  `npm run gen:stages`** (writes `web/canonical-stages/*.png`, gitignored) — the only screenshot path.
- **Do NOT** touch economy / chain / db / api / wallets / dashboards (charter: work-order required).
- **Macro Bud Polish II** (BACKLOG, *not launch-blocking*): sharper calyx ridges / denser nesting on
  the PDP *macro* bud — macro view only; whole-plant chamber is the engine track's focus.

---

## What THIS chat did

**Phyllotaxy & Pseudo-3-D Depth — Engines 3 & 4** (renderer-only; PBSA charter). The whole-plant
chamber placed every node hard-left/hard-right in one flat picture plane, so plants read as a
symmetric diagram and every fan leaf billboarded at the camera — the charter's two explicit "do
nots". Built a real phyllotaxy engine:
- New pure module **`web/src/lib/chamber/phyllotaxy.ts`** (`phyllotaxis` / `foreshorten` /
  `depthShade`, unit-tested): assigns each node an **azimuth** around the stem — decussate (~180°
  alternation) at the base easing into the **137.5° golden-angle spiral** toward the apex as the
  plant matures, by *cumulative* angular steps. At maturity 0 it reproduces the legacy flat
  alternation **exactly** (test-pinned), so signed-off seedling/veg silhouettes are preserved.
- `chamberCore.buildPlant` projects azimuth → pseudo-3-D: `lateral=cos·az` (signed horizontal
  foreshortening), `depth=sin·az` (front/back). `drawPlant` paints nodes **back→front** by depth,
  shades them by `litAdj` (atmospheric depth), and `drawFan` gained `yaw` so a fan on a branch
  winding toward the camera turns **edge-on** instead of billboarding (Engine 4), plus a per-node
  roll. A per-plant seeded `phase` rotates the whole spiral so **no two plants of a strain align**.
- Strain silhouette knobs (spread/shorten/density/cola/bud-weight) untouched → G13 stays a slim
  spear, PDP/White Rhino stay chunky; verified across the 7 curated strains × stage PNG matrix.
- Docs: ADR `DECISIONS.md` (2026-06-14); BACKLOG entry (Engines 3&4 ✅, #28 note); this baton.

## Verification split (this chat)

**Agent-verifiable (proven):**
- Web: `tsc --noEmit` ✅ · `next lint` ✅ · `next build` ✅ · `vitest run` **128/128** ✅ (+9 new
  phyllotaxy tests; Constellation sacred-render hashes untouched — that file not modified).
- Generated the full `npm run gen:stages` PNG matrix (7 strains × 5 stages + macro + motion) and
  **eyeballed them in-session** (G13 veg/late-flower, PDP late-flower, White Rhino veg, Animal Mints
  harvest, Gelato early-flower): spiral depth + varied leaf yaw present, silhouettes intact, no NaN /
  vanished branches / artifacts.
- Backend (no Python changed): `make test` **226 passed, 80.95% ≥ 79** ✅ · `make lint` ✅ ·
  `make check-memory` ✅ (incl. the new ADR/BACKLOG links).

**Device/human-verifiable (owner — the actual deliverable):**
- The live chamber pixels + motion/perf. No headless browser drives the live `<GrowChamber>` in CI
  (the PNG generator is static stills). Open a veg and a flowering plant for G13 / Purple Diddy Punch
  / White Rhino and confirm: branches wind around the stem with front/back depth (not flat left/
  right), leaves vary broad↔edge-on (not all camera-facing), silhouettes still recognisable, and the
  airflow sway + bud-weight droop still read correctly with the new depth ordering. **Engines 3&4
  need device sign-off** before they're called done.

---

## OPEN RISKS (carried) — INHERITED from the pre-graphics-phase baton, NOT re-audited this chat

> These predate the Graphics Phase and were not re-verified here. Re-audit against current code
> before acting on any of them. A risk clears only when VERIFIED FIXED (test-backed).

| # | Sev | Risk | Evidence | Status (as last recorded 2026-06-10/11) |
|---|-----|------|----------|--------|
| 3 | HIGH | Idempotency on mutations. | `api/game_api.py` | PARTIAL — concurrency core fixed; general `Idempotency-Key` header + one-shot grants appear shipped in **open PR #16** (confirm/merge-audit). |
| 4/7 | HIGH | **Chain settlement not real** — deposit trusts no on-chain proof; treasury drain path; no txid replay protection / reconciliation / address validation. | `services/settlement_service.py`, `db/models.py`, `game_service.py` | OPEN — blocks any real value moving (Sprint 4 gate). |
| 8 | HIGH | **Web safety net** — vitest now runs in CI (PR #22), but Playwright e2e is still an `echo` stub; treasury-cap + chain-failure-rollback tests absent. | `web/package.json`, `.github/workflows/ci.yml` | PARTIAL. |
| 9 | MED | **Sim dormancy semantics** — can delay an earned harvest if `max_catchup_hours` lowered below a stage; skips lethal decay. Masked at default cap. | `simulation/engine.py` | OPEN — needs a design decision + knob guard. |
| 10 | MED | **Web: no global 401/403 handler** — stale key reads as "logged in" to a broken dashboard. | `web/src/lib/api/client.ts`, `RequireAuth.tsx` | OPEN. |
| 11 | LOW | Rate-limiter `memory://` per-worker (set Redis); `get_level` public oracle. | see fleet-sweep | PARTIAL — validation 500s→400 fixed earlier. |

> Reassuring (verified solid earlier, not re-checked here): no IDOR; auth/authz server-authoritative;
> AI SpendGuard unescapable + CI never hits a live key; ledger correct single-threaded; no
> model↔migration drift.
