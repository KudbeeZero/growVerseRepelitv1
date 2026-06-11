# HANDOFF — the baton

> Single source of truth for **what the next chat does first**. Rewritten by `/closeout` at
> the end of every chat; read by `/handoff-audit` at the start of the next. If this file and
> the code disagree, the code wins — fix the baton. See `docs/SESSION_PROTOCOL.md`.

**Last rewritten:** 2026-06-10 · **By:** API-validation-hardening chat
**Active branch:** `claude/api-validation-hardening`
**Merged to main:** PR #3 (protocol+gates+sim cap), #8 (fleet sweep + SQLite parity),
#9 (concurrency core), #10 (web viz fixes, lands #6), #11 (validation 500s→400 +
money-endpoint HTTP tests; coverage 79.3%→**80.0%**, 197 tests) — all CI-green.
**Held cross-session PRs (need rebase, not button-merge):** #7 (maintenance, baton conflicts),
#2 (stale-base forecast), #5 (docs + prod-deploy), #4 (**migration fork — would break prod** +
`GPE_DEV_LOGIN` default-on). New since: #12/#14 (terpene engine, #14 supersedes #13),
#15 (GROVERS hero) — owner-held, not this session's scope.
**PR #11 audited 2026-06-11:** CONCERNS — all code claims verified with evidence, gates green;
findings were protocol-level (this baton was half-rewritten — corrected below — and RISK #8's
mint blind spot had dropped out of the ledger text — restored). Report:
`docs/audits/PR-11-api-validation-hardening.md`. Owner approved proceeding to the NEXT ACTION.

> **Bomb Squad addendum (2026-06-10, same day, separate branch):** fixed two lifecycle
> defects in `web/src/components/viz/Constellation.tsx` — (1) reduced-motion users got a
> permanently blank canvas (ResizeObserver's initial async callback reset `canvas.width`
> after the single static draw); (2) unhandled `pointercancel` could strand `dragging=true`
> (phantom pan + particle velocity injection). RAF lifecycle audited and confirmed inert.
> Source-contract tripwires added in `web/src/components/viz/__tests__/constellationLifecycle.test.ts`
> (incl. sacred-render hashes pinning leafParticles/graphParticles/step/draw). Full report:
> `night-reports/BOMB-SQUAD-2026-06-10.md`. Note: web CI still doesn't execute vitest —
> recommended follow-up in the report. The NEXT ACTION below is unchanged.

---

## NEXT ACTION (the one scoped item the next chat does)

