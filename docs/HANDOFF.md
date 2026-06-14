# HANDOFF — the baton

> Single source of truth for **what the next chat does first**. Rewritten by `/closeout` at
> the end of every chat; read by `/handoff-audit` at the start of the next. If this file and
> the code disagree, the code wins — fix the baton. See `docs/SESSION_PROTOCOL.md`.

**Last rewritten:** 2026-06-14 · **By:** procedural-engine chat (PBSA charter — Engines 1–4)
**Active branch:** `claude/cannabis-growth-engine-s114yu` → **PR #58 (open, base `main`)** — the PBSA
plant-visual-engine track. PR #58 carries **Engines 3 & 4** (phyllotaxy + leaf orientation) **and
Engines 1 & 2** (apical-dominance multi-cola) — owner directed both on this branch (ART-004) and
confirmed keeping them unified in #58 (do not split unless audit finds a scope problem). **Status:
awaiting on-device sign-off → audit → review.** Engine 6 (G×E) is parked until #58 merges.
**Merged `main` into this branch** (to clear a docs-only conflict + unblock CI): `main` is at
`5d44d35` — PR #47 Simulation Test Clock + e2e (BE-002/BE-004), FTUE epic (#34/#35/#39), Feature
Flags (#42), Dashboard wiring (#29/#30), Launch Strain Pack (#33), mobile-nav (#36), OMNI Charter
(#38), REC-004 memory reconciliation. PR #58 is renderer-only on top of all that.
**Parked (open PRs, green — do NOT modify):** **PR #27** Phenotype Generator Foundation, **PR #28**
Circadian Leaf Motion.

> **Two parallel tracks.** This branch is the **PBSA plant-visual-engine** track (Engines 1–6,
> renderer-only). The studio's **Launch-Readiness** track (Builder Dept: Feature Flags ✅ → Sim Test
> Clock ✅ → e2e ✅ → Playtesting → Retention → MVP) continues independently on `main`; its consolidated
> ledger is `docs/memory/CANONICAL_STATE.md` and live coordination is `docs/STUDIO_AGENT_REGISTRY.md`.
> The backend OPEN RISKS below are carried from the studio baton (not re-audited by this renderer-only
> chat).

---

## NEXT ACTION (the one scoped item the next chat does)

**Drive PR #58 to green + reviewed (PBSA Engines 1–4).** Per the owner (2026-06-14): keep Engines 1–4
unified in #58; run **on-device sign-off** (multi-cola/apical-dominance visuals look right; stills
match live chamber; no mobile-layout regression; no perf regression; no unrelated UI changes), then
**audit PR #58**; do **not** start Engine 6 until #58 is reviewed, audited, and merged. CI on #58 was
blocked by a docs-only merge conflict with `main` — this chat merged `main` in to clear it; confirm CI
goes green on the merge commit.

**After #58 merges → Engine 6 — G×E whole-plant expression** (renderer-only, PBSA charter). The
remaining big believability lever: extend `knowledge/whole-plant-architecture.md` §Environmental
reactions to the *whole plant* (not just buds): high light → compact internodes · low light → stretch ·
cool nights → anthocyanin creep up the stem · strong airflow → thicker stems · heat → leaf claw. The
`climateModel` already exists in `morphology.ts` (and `growthMult` already nudges height); thread its
outputs into `buildPlant` internode/stem-width/leaf-claw and into the stem/leaf colour.
- **Reuse, don't rebuild:** the chamber renders through `web/src/lib/chamber/chamberCore.ts` (shared
  by the live `<GrowChamber>` and the headless `npm run gen:stages` generator). Engine modules are
  pure + tested: `phyllotaxy.ts` (3&4) and `apicalDominance.ts` (1&2). Keep them as single sources.
  **Verify visuals with `npm run gen:stages`** (`web/canonical-stages/*.png`, gitignored) — the only
  screenshot path. New per-strain knobs live on `Silhouette` (`morphology.ts`) + `strainVisuals.ts`.
