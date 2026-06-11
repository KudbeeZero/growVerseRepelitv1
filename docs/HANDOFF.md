# HANDOFF — the baton

> Single source of truth for **what the next chat does first**. Rewritten by `/closeout` at
> the end of every chat; read by `/handoff-audit` at the start of the next. If this file and
> the code disagree, the code wins — fix the baton. See `docs/SESSION_PROTOCOL.md`.

**Last rewritten:** 2026-06-11 (night shift) · **By:** idempotency + night-board + review chat
(branch `claude/night-shift-pexjg3`)
**Active branch:** `claude/night-shift-pexjg3`
**Merged to main:** PR #3 (protocol+gates+sim cap), #8 (fleet sweep + SQLite parity),
#9 (concurrency core), #10 (web viz fixes, lands #6), #11 (validation 500s→400 + money-endpoint
HTTP tests) — all CI-green.
**Open PR awaiting audit:** **#16** (PR #11 audit + baton repair + `Idempotency-Key` replay +
one-shot grant claims — RISK #6 finished). Next chat runs `/handoff-audit` on it.
**Prev audit:** PR #11 audited 2026-06-11 → **CONCERNS** (code verified good; protocol findings:
half-rewritten baton — fixed in #16 — and RISK #8's mint blind spot dropped from the ledger —
restored). Report: `docs/audits/PR-11-api-validation-hardening.md`. Owner approved proceeding.
**Held cross-session PRs (need rebase, not button-merge):** #7 (maintenance, baton conflicts),
#2 (stale-base forecast), #5 (docs + prod-deploy), #4 (**migration fork — would break prod** +
`GPE_DEV_LOGIN` default-on). Owner-held since: #12/#14 (terpene engine; #14 supersedes #13),
#15 (GROVERS hero). **Note:** #4/#12/#14 carry migrations/models — any rebase must re-check
single-head against the new `b2c3d4e5f6a7` head.

---

## NEXT ACTION (the one scoped item the next chat does)

