# HANDOFF — the baton

> Single source of truth for **what the next chat does first**. Rewritten by `/closeout` at
> the end of every chat; read by `/handoff-audit` at the start of the next. If this file and
> the code disagree, the code wins — fix the baton. See `docs/SESSION_PROTOCOL.md`.

**Last rewritten:** 2026-06-14 · **By:** FTUE Epic closeout chat (DX-003)
**Active branch:** `claude/closeout-ftue-epic` (docs-only PR — see "Open PR" below)
**Open PR (awaiting audit):** **PR #43** — docs closeout; retires the graphics-phase baton, records
the FTUE epic as completed history. No code; gates green.
**Just merged to main (head `15f9699`):** the **FTUE epic** — **PR #34** (starter-grant rail),
**PR #35** (FTUE tutorial backend), **PR #39** (web `/ftue` guided route). Also live since the last
baton: **PR #29/#30** (Dashboard / GameState wiring polish), **PR #33** (Launch Strain Integration
Pack), **PR #36** (mobile-first responsive nav + Grow Chamber), **PR #38** (OMNI Charter v1.0).
**Parked (open PRs, green — do NOT modify):** **PR #27** Phenotype Generator Foundation,
**PR #28** Circadian Leaf Motion.

> **Phase change.** The Graphics Phase (whole-plant chamber, macro buds, canonical stage PNGs) and
> the Dashboard wiring polish are **done and signed off**. The studio has moved to the **New-Player
> / Launch-Readiness** track. The FTUE epic (sign up → guided first grow → harvest → sell → come
> back tomorrow) is the headline deliverable of this phase and is fully merged.

---

## NEXT ACTION (the one scoped item the next chat does)

