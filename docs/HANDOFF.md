# HANDOFF — the baton

> Single source of truth for **what the next chat does first**. Rewritten by `/closeout` at
> the end of every chat; read by `/handoff-audit` at the start of the next. If this file and
> the code disagree, the code wins — fix the baton. See `docs/SESSION_PROTOCOL.md`.

**Last rewritten:** 2026-06-10 · **By:** API-validation-hardening chat
**Active branch:** `claude/api-validation-hardening`
**Merged to main:** PR #3 (protocol+gates+sim cap), #8 (fleet sweep + SQLite parity),
#9 (concurrency core), #10 (web viz fixes, lands #6) — all CI-green. **This chat:** validation
500s→400 + money-endpoint HTTP tests (coverage 79.3%→**80.0%**, 197 tests).
**Held cross-session PRs (need rebase, not button-merge):** #7 (maintenance, baton conflicts),
#2 (stale-base forecast), #5 (docs + prod-deploy), #4 (**migration fork — would break prod** +
`GPE_DEV_LOGIN` default-on).
**Open PR awaiting audit:** _this branch's PR; next chat runs `/handoff-audit`._

> **Bomb Squad addendum (2026-06-10, same day, separate branch):** fixed two lifecycle
> defects in `web/src/components/viz/Constellation.tsx` — (1) reduced-motion users got a
> permanently blank canvas (ResizeObserver's initial async callback reset `canvas.width`
> after the single static draw); (2) unhandled `pointercancel` could strand `dragging=true`
> (phantom pan + particle velocity injection). RAF lifecycle audited and confirmed inert.
> Source-contract tripwires added in `web/src/components/viz/__tests__/constellationLifecycle.test.ts`
> (incl. sacred-render hashes pinning leafParticles/graphParticles/step/draw). Full report:
> `night-reports/BOMB-SQUAD-2026-06-10.md`. Note: web CI still doesn't execute vitest —
> recommended follow-up in the report. The NEXT ACTION below is unchanged.

> **GROVERS-leaf addendum (2026-06-11, branch `claude/grovers-particle-leaf-i1s759`, PR #15):**
> audited a prior chat's claims (≈half were phantom) and made them real — leaf-mode neighbor
> mesh + hover/touch proximity repulsion in `Constellation.tsx` (sacred hashes untouched, verified
> 3×), `GroversWordmark.tsx` (GR + leaf-as-the-O + VERS v2) as the onboarding hero,
> `AnnouncementsBanner.tsx` above it, anti-bot framework spec in `BACKLOG.md`. Helper review
> (SHIP-WITH-FIXES → all landed: small-phone overflow, WCAG banner, touch-pan-y, passive wheel)
> + independent audit (PASS). Deferred perf items (edge batching etc., need a sacred re-pin) are
> in `BACKLOG.md`. Also: owner delegation charter + end-of-chat report convention added to
> `CLAUDE.md`; project-scoped permission allowlist widened in `.claude/settings.json` (destructive
> git denied); egg-info untracked. The NEXT ACTION below is unchanged.

---

## NEXT ACTION (the one scoped item the next chat does)

**Finish idempotency: general `Idempotency-Key` header + one-shot-grant uniqueness (RISK #6
remainder).** The concurrency *core* landed this chat (optimistic lock + CHECK + harvest-once +
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

## What THIS chat did

Landed the **concurrency core** of RISK #6 (the root cause from the fleet sweep):
- **Wallet optimistic locking** — `version_id_col` wired (the column was dead); removed the manual
  `wallet.version += 1` in `ledger.post()`. Concurrent debits can't both commit.
- **`CHECK(cached_balance >= 0)`** hard backstop + **`uq_harvests_plant`** (harvest-once), via
  migration `f1a2b3c4d5e6` (single head; `compare_metadata` clean → no drift).
- **409 on conflict** — `StaleDataError` → clean 409 in the error handler (was an opaque 500).
- **Fixed the F5 flaky rate-limit test** — `client` fixture resets limiter storage per test.
- +4 tests in `tests/test_concurrency.py` (double-spend blocked, harvest-once, CHECK floor,
  version bump). Docs: ADR in `DECISIONS.md`, ARCHITECTURE invariant #3 updated, BACKLOG + standup.

## Verification split (this chat)

**Agent-verifiable (proven — test-backed):**
- `make test` → **189 passed, coverage 79.26% ≥ 79** · `make lint` ✅ · `make check-memory` ✅ ·
  `make check-migrations` ✅ (head `f1a2b3c4d5e6`).
- `alembic upgrade head` on fresh sqlite + `compare_metadata` → **migration matches models (no drift)**.
- Optimistic lock proven with two real sessions racing the same wallet (loser → `StaleDataError`).

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
| 8 | HIGH | **Web safety net is phantom** — e2e/vitest stubbed to `echo`, absent from devDeps + CI; treasury-cap + chain-failure rollback untested. | `web/package.json`, `.github/workflows/ci.yml`, coverage | PARTIAL — money-endpoint HTTP auth/IDOR/validation tests **added** (withdraw/deposit), F5 limiter fixed (PR #9). Remaining: real vitest/Playwright in CI, treasury-cap (F2) + chain-failure-rollback (F3) tests. |
| 9 | MED | **Sim dormancy semantics** — shifts `stage_entered_at`, can delay an earned harvest if `max_catchup_hours` is lowered below a stage; skips lethal decay. Masked at default cap. | `simulation/engine.py:285-294` | OPEN — needs a design decision + knob guard. |
| 10 | MED | **Web: no global 401/403 handler** — stale key = "logged in" to a broken dashboard, no re-auth path. | `web/src/lib/api/client.ts`, `RequireAuth.tsx` | OPEN. |
| 11 | LOW | Validation 500s (dup-email, username, `set_environment`, auto-care budget); rate-limiter `memory://` per-worker (set Redis); `get_level` public oracle. | see fleet-sweep | PARTIAL — **validation 500s→400 FIXED** (test-backed; `set_environment`, auto-care, dup-email, blank username). Remaining: Redis rate-limit storage (config), `get_level` gating. |

> Reassuring (verified solid, not assumed): **no IDOR**, auth/authz server-authoritative; **AI
> SpendGuard** unescapable + CI never hits a live key; ledger correct single-threaded; **no
> model↔migration drift**; "401 race" does not reproduce; `NEXT_PUBLIC_API_BASE` fallback robust.