**Make the test safety net real (RISK #8).** The documented web gates are partly phantom and the
two riskiest money paths have no tests:
- **Web CI:** `web/package.json` has `test`/`test:e2e` stubbed to `echo` and vitest/Playwright are
  absent from devDeps and from `.github/workflows/ci.yml`. Install vitest for real, wire the
  existing unit specs (incl. `constellationLifecycle.test.ts` sacred-hash tripwires) into CI, and
  add a Playwright job (mocked-API config already exists in `web/e2e/` per BACKLOG history).
- **Money-boundary tests (backend):** treasury daily-cap (sweep F2) and chain-failure rollback
  (sweep F3) on withdraw/deposit — prove a failed chain call rolls the ledger back; plus the
  **mint-endpoint HTTP auth/IDOR tests** restored to this ledger on 2026-06-11.
- **Scope:** `web/package.json` + `web/` test configs, `.github/workflows/ci.yml`,
  `tests/test_settlement.py` (or a new `tests/test_money_boundaries.py`).
- **Risks:** CI runtime growth (cache browsers/deps); flaky e2e — keep the mocked-API pattern, no
  live backend in CI. Don't touch settlement *logic* (RISK #7 is its own gated item) — tests only.
- **Off-limits:** chain settlement implementation (RISK #7), sim semantics (RISK #9), gameplay
  balance.

---

## What THIS chat did (PR #16)

1. **`/handoff-audit` of PR #11** → CONCERNS (see Prev audit above); owner approved proceeding.
   Baton repaired (correct PR #11 narrative; RISK #8 mint blind spot restored).
2. **Idempotency-Key replay** (`api/idempotency.py` + 26 money-mutation routes in `game_api.py`):
   `@idempotent` under `@require_player`; duplicate key → stored response replayed with
   `Idempotency-Replayed: true`; `record()` runs inside the route's `session_scope` so **key +
   effect commit atomically**; raced same-key duplicates collide on unique `(player_id, key)` and
   roll back whole → 409; key reuse on a different request **or different body** → 400
   (fingerprint = method+path+**SHA-256(body)**); errors never stored.
3. **One-shot grant claims** (`grant_claims` via `ProgressionService`): stipend unique per
   `(player, UTC day)`, achievement per `(player, key)`; raced double-claims can't double-pay.
   New `IntegrityError → 409` handler in `api/errors.py` (logged).
4. **Migration `b2c3d4e5f6a7`** (`idempotency_keys`, `grant_claims`) — single head, fresh-DB
   apply + `compare_metadata` clean.
5. **Night board** (owner request): `web/public/nightboard.html` — self-contained metal-panel
   status display (systems lamps / next feature / gates / backlog / PR traffic), rendered from one
   hand-edited `BOARD` object; verified by real-browser screenshot. Manual by design; it is NOT
   covered by `check-memory`, so sync it on shift change (or build a generator later).
6. **7-angle `/code-review` of this branch → 4 findings fixed in-PR** (owner approved):
   body-aware fingerprint (was path-only — same key + different body silently replayed the first
   response, falsifying the PR's claim); `create_listing` / `create_auction` / `start_cure` were
   missed by the plumbing, now decorated + `record()`-ed. Verifiers refuted the other candidates
   (mint guarded at service level; `plant_seed`/`offer_contract` move no money; no NULL-player_id
   hole; forgotten `record()` fails safe to 409). Deferred to BACKLOG: prune unbounded
   `idempotency_keys`/`grant_claims`; narrow `IntegrityError → 409` via constraint-name allowlist.
7. Docs: 2 ADRs (`DECISIONS.md` 2026-06-11 + night shift), ARCHITECTURE invariant #3 (idempotency
   + body-hash note), BACKLOG (RISK #6 → ✅; 2 new housekeeping items), standups
   `2026-06-11-lut-report-idempotency.md` + `2026-06-11-lut-report-nightshift.md`.

## Verification split (this chat)

**Agent-verifiable (proven — test-backed):**
- `make test` → **211 passed, coverage 81.07% ≥ 79** · `make lint` ✅ · `make check-memory` ✅ ·
  `make check-migrations` ✅ (head `b2c3d4e5f6a7`).
- `alembic upgrade head` on fresh sqlite + `compare_metadata` → **no model↔migration drift**.
- +14 tests in `tests/test_idempotency.py`: replay returns the original body & pays once; opt-in;
  cross-request AND same-endpoint-different-body reuse rejected; malformed key 400;
  no-store-on-error; listing fee charged once / auction escrowed once / cure replay doesn't reset
  the cure clock; **raced** duplicate key / stipend / achievement each commit exactly once.
- Night board renders correctly in a real headless Chromium (screenshot-verified).

**Device/human-verifiable (owner):**
- The deliberate **stipend tightening**: max one stipend per UTC calendar day (the bare 22h
  cooldown could allow an early-morning second claim; now it defers to midnight).
- **Double-click money actions in the live web app** to feel the replay/409 behavior (owner asked
  to re-test this by hand).
- Decide when the web client starts sending `Idempotency-Key` on money POSTs (opt-in header;
  adoption can be incremental). Note: a retry must resend the byte-identical body to replay.
- Open `web/public/nightboard.html` in a browser (or `/nightboard.html` on the running web app)
  and confirm the board reads true; it's hand-edited via the `BOARD` object on shift change.
- Decide sim dormancy semantics (RISK #9); chain-settlement (RISK #7) is TestNet-gated.

---

## OPEN RISKS (carried) — clears only when VERIFIED FIXED (test-backed)

| # | Sev | Risk | Evidence | Status |
|---|-----|------|----------|--------|
| 1 | HIGH | Phantom integrity gates / no CI. | was `Makefile`/`BACKLOG.md` | **FIXED 2026-06-10** (PR #3, CI green on real runner). |
| 2 | HIGH | Sim compute-on-read unbounded convergence. | `tests/test_simulation.py` | **FIXED 2026-06-10** (dormancy-snap; ADR in `DECISIONS.md`). |
| 3 | HIGH | No idempotency keys on mutations. | was `api/game_api.py` | **FIXED 2026-06-11** (PR #16: `Idempotency-Key` replay on 26 money routes, body-bound fingerprint, atomic with effect; `tests/test_idempotency.py`). |
| 4 | MED→HIGH | **Chain settlement not real** — see RISK #7 (re-scoped by the sweep). | `services/settlement_service.py` | OPEN. |
| 5 | — | SessionStart hook was phantom. | was `BACKLOG.md` | **FIXED 2026-06-10**. |
| 6 | HIGH | **No concurrency control on money/state paths.** | was `economy/ledger.py`, `db/models.py` | **FIXED** — core 2026-06-10 (PR #9: optimistic lock + `CHECK>=0` + harvest-once + 409; SQLite parity PR #8); remainder 2026-06-11 (PR #16: idempotency replay + one-shot stipend/achievement grants, `grant_claims` + `IntegrityError→409`; test-backed). Residual: `/state` duplicate-PlantEvents (C1) — low-stakes (event log noise, not money), tracked here. |
| 7 | HIGH | **Chain deposit trusts no on-chain proof.** Treasury→treasury no-op + DB-only `asa_balance` gate → withdraw/move-off/re-deposit drains treasury. No txid replay protection, no reconciliation, no address validation. | `settlement_service.py:116-140`, `db/models.py:92`, `game_service.py:123-129` | OPEN — blocks any real value moving (Sprint 4 gate). |
| 8 | HIGH | **Web safety net is phantom** — e2e/vitest stubbed to `echo`, absent from devDeps + CI; treasury-cap + chain-failure rollback untested. | `web/package.json`, `.github/workflows/ci.yml`, coverage | PARTIAL — money-endpoint HTTP auth/IDOR/validation tests added for withdraw/deposit (PR #11), F5 limiter fixed (PR #9). Remaining (= **NEXT ACTION**): real vitest/Playwright in CI, treasury-cap (F2) + chain-failure-rollback (F3) tests, mint-endpoint HTTP auth/IDOR tests. |
| 9 | MED | **Sim dormancy semantics** — shifts `stage_entered_at`, can delay an earned harvest if `max_catchup_hours` is lowered below a stage; skips lethal decay. Masked at default cap. | `simulation/engine.py:285-294` | OPEN — needs a design decision + knob guard. |
| 10 | MED | **Web: no global 401/403 handler** — stale key = "logged in" to a broken dashboard, no re-auth path. | `web/src/lib/api/client.ts`, `RequireAuth.tsx` | OPEN. |
| 11 | LOW | Validation 500s; rate-limiter `memory://` per-worker (set Redis); `get_level` public oracle. | see fleet-sweep | PARTIAL — validation 500s→400 FIXED (PR #11, test-backed). Remaining: Redis rate-limit storage (config), `get_level` gating. |
| 12 | LOW | **Generic `IntegrityError → 409`** (new 2026-06-11): any constraint hit at commit now returns 409. On this API those are raced one-shots (sequential paths 400 first), but the handler could mask a real FK/app bug as a retryable 409 — it logs a warning; watch for 409 spikes. | `api/errors.py` | OPEN (accepted trade-off; ADR 2026-06-11). Sharper fix (constraint-name allowlist) now on BACKLOG, per the night-shift review. |
| 13 | LOW | **`idempotency_keys`/`grant_claims` grow unboundedly** (night-shift review): one row per keyed mutation / per claim, `created_at` exists but no pruning job anywhere. | `db/models.py`, no `scripts/` job | OPEN — retention job on BACKLOG (achievement claims must persist forever; only day-keyed stipend rows and old idempotency rows can age out). |

> Reassuring (verified solid, not assumed): **no IDOR**, auth/authz server-authoritative; **AI
> SpendGuard** unescapable + CI never hits a live key; ledger correct single-threaded **and now
> under races** (optimistic lock + one-shot grants + idempotent replay, all test-backed); **no
> model↔migration drift**; "401 race" does not reproduce; `NEXT_PUBLIC_API_BASE` fallback robust.
> Night-shift 7-angle review additionally verified: mint endpoints are double-mint-safe at the
> service level; no NULL-`player_id` idempotency hole; a forgotten `record()` fails safe to 409.