**Finish idempotency: general `Idempotency-Key` header + one-shot-grant uniqueness (RISK #6
remainder).** The concurrency *core* landed in PR #9 (optimistic lock + CHECK + harvest-once +
409-on-conflict), so double-spend / double-harvest / negative-balance are now DB-impossible. What
remains is the nicer-UX + faucet side:
- An `Idempotency-Key` request header on money mutations → a small table storing
  `(player_id, key) → {response, status}` with a unique constraint; on a duplicate key, **replay
  the original response** (instead of today's 409). Store the key in the *same* transaction as the
  effect so they commit atomically.
- One-shot-grant uniqueness: daily stipend per `(player_id, day)` and achievement per
  `(player_id, key)` (a tiny claims table or a scoped unique index) so a raced double-claim can't
  double-pay the faucet.
- Tests: duplicate-key replay returns the original body; concurrent stipend claim pays once.

- **Scope:** `api/` (header plumbing), one migration + small table(s), `progression_service.py`, tests.
- **Risks:** the idempotency store holds *responses*, not money truth — the ledger stays
  authoritative. Transaction boundary: key-store and effect must commit together. Watch single-head.
- **Off-limits:** chain settlement (RISK #7), web, sim.

---

## What the LAST chat did (PR #11)

> Corrected 2026-06-11: the original closeout left the previous chat's narrative here.

**API-validation hardening** (RISK #11 + RISK #8 partial):
- **`validation.number()`** — finite-float-in-range coercer (rejects NaN/inf/non-numeric),
  `api/validation.py`.
- **`set_environment`** validates its 5 sensor params → 400 (raw values used to TypeError on the
  next sim read of every plant in the pod → 500).
- **`advisor/auto-care`** validates `budget`/`max_actions` → 400, kept separate from the route's
  404 plant-not-found mapping.
- **`create_player`** strips + length-checks username, pre-checks email uniqueness → 400 (was a
  201 junk account / 500 IntegrityError).
- **+8 HTTP-boundary tests** in `tests/test_security.py`: withdraw/deposit auth (401), wrong-key +
  cross-player IDOR (403), bad-amount (400), + the four validation-400 regressions.
- Second commit added a read-only permission allowlist to `.claude/settings.json`
  (scope-adjacent; flagged in the audit).

## Verification split (PR #11)

**Agent-verifiable (proven — test-backed; re-confirmed by the 2026-06-11 audit):**
- `make test` → **197 passed, coverage 80.0% ≥ 79** · `make lint` ✅ · `make check-memory` ✅ ·
  `make check-migrations` ✅ (head `f1a2b3c4d5e6`).
- Edge-path behavior changes (audit note, all junk-input paths): `max_actions` out of 1..100 was
  clamped → now 400; whitespace-padded usernames were stored verbatim → now stripped; out-of-range
  sensor values were accepted → now 400. Happy paths unchanged.

**Device/human-verifiable (owner):**
- Confirm the **409-on-conflict** UX is acceptable for double-clicks until the idempotency-key
  header lands (NEXT ACTION makes a duplicate replay the original response instead).
- Decide sim dormancy semantics (RISK #9); chain-settlement (RISK #7) is TestNet-gated.

---

## OPEN RISKS (carried) — clears only when VERIFIED FIXED (test-backed)

| # | Sev | Risk | Evidence | Status |
|---|-----|------|----------|--------|
| 1 | HIGH | Phantom integrity gates / no CI. | was `Makefile`/`BACKLOG.md` | **FIXED 2026-06-10** (PR #3, CI green on real runner). |
| 2 | HIGH | Sim compute-on-read unbounded convergence. | `tests/test_simulation.py` | **FIXED 2026-06-10** (dormancy-snap; ADR in `DECISIONS.md`). |
| 3 | HIGH | No idempotency keys on mutations. | `api/game_api.py` | PARTIAL — concurrency core fixed (RISK #6); general `Idempotency-Key` header is the NEXT ACTION. |
| 4 | MED→HIGH | **Chain settlement not real** — see RISK #7 (re-scoped by the sweep). | `services/settlement_service.py` | OPEN. |
| 5 | — | SessionStart hook was phantom. | was `BACKLOG.md` | **FIXED 2026-06-10**. |
| 6 | HIGH | **No concurrency control on money/state paths.** Check-then-act, no row lock; `Wallet.version` dead. | `economy/ledger.py`, `db/models.py`, `simulation_service.py:41-45` | **CORE FIXED 2026-06-10** — wallet optimistic lock + `CHECK>=0` + harvest-once + 409 (migration `f1a2b3c4d5e6`); test-backed. SQLite parity fixed (PR #8). **Remaining:** idempotency-key header + stipend/achievement uniqueness (NEXT ACTION); `/state` duplicate-PlantEvents (C1) still open. |
| 7 | HIGH | **Chain deposit trusts no on-chain proof.** Treasury→treasury no-op + DB-only `asa_balance` gate → withdraw/move-off/re-deposit drains treasury. No txid replay protection, no reconciliation, no address validation. | `settlement_service.py:116-140`, `db/models.py:92`, `game_service.py:123-129` | OPEN — blocks any real value moving (Sprint 4 gate). |
| 8 | HIGH | **Web safety net is phantom** — e2e/vitest stubbed to `echo`, absent from devDeps + CI; treasury-cap + chain-failure rollback untested. | `web/package.json`, `.github/workflows/ci.yml`, coverage | PARTIAL — money-endpoint HTTP auth/IDOR/validation tests **added** (withdraw/deposit), F5 limiter fixed (PR #9). Remaining: real vitest/Playwright in CI, treasury-cap (F2) + chain-failure-rollback (F3) tests, **mint-endpoint HTTP auth/IDOR tests** (restored 2026-06-11 — had silently dropped from this row). |
| 9 | MED | **Sim dormancy semantics** — shifts `stage_entered_at`, can delay an earned harvest if `max_catchup_hours` is lowered below a stage; skips lethal decay. Masked at default cap. | `simulation/engine.py:285-294` | OPEN — needs a design decision + knob guard. |
| 10 | MED | **Web: no global 401/403 handler** — stale key = "logged in" to a broken dashboard, no re-auth path. | `web/src/lib/api/client.ts`, `RequireAuth.tsx` | OPEN. |
| 11 | LOW | Validation 500s (dup-email, username, `set_environment`, auto-care budget); rate-limiter `memory://` per-worker (set Redis); `get_level` public oracle. | see fleet-sweep | PARTIAL — **validation 500s→400 FIXED** (test-backed; `set_environment`, auto-care, dup-email, blank username). Remaining: Redis rate-limit storage (config), `get_level` gating. |

> Reassuring (verified solid, not assumed): **no IDOR**, auth/authz server-authoritative; **AI
> SpendGuard** unescapable + CI never hits a live key; ledger correct single-threaded; **no
> model↔migration drift**; "401 race" does not reproduce; `NEXT_PUBLIC_API_BASE` fallback robust.
