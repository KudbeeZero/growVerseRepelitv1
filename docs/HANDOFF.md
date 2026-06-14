# HANDOFF — the baton

> Single source of truth for **what the next chat does first**. Rewritten by `/closeout` at
> the end of every chat; read by `/handoff-audit` at the start of the next. If this file and
> the code disagree, the code wins — fix the baton. See `docs/SESSION_PROTOCOL.md`.

**Last rewritten:** 2026-06-14 · **By:** e2e-grow-loop chat (BE-004, STEP 4)
**Active branch:** `claude/simulation-test-clock-u4ounm` (**PR #47**, base `main`) — now carries STEP 3 **+** STEP 4.
**Just shipped (this chat):** **STEP 4 e2e grow loop** — the full core loop driven over the HTTP API
and fast-forwarded with the STEP 3 dev clock, plus HTTP-boundary coverage for the value-bearing
routes (RISK #8, backend side). **Test-only, no source changes.** Pushed onto PR #47's branch (the
STEP 3 clock is not yet in `main`, so STEP 4 can only stack on the same branch — see below).
**STEP 3 audited:** `/handoff-audit` this chat → **PASS** (`docs/audits/PR-47-simulation-test-clock.md`);
every claim confirmed with file:line, gates green, no scope creep.

> **Launch-Readiness path (Builder Dept):** Feature Flags → STEP 3 Simulation Test Clock ✅ → **STEP 4
> e2e Grow Loop ✅ (this chat)** → **STEP 4.5 GameService clock + cure/auction e2e (NEXT)** → Launch
> Readiness. The backend OPEN RISKS below are still **inherited and NOT fully re-audited** — re-verify
> against current code before acting.

---

## NEXT ACTION (the one scoped item the next chat does)

**STEP 4.5 — `GameService` on `active_clock()` + cure/auction e2e** (owner-approved 2026-06-14).
STEP 4 surfaced that `GameService` (harvest/**cure**/sell + market/auction expiry) defaults to
`SystemClock`, **not** `active_clock()` (`services/game_service.py:82`), so the dev clock does NOT
fast-forward cure or auction settlement over HTTP.
- **The fix is one line:** `self.clock = clock or active_clock()` — exactly mirroring the STEP 3
  change in `services/simulation_service.py:38`. It is **production-behaviour identical**
  (`active_clock()` returns `SystemClock` whenever the test clock is disabled, i.e. always in prod and
  by default in tests), so existing tests are unaffected.
- **Then extend the e2e** (`tests/test_e2e_grow_loop.py`): add the **cure** step (start_cure →
  advance clock past `cure_target_hours` → finish_cure raises quality) and optionally an **auction**
  settle-after-expiry case, all fast-forwarded via `POST /api/dev/clock/advance`.
- **Honour the invariants:** server-authoritative sim, ledger double-entry, money is `Decimal`. Tune
  `balance.yaml` data, never rules, to make a test pass.
- This is the production-path edit deliberately deferred out of the test-only STEP 4 chat.

---

## What THIS chat did

**STEP 4 e2e grow loop (BE-004) — test-only, on PR #47's branch.**
- **`tests/test_e2e_grow_loop.py` (3)** — seed → plant → grow → flower → harvest → sell over the HTTP
  API, fast-forwarded with the dev clock (care-loop: set climate, water+feed, advance, repeat until
  flowering). Asserts balance rises by exactly the `harvest_sale` ledger entry; no double-sell; and
  **ledger integrity** (advancing the clock posts zero ledger entries — BE-A08).
- **`tests/test_http_boundary.py` (13)** — RISK #8 HTTP-layer coverage for the value-bearing routes:
  withdraw/deposit (happy + validation + auth + insufficient), mint harvest (happy/idempotent/
  not-found), mint strain non-breeder, ARC-3 metadata + unknown-kind 404. Offline `MockChainProvider`.
- **Docs:** `docs/STEP4_E2E_GROW_LOOP_VALIDATION.md` (report + risks + recommendations);
  `docs/audits/PR-47-simulation-test-clock.md` (STEP 3 handoff-audit, PASS); ADR in `DECISIONS.md`;
  BACKLOG (STEP 4 ✅, STEP 4.5 queued); standup `2026-06-14-lut-report-be004.md`.

## Verification split (this chat)

**Agent-verifiable (proven):**
- Backend: `make test` **262 passed, 83.63% ≥ 79** ✅ · `make lint` ✅ · `make check-memory` ✅ (22 files).
- The e2e loop and the withdraw/deposit/mint/nft HTTP routes are exercised end-to-end; settlement
  87% / minting 73% coverage; advancing the clock proven to post no ledger entries.

**Device/human-verifiable (owner):**
- `GROW_TEST_CLOCK=true APP_ENV=development make serve`; `POST /api/dev/clock/advance {"days":40}` →
  plant flowers on next `/state`; harvest + sell succeed; `/api/dev/clock/*` 404 with flags unset.

---

## OPEN RISKS (carried) — re-verify against current code before acting

> A risk clears only when VERIFIED FIXED (test-backed). Risk #1 is new this chat.

| # | Sev | Risk | Evidence | Status |
|---|-----|------|----------|--------|
| 1 | MED | **Cure/auction not dev-clock-drivable.** `GameService` defaults to `SystemClock`, not `active_clock()`, so the dev clock can't fast-forward cure/auction over HTTP. | `services/game_service.py:82` | OPEN — NEW (STEP 4). One-line fix = NEXT ACTION (owner-approved). |
| 3 | HIGH | Idempotency on mutations. | `api/game_api.py` | PARTIAL — concurrency core fixed; general `Idempotency-Key` + one-shot grants in PR #16 (confirm/merge-audit). |
| 4/7 | HIGH | **Chain settlement not real** — deposit trusts no on-chain proof; treasury drain path; no txid replay protection / reconciliation / address validation. | `services/settlement_service.py`, `db/models.py`, `game_service.py` | OPEN — blocks real value moving. |
| 8 | HIGH | **Safety net** — **backend HTTP boundary now covered (this chat: withdraw/deposit/mint/nft)**; **web** Playwright real e2e still a stub; treasury-cap + chain-failure-rollback UI tests absent. | `web/package.json`, `.github/workflows/ci.yml`, `tests/test_http_boundary.py` | PARTIAL (backend ↑). |
| 9 | MED | **Sim dormancy semantics** — can delay an earned harvest if `max_catchup_hours` lowered below a stage; skips lethal decay. Masked at default cap. | `simulation/engine.py` | OPEN — needs a design decision + knob guard. |
| 10 | MED | **Web: no global 401/403 handler** (per earlier baton; an `AuthErrorListener` may have landed — confirm). | `web/src/lib/api/client.ts`, `RequireAuth.tsx` | RE-VERIFY. |
| 11 | LOW | Rate-limiter `memory://` per-worker (set Redis); `get_level` public oracle. | see fleet-sweep | PARTIAL. |

> **Process note:** PR #47 had **no GitHub CI run on head `d83b9b6`** (verified via the Actions API).
> Gates were re-verified locally by the STEP 3 audit; CI runs on this STEP 4 push. Confirm green
> before merge.
> Reassuring (verified earlier, not re-checked here): no IDOR; auth/authz server-authoritative; AI
> SpendGuard unescapable + CI never hits a live key; ledger correct single-threaded; no model↔migration drift.
