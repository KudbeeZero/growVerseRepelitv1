# HANDOFF — the baton

> Single source of truth for **what the next chat does first**. Rewritten by `/closeout` at
> the end of every chat; read by `/handoff-audit` at the start of the next. If this file and
> the code disagree, the code wins — fix the baton. See `docs/SESSION_PROTOCOL.md`.

**Last rewritten:** 2026-06-14 · **By:** simulation-test-clock chat (BE-002, STEP 3)
**Active branch:** `claude/simulation-test-clock-u4ounm` (**PR #47**, base `main`) — awaiting review.
**Just shipped (this chat):** **PR #47** — the dev/test-only Simulation Test Clock (STEP 3 of the
Builder Dept Launch-Readiness path). Backend-only, off by default, force-disabled in production.
**Recent main (per git log, NOT the old baton):** FTUE work landed — #34 starter-grant rail, #35/#39
guided tutorial, #36 mobile-first responsive, #38 OMNI Charter. The graphics-phase PRs (#25/#26/#29)
referenced by the previous baton are in history; **the code is the truth — git log won.**

> **Launch-Readiness path (Builder Dept):** Feature Flags → **STEP 3 Simulation Test Clock ✅ (this
> chat, PR #47)** → **STEP 4 e2e Grow Loop (NEXT)** → Launch Readiness. The backend OPEN RISKS below
> are still **inherited and NOT re-audited** — they predate both the graphics and FTUE phases. A chat
> touching chain/economy/web-safety must re-verify them against current code before acting.

---

## NEXT ACTION (the one scoped item the next chat does)

**STEP 4 — e2e Grow Loop.** Drive the full core loop end-to-end — grow → care → harvest → cure →
sell — as an automated test/flow, using the **STEP 3 test clock** (`POST /api/dev/clock/advance`,
enabled via `GROW_TEST_CLOCK=true APP_ENV=development`) to fast-forward through stages in seconds.
- **Reuse the clock, don't rebuild it.** The seam is `OffsetClock`/`active_clock()` in
  `simulation/clock.py` and the `/api/dev/clock/*` endpoints (`api/dev_api.py`). See
  `docs/SIMULATION_TEST_CLOCK.md`.
- **Backend/test track.** Add the HTTP-boundary coverage RISK #8 calls for (withdraw/deposit/mint
  and the grow-loop happy path); `game_api.py` is thinly covered at the HTTP layer.
- **Honour the invariants:** server-authoritative sim, ledger double-entry, money is `Decimal`.
  Do NOT change economy balance/prices to make a test pass — tune `balance.yaml` data, not rules.
- **Do NOT** modify any parked graphics PRs if still open; this is not a visual-track chat.

---

## What THIS chat did

**PR #47 — Simulation Test Clock (BE-002, STEP 3).** A dev/test-only clock that fast-forwards grow
time so the grow loop can be tested in seconds, without touching the economy or real players. The
engine is already **compute-on-read** (state = pure function of stored state + `clock.now()`), so the
clock is just an `OffsetClock` (wall time + a mutable, **forward-only** offset) on the existing
`Clock` seam — **zero new simulation logic**.
- `simulation/clock.py`: `OffsetClock` + process singleton (`get_test_clock`/`reset_test_clock`) +
  `active_clock()` selector. `config.py`: `APP_ENV`/`is_production` + `test_clock_enabled =
  GROW_TEST_CLOCK AND not production` (**force-disabled in prod**).
- `services/simulation_service.py` default clock now resolves through `active_clock()` (explicit
  injection still wins) → reads pick up the shift centrally.
- `api/dev_api.py`: `/api/dev/clock` {GET, `/advance`, `/reset`}, registered only when enabled
  (`flask_api.py`) and re-guarded per request (404 otherwise). Advance is >0, ≤8760h, syncs living
  plants.
- Advancing time posts **NO ledger entries** (economy untouched) — proven by
  `test_advance_does_not_touch_the_economy`. Docs: ADR (`DECISIONS.md`),
  `docs/SIMULATION_TEST_CLOCK.md`, BACKLOG Launch-Readiness path, standup `2026-06-14-lut-report-be002.md`.

## Verification split (this chat)

**Agent-verifiable (proven):**
- Backend: `make test` **246 passed, 81.92% ≥ 79** ✅ · `make lint` ✅ · `make check-memory` ✅ (22 files).
- New `tests/test_test_clock.py` (15): OffsetClock primitive, config gating (off by default / on in
  dev / **force-off in prod**), `active_clock()` selector, endpoints (absent when disabled, advance
  progresses a plant, **no economy mutation**, reset). Web untouched (no web gates run).

**Device/human-verifiable (owner):**
- Run `GROW_TEST_CLOCK=true APP_ENV=development make serve`; `POST /api/dev/clock/advance {"days":40}`
  and confirm a seed reaches flowering on the next `/state` read; confirm the `/api/dev/clock` routes
  **404 when the flag is unset**.

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
