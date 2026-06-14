# HANDOFF — the baton

> Single source of truth for **what the next chat does first**. Rewritten by `/closeout` at
> the end of every chat; read by `/handoff-audit` at the start of the next. If this file and
> the code disagree, the code wins — fix the baton. See `docs/SESSION_PROTOCOL.md`.

**Last rewritten:** 2026-06-14 · **By:** bud-weight-physics + canonical-PNG chat
**Active branch:** `claude/bud-weight-physics-polish-7daxpa` (PR #26, base `main`)
**Just merged to main:** **PR #25** (De-Grape, 2026-06-14). **Merging now:** **PR #26** (Bud Weight
Physics) — which carries **PR #29** (Canonical Stage PNG Generation) on the same branch; both land
together. Owner gave visual sign-off on #25/#26 via the canonical stage stills (2026-06-14).
**Parked (open PRs, green — do NOT modify):** **PR #27** Phenotype Generator Foundation, **PR #28**
Circadian Leaf Motion.

> **⚠️ Baton was stale before this chat.** This file had been frozen at the 2026-06-10 *backend*
> phase (idempotency/concurrency) while the entire **Graphics Phase** (PRs ~#13–#25: grow-chamber
> renderer, macro-bud system, whole-plant architecture, per-strain leaf morphology, stage-reference
> grid) landed without updating it. This chat rewrote the baton to the graphics track. The
> inherited **backend OPEN RISKS below were NOT re-audited** during the graphics phase — they are
> carried forward verbatim and flagged as such. A chat returning to backend work must re-verify
> them against current code (note: RISK #6's idempotency remainder appears to have shipped in the
> still-open PR #16 — confirm before acting).

---

## NEXT ACTION (the one scoped item the next chat does)

**PR #30 — Dashboard / GameState Wiring Polish.** With the whole-plant chamber visuals signed off
(#25/#26) and the canonical-stage generator landed (#29), the next build PR unifies the
chamber/dashboard game-state wiring (`GameState · PlantState · EnvironmentState · UIState · BudState`
per `knowledge/whole-plant-architecture.md` § State). Then **PR #31 — MVP Launch Candidate**.
- **Visual/UX-only track.** No economy / chain / breeding / factions / combat / tomato / crop
  families. Do NOT start organic-geometry / mutation rendering yet.
- **Do NOT modify PR #27 (Phenotype) or PR #28 (Circadian)** — both parked and green.
- **Reuse, don't rebuild:** the chamber now renders through `web/src/lib/chamber/chamberCore.ts`
  (shared by the live component and the headless `npm run gen:stages` generator). Keep that single
  source intact.
- **Macro Bud Polish II** (BACKLOG, *not launch-blocking*): sharper calyx ridges / denser nesting /
  reduce the smooth-oval look on the PDP *macro* bud — macro view only; whole-plant is signed off.

---

## What THIS chat did

**PR #25 — De-Grape Whole Plant Buds** (visual-only). Chamber flower sites read as grapes (loose
circles) because `drawFlowerSite` painted only a stem axis + discrete teardrop calyx pods, which
are too small to overlap at chamber distance. Ported the macro renderer's solid-core idea down to
the chamber:
- Each `FlowerSite` now paints **one continuous bud-mass silhouette** behind its calyxes —
  overlapping per-cluster blobs fused into a single fill, each reaching ~70% of the way to its
  neighbour so the gaps close into a stacked solid column; calyxes/pistils/trichomes ride on top
  as texture. Width follows the existing per-cluster width curve, so silhouettes stay
  strain-recognisable (G13 slim spear cola; PDP / Animal Mints chunky stacked masses); top cola +
  node/tip sites flow through the same path and merge near the apex.
- Cluster placement is precomputed once and shared by the mass fill and the texture pass
  (lock-step sway); cost is one gradient + one fill per site per frame. Pure logic
  (`morphology`/`budDna`/`strainVisuals`) untouched.
- Docs: ADR in `DECISIONS.md` (2026-06-13); `🎨 Graphics Phase II` tracker in `BACKLOG.md` (PR #25
  ✅, PR #26–30 queued); standup `2026-06-13-lut-report.md`; kickoff audit receipt.

## Verification split (this chat)

**Agent-verifiable (proven):**
- Web: `tsc --noEmit` ✅ · `next lint` ✅ · `next build` ✅ · `vitest run` **100/100** ✅ (Constellation
  sacred-render hashes untouched — that file not modified).
- Backend (no Python changed): `make test` **223 passed, 80.83% ≥ 79** ✅ · `make lint` ✅ ·
  `make check-memory` ✅.

**Device/human-verifiable (owner — the actual deliverable):**
- The pixels. No headless browser in CI to screenshot the chamber. Open a flowering plant in the
  chamber view for G13 / Purple Diddy Punch / Animal Mints and confirm the buds read as continuous
  stacked colas, not grapes (spear cola for G13; chunky masses for PDP/Animal Mints; frost on
  Animal Mints), silhouettes are continuous, and performance is stable.

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