- **Do NOT** touch economy / chain / db / api / wallets / dashboards (charter: work-order required).
- **Macro Bud Polish II** (BACKLOG, *not launch-blocking*): sharper calyx ridges / denser nesting on
  the PDP *macro* bud — macro view only; whole-plant chamber is the engine track's focus.

> **Studio Launch-Readiness track (parallel, on `main`):** Feature Flags ✅ → Sim Test Clock ✅ → e2e ✅
> → **STEP 4.5** (`GameService` on `active_clock()` + cure e2e, open on `claude/be-step45-active-clock`,
> clears RISK #1) → Playtesting → Retention → MVP. Owned by the Builder Dept, not this PBSA chat.

---

## What THIS chat did (PBSA Engines 1–4 → PR #58)

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

**Apical Dominance / Multi-Cola — Engines 1 & 2** (renderer-only). The chamber always grew exactly one
top cola. Added a strain `apicalDominance` knob (`Silhouette`) and a new pure
**`web/src/lib/chamber/apicalDominance.ts`** (`colaTops`, mass-conserving, unit-tested): high
dominance → 1 leader cola (spear, unchanged); low → up to 4 competing tops. `chamberCore.buildPlant`
promotes the top `count−1` nodes **in flower only** into upright co-colas (straightened tilt, extended
length, a scaled-down leader-sibling cola sized by mass share, node-buds/branchlets suppressed) and
scales the leader by `leaderShare` (≥0.62×). `apicalDominance = 1` ⇒ byte-identical single-cola path,
so veg + spear strains are unchanged. Authored per strain (G13/WFOG high → spear; PDP/White Rhino low
→ bush). ADR `DECISIONS.md` 2026-06-14; BACKLOG ✅.

**Integration:** merged current `main` (PR #47 sim-test-clock/e2e + the REC-004 reconciliation) into
this branch to clear a **docs-only** conflict (`HANDOFF.md`/`BACKLOG.md`/`DECISIONS.md`) — zero
source-code conflicts; the engine files are renderer-only and don't touch any path `main` changed —
and to unblock PR #58's CI (a conflicted PR can't produce a test-merge commit, so no checks ran).
Opened **PR #58** and updated it to cover Engines 1–4.

## Verification split (this chat)

**Agent-verifiable (proven):**
- Web: `tsc --noEmit` ✅ · `next lint` ✅ · `next build` ✅ · `vitest run` **134/134** ✅ (+9 phyllotaxy,
  +6 apicalDominance tests; Constellation sacred-render hashes untouched — that file not modified).
- Generated the full `npm run gen:stages` PNG matrix (7 strains × 5 stages + macro + motion) and
  **eyeballed them in-session** (G13 veg/late-flower, PDP late-flower, White Rhino veg, Animal Mints
  harvest, Gelato early-flower): spiral depth + varied leaf yaw present, single-vs-multi-cola contrast
  present, silhouettes intact, no NaN / vanished branches / artifacts.
- Backend carried from `main` (no Python changed by this branch); post-merge gates re-run after the
  conflict resolution — see the merge commit. `make check-memory` ✅ (new ADR/BACKLOG links resolve).

**Device/human-verifiable (owner — the actual deliverable):**
- The live chamber pixels + motion/perf. No headless browser drives the live `<GrowChamber>` in CI
  (the PNG generator is static stills). Open a veg and a flowering plant for G13 / Purple Diddy Punch
  / White Rhino and confirm: (3&4) branches wind around the stem with front/back depth (not flat left/
  right), leaves vary broad↔edge-on (not all camera-facing); (1&2) G13 grows ONE spear cola while
  PDP/White Rhino grow a leader + competing upright tops (a bush); silhouettes still recognisable; and
  airflow sway + bud-weight droop still read correctly. Plus: no mobile-layout regression, no perf
  regression, no unrelated UI changes (owner's PR #58 checklist). **Engines 1–4 need device sign-off.**

---

## OPEN RISKS (carried) — re-verify against current code before acting

> A risk clears only when VERIFIED FIXED (test-backed). Risk #1 is new (STEP 4).

| # | Sev | Risk | Evidence | Status |
|---|-----|------|----------|--------|
| 1 | MED | **Cure/auction not dev-clock-drivable.** `GameService` defaulted to `SystemClock`, so the dev clock couldn't fast-forward cure/auction over HTTP. | `services/game_service.py:82` | **FIXED in the open STEP 4.5 PR** (`GameService` → `active_clock()`, + cure e2e). Clears on merge. |
| 3 | HIGH | Idempotency on mutations — general `Idempotency-Key` header (duplicate → original response, not a 409). | `api/game_api.py` | PARTIAL — concurrency core + one-shot grants shipped (`grant_claims`, harvest-once index); FTUE `advance` replay-guarded. General header absent (WIP PR #16 closed unmerged). |
| 4/7 | HIGH | **Chain settlement not real** — deposit trusts no on-chain proof; treasury-drain path; no txid replay protection / reconciliation / address validation. | `services/settlement_service.py`, `db/models.py` | OPEN — blocks any real value moving (Sprint 4 gate). |
| 8 | HIGH | **Safety net** — **backend HTTP boundary now covered (PR #47: withdraw/deposit/mint/nft, `tests/test_http_boundary.py`)**; **web** Playwright real e2e still a stub; treasury-cap + chain-failure-rollback UI tests absent. | `web/package.json`, `.github/workflows/ci.yml`, `tests/test_http_boundary.py` | PARTIAL (backend ↑; relates to open PR #32). |
| 9 | MED | **Sim dormancy semantics** — large `max_catchup_hours` gaps can delay an earned harvest / skip lethal decay; needs a design decision + knob guard. (FTUE sidesteps it for the tutorial plant via `last_tick_at = now`.) | `simulation/engine.py` | OPEN. |
| 11 | LOW | Rate-limiter `memory://` per-worker (set Redis for multi-worker); `get_level` public oracle. | fleet-sweep audit | PARTIAL. |

**Cleared earlier:** *Web global 401/403 handler* (prev RISK #10) — an `AuthErrorListener` tears down
the session on a rejected key, shipped in **PR #29/#30** (see `DECISIONS.md` 2026-06-14).

> Reassuring (verified solid earlier, not re-checked here): no IDOR; auth/authz server-authoritative;
> AI SpendGuard unescapable + CI never hits a live key; ledger correct single-threaded; no
> model↔migration drift (single Alembic head).

---

## DIRECTOR DECISIONS (resolved 2026-06-14)

**BE-004A — PR reconciliation (this chat):**
1. **PR #47** — **CANONICAL** for the Simulation Test Clock; preserve `OffsetClock` / `active_clock()`
   / `/api/dev/clock/{,advance,reset}` / dev-only gating (`GROW_TEST_CLOCK` + `APP_ENV`, prod
   hard-disable). Conflicts resolved + **merged** this chat (owner-approved exception to
   one-PR-one-responsibility, since BE-004 was already built+green on the branch). ✅
2. **PR #44** — **closed** as superseded by #47. ✅
3. **PR #32** — service-layer e2e + a CI gate step; now overlaps #47's HTTP e2e. **Owner decision
   pending:** merge for the CI gate, or close as overlapping. ⬜
4. **BE-004** — **closed/complete** (its deliverables shipped within PR #47). ✅

**REC-004 (prior sweep, still in force):**
- **PR #43** owner-merged (folded into REC-004). **PR #37** closed (superseded by the FTUE epic; WO-1/
  WO-2 logged to BACKLOG). **Branch pruning** approved — recommended list in
  `docs/memory/CANONICAL_STATE.md` §3; owner executes (destructive git is owner-only).
