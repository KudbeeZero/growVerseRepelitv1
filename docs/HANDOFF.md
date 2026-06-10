# HANDOFF — the baton

> Single source of truth for **what the next chat does first**. Rewritten by `/closeout` at
> the end of every chat; read by `/handoff-audit` at the start of the next. If this file and
> the code disagree, the code wins — fix the baton. See `docs/SESSION_PROTOCOL.md`.

**Last rewritten:** 2026-06-10 · **By:** 10-agent fleet sweep + dev/prod-parity fix chat
**Active branch:** `claude/fleet-audit-hardening`
**Merged to main:** PR #3 (protocol + integrity gates/CI + sim cost cap) — CI green on `main`.
**Open PR awaiting audit:** _this branch's PR — run `/handoff-audit` on it next chat._

---

## NEXT ACTION (the one scoped item the next chat does)

**Concurrency + idempotency hardening on the money paths (OPEN RISK #3, now widened by the
fleet sweep to RISK #6).** The fleet sweep proved the root cause is broader than retries: every
state-mutating path is *check-then-act with no row locking*, and `Wallet.version` is dead code
(incremented in `ledger.post()` but never wired as `version_id_col`). Two concurrent requests
double-spend, double-harvest (mint free GROW), double-stipend, and overrun the treasury cap.

Do, in one PR:
- Row-lock the wallet in `ledger.post()` (`with_for_update()` on Postgres) **or** wire
  `__mapper_args__={"version_id_col": version}` + retry on `StaleDataError`; add a DB
  `CHECK(cached_balance >= 0)` backstop.
- Lock/serialize harvest (`game_service.py:765-796`) and add DB unique constraints for one-shot
  grants (stipend per `(player_id, day)`, achievement per `(player_id, key)`).
- Add an `Idempotency-Key` header on money mutations → persist key→response with a unique
  constraint, replay on duplicate, ~24 h expiry.
- Tests: a two-session concurrent-debit race proving no double-spend, **plus** fix the F5 flaky
  limiter test (autouse fixture that resets limiter storage per test).

- **Scope:** `economy/ledger.py`, the money services, one migration, `api/`, tests. No web/chain.
- **Risks:** keep the idempotency store as *responses*, not a second money truth — the ledger
  stays authoritative. Watch single-head (`make check-migrations`).
- **Off-limits:** chain settlement (that's RISK #7, its own PR), sim, web.

---

## What THIS chat did

Ran a **10-agent parallel read-only sweep** (auth, economy, sim, chain, API-sec, DB, web, AI,
tests/CI, concurrency). Full notes: `docs/audits/2026-06-10-fleet-sweep.md`. Then:
- **Fixed dev/prod parity (RISK #6a — FIXED):** `db/session.py` now sets
  `PRAGMA foreign_keys=ON; busy_timeout=5000; journal_mode=WAL` on SQLite via a connect listener,
  so dev/test match prod Postgres (FK enforcement was OFF). Suite stays green (185) → no latent FK
  violations. Removed an orphan `a51c9c36f5a6_drift_probe.pyc`.
- Recorded every finding in the carried-risks ledger below and a 2026-06-10 standup addendum.

## Verification split (this chat)

**Agent-verifiable (proven — test-backed):**
- `make test` → **185 passed, coverage 79.23% ≥ 79** (now WITH SQLite FK enforcement + WAL) ·
  `make lint` ✅ · `make check-memory` ✅ · `make check-migrations` ✅.
- The sweep ran a live Postgres + `compare_metadata` → **no model↔migration drift** confirmed.

**Device/human-verifiable (owner):**
- Decide sim dormancy semantics (SIM-1/SIM-2) — suspended-animation vs. continue-decay.
- The chain-settlement (RISK #7) findings are exploitable only once **real ASA value moves**;
  confirm on TestNet when Sprint 4 starts.

---

## OPEN RISKS (carried) — clears only when VERIFIED FIXED (test-backed)

| # | Sev | Risk | Evidence | Status |
|---|-----|------|----------|--------|
| 1 | HIGH | Phantom integrity gates / no CI. | was `Makefile`/`BACKLOG.md` | **FIXED 2026-06-10** (PR #3, CI green on real runner). |
| 2 | HIGH | Sim compute-on-read unbounded convergence. | `tests/test_simulation.py` | **FIXED 2026-06-10** (dormancy-snap; ADR in `DECISIONS.md`). |
| 3 | HIGH | No idempotency keys on mutations. | `api/game_api.py` | OPEN — folded into RISK #6 (NEXT ACTION). |
| 4 | MED→HIGH | **Chain settlement not real** — see RISK #7 (re-scoped by the sweep). | `services/settlement_service.py` | OPEN. |
| 5 | — | SessionStart hook was phantom. | was `BACKLOG.md` | **FIXED 2026-06-10**. |
| 6 | HIGH | **No concurrency control on money/state paths.** Check-then-act, no row lock; `Wallet.version` dead. Double-spend / double-harvest / double-stipend / treasury-cap overrun / duplicate PlantEvents on `/state`. | `economy/ledger.py:61-71`, `db/models.py:76`, `simulation_service.py:41-45`, `settlement_service.py:54-98` | OPEN → **NEXT ACTION**. (6a SQLite parity FIXED this chat.) |
| 7 | HIGH | **Chain deposit trusts no on-chain proof.** Treasury→treasury no-op + DB-only `asa_balance` gate → withdraw/move-off/re-deposit drains treasury. No txid replay protection, no reconciliation, no address validation. | `settlement_service.py:116-140`, `db/models.py:92`, `game_service.py:123-129` | OPEN — blocks any real value moving (Sprint 4 gate). |
| 8 | HIGH | **Web safety net is phantom** — e2e/vitest stubbed to `echo`, absent from devDeps + CI; `game_api.py` money/mint endpoints 40% covered, no HTTP auth/IDOR/validation tests; treasury-cap + chain-failure rollback untested; F5 limiter test order-flaky. | `web/package.json`, `.github/workflows/ci.yml`, coverage | OPEN. |
| 9 | MED | **Sim dormancy semantics** — shifts `stage_entered_at`, can delay an earned harvest if `max_catchup_hours` is lowered below a stage; skips lethal decay. Masked at default cap. | `simulation/engine.py:285-294` | OPEN — needs a design decision + knob guard. |
| 10 | MED | **Web: no global 401/403 handler** — stale key = "logged in" to a broken dashboard, no re-auth path. | `web/src/lib/api/client.ts`, `RequireAuth.tsx` | OPEN. |
| 11 | LOW | Validation 500s (dup-email, username, `set_environment`, auto-care budget); rate-limiter `memory://` per-worker (set Redis); `get_level` public oracle. | see fleet-sweep | OPEN — batch cleanup. |

> Reassuring (verified solid, not assumed): **no IDOR**, auth/authz server-authoritative; **AI
> SpendGuard** unescapable + CI never hits a live key; ledger correct single-threaded; **no
> model↔migration drift**; "401 race" does not reproduce; `NEXT_PUBLIC_API_BASE` fallback robust.