**Feature Flags — web gating (PR #2).** The **backend flag core shipped** (BE-003, PR pending review):
`balance.yaml` `feature_flags:` defaults + `feature_flags.py` (env-overridable `FEATURE_<NAME>`,
fail-closed) + `GET /api/game/flags` + `require_feature`/`feature_required` guard. Defaults are ON, so
nothing is gated yet. **Next chat:** the web-gating PR — a `useFlag`/`RequireFeature` hook reading
`GET /api/game/flags`, then gate routes + nav visibility. This touches the **protected Navigation +
Layout surfaces**, so claim them in `STUDIO_AGENT_REGISTRY.md` and get Director sign-off first.
- **Off-limits:** no economy / chain / breeding / factions / combat / new crop families. No new
  Phase-2 systems. No per-player flag table (deferred). Do NOT modify the parked PRs (#27, #28).
- **Reuse, don't rebuild:** the chamber renders through `web/src/lib/chamber/chamberCore.ts`
  (single source for the live component + the headless `npm run gen:stages` generator) — keep it
  intact. The flat `GET …/plants/<id>/state` wire is canonical (see DECISIONS 2026-06-14); do not
  build the aspirational `GameState/EnvironmentState/UIState` aggregate.
- **Critical path:** **Feature Flags → Mobile Polish → Playtesting → Retention Validation → MVP
  Launch Candidate.** (Mobile Polish is partly underway: PR #36 shipped responsive nav + chamber.)

---

## What THIS chat did

Shipped and merged the **FTUE epic** — the player-facing onboarding that turns a fresh signup into a
completed first grow, on **existing rails** (no new economy, no Phase-2):

- **PR #34 — starter-grant rail.** Signup grants a free Starter Pod + starter seed, one-shot and
  idempotent via a `grant_claims` unique index (`GameService.grant_starter_items`). Migration
  `c7ecd7523cc8`.
- **PR #35 — FTUE tutorial backend.** A guarded deterministic step machine on `Player.ftue_step`
  (`welcome → plant → water → environment → grow → harvest → completed`); each `advance` performs
  the **real** game action (`plant_seed`, `water`, `set_environment`, `harvest_plant`+sell) and is
  refused if out-of-sync or already completed (no replay). **Per-step AI Master Grower coaching**
  (`ai/ftue_coach.py`) returns deterministic scripted `AdvisorReport`s through the real advisor
  schema — works in CI with no live key. **Tutorial-only time-compression** (the `grow` step):
  backdates the tutorial plant's `planted_at` so the chamber renders a mature flowering plant and
  sets `last_tick_at = now` so the authoritative catch-up does **not** retro-decay it — scoped to
  the single tutorial plant, global sim/time untouched, no auto-care/economy change. Endpoints:
  `GET /ftue/status`, `GET /ftue/coaching/<step>`, `POST /ftue/advance`. Migration `9d669edf48a8`
  (`Player.ftue_step`/`ftue_plant_id`/`ftue_completed_at`, `server_default` backfills the NOT NULL
  step).
- **PR #39 — web `/ftue` guided route.** RequireAuth-gated; renders the Master Grower coaching +
  one primary action per step driving `POST /ftue/advance`, the live tutorial plant via the existing
  `PlantVisual`/`StatBars` (reuse), a "Skip tutorial" escape, and a completion panel pointing to
  tomorrow's daily stipend. Fresh signups route to `/ftue`; returning sign-ins and existing players
  are unchanged (no auto-divert despite the `welcome` backfill default).

## Verification split (this chat)

**Agent-verifiable (proven, per-PR before merge):**
- Backend (#34/#35): `make test` **231 passed** (5 new FTUE E2E: signup → walk every step →
  completed with harvest credited; scripted coaching; out-of-sync / past-completed / auth guards) ·
  `make lint` ✅ · `make check-migrations` single head `9d669edf48a8` ✅ · `make check-memory` ✅.
  Each migration verified to apply cleanly on a fresh DB.
- Web (#39): `tsc --noEmit` ✅ · `next lint` ✅ · `next build` ✅ (`/ftue` in the route manifest) ·
  `vitest` **119/119** ✅.
- This docs closeout: `make check-memory` ✅ (+ `make test` / `make lint` re-run; no code changed).

**Device/human-verifiable (owner — the actual deliverable):**
- Sign up a **fresh** account → confirm you land on `/ftue` → step through plant → water → climate →
  grow → harvest and confirm: the Master Grower coaching reads correctly per step, the plant appears
  and matures (flowering after "grow"), the harvest credits GROW, and the completion panel routes to
  the dashboard. (No headless browser in CI screenshots the flow — the pixels/UX are owner-verified.)

---

## OPEN RISKS (carried) — NOT re-audited this chat

> These predate this chat and were not re-verified here (the FTUE epic was additive web + service
> orchestration on existing rails; it did not touch chain/limiter/settlement). Re-audit against
> current code before acting. A risk clears only when VERIFIED FIXED (test-backed).

| # | Sev | Risk | Evidence | Status |
|---|-----|------|----------|--------|
| 3 | HIGH | Idempotency on mutations — general `Idempotency-Key` header (duplicate → original response, not a 409). | `api/game_api.py` | PARTIAL — concurrency core + one-shot grants shipped (`grant_claims`, harvest-once index); FTUE `advance` is replay-guarded. General header still absent. |
| 4/7 | HIGH | **Chain settlement not real** — deposit trusts no on-chain proof; treasury-drain path; no txid replay protection / reconciliation / address validation. | `services/settlement_service.py`, `db/models.py` | OPEN — blocks any real value moving (Sprint 4 gate). |
| 8 | HIGH | **Web safety net** — vitest runs in CI; Playwright e2e is still an `echo` stub; treasury-cap + chain-failure-rollback tests absent. | `web/package.json`, `.github/workflows/ci.yml` | PARTIAL. |
| 9 | MED | **Sim dormancy semantics** — large `max_catchup_hours` gaps can delay an earned harvest / skip lethal decay; needs a design decision + knob guard. (FTUE sidesteps it for the tutorial plant via `last_tick_at = now`; the general knob is unchanged.) | `simulation/engine.py` | OPEN. |
| 11 | LOW | Rate-limiter `memory://` per-worker (set Redis for multi-worker); `get_level` public oracle. | fleet-sweep audit | PARTIAL. |

**Cleared since last baton:** *Web global 401/403 handler* (prev RISK #10) — an `AuthErrorListener`
tears down the session on a rejected key, shipped in **PR #30** (see `DECISIONS.md` 2026-06-14).

> Reassuring (verified solid earlier, not re-checked here): no IDOR; auth/authz server-authoritative;
> AI SpendGuard unescapable + CI never hits a live key; ledger correct single-threaded; no
> model↔migration drift (single head `9d669edf48a8`).
