# HANDOFF — the baton

> Single source of truth for **what the next chat does first**. Rewritten by `/closeout` at
> the end of every chat; read by `/handoff-audit` at the start of the next. If this file and
> the code disagree, the code wins — fix the baton. See `docs/SESSION_PROTOCOL.md`.

**Last rewritten:** 2026-06-10 · **By:** protocol install + integrity gates + sim cost cap chat
**Active branch:** `claude/session-relay-protocol-ybubw7`
**Open PR awaiting audit:** _this branch's PR — run `/handoff-audit` on it next chat._
**Previous PR audit status:** n/a (protocol bootstrap)

---

## NEXT ACTION (the one scoped item the next chat does)

**Idempotency keys on mutations (OPEN RISK #3).** A retry or double-click can double-post the
ledger today. Add an optional `Idempotency-Key` request header on money-moving mutations
(care/buy/sell/bid/enroll/etc.): store key → response, replay the stored response on a duplicate,
scope keys per player, expire them after ~24 h. The ledger invariant (every spend posts exactly
once) gets a property test that hammers a mutation with the same key concurrently.

- **Scope:** API layer + a small table/migration + tests. No engine, chain, or web changes.
- **Risks:** the key store must not become a second source of money truth — it stores *responses*,
  the ledger remains authoritative. Watch migration single-head (`make check-migrations`).
- **Off-limits:** sim/genetics/web work in that chat.

---

## What THIS chat did (three units, one branch)

1. **Installed the Session Relay Protocol** on the Layer 0–4 memory (`docs/SESSION_PROTOCOL.md`,
   this baton, `docs/audits/`, `/handoff-audit` + `/closeout` skills, SessionStart hook).
2. **Made the phantom gates real** — `scripts/check_memory.py` (teeth-tested),
   `scripts/check_single_head.py`, `.github/workflows/ci.yml` (there was **no CI at all**);
   reconciled four false ✅ claims in `BACKLOG.md`.
3. **Bounded the sim's compute-on-read** (risk #2): absences beyond `max_catchup_hours` become
   recorded **dormancy** (stage clock pauses; plant lands at `now`; auditable event). Derelict
   plant: 311 ms once ever → 0.1 ms after (was 310 ms on *every* read). Near-term reads
   bit-identical (parity-tested). ADR in `DECISIONS.md`; ARCHITECTURE risk list updated; coverage
   floor ratcheted 78 → 79.

## Verification split (this chat)

**Agent-verifiable (proven — test-backed):**
- `make test` → **185 passed, coverage 79.29% ≥ 79 (ratcheted)** · `make lint` ✅ ·
  `make check-memory` ✅ (18 files) · `make check-migrations` ✅ (head `e7a9c1b3f2d8`) ·
  `alembic upgrade head` on fresh sqlite ✅.
- Dormancy: bounded step count, one-read convergence, stage-clock pause, normal-read parity, and
  the death path — all asserted in `tests/test_simulation.py`. Benchmarked 311 ms → 0.1 ms.
- SessionStart hook fires (observed at session start).

- **CI verified green on a real runner** (PR #3, 2026-06-10): backend + web jobs both pass.
  The first run caught pre-existing `web/package-lock.json` drift (missing `@emnapi/*` entries
  broke `npm ci`) — fixed, lockfile resynced.

**Device/human-verifiable (owner, please confirm):**
- A fresh web session auto-installs deps via the hook (harness-dependent).

---

## OPEN RISKS (carried) — clears only when VERIFIED FIXED (test-backed)

| # | Sev | Risk | Evidence | Status |
|---|-----|------|----------|--------|
| 1 | HIGH | **Phantom integrity gates** (`check_memory.py`, `check_single_head.py`, CI itself absent despite ✅ claims). | was `Makefile`; `BACKLOG.md` | **FIXED 2026-06-10** — built + teeth-tested; **CI verified green on a real runner** (PR #3, both jobs). |
| 2 | HIGH | **Sim compute-on-read O(elapsed hours), unbounded convergence.** | was `BACKLOG.md`; standup 2026-06-08 | **FIXED 2026-06-10** — dormancy-snap; bounded + parity + convergence tests in `tests/test_simulation.py`; ADR in `DECISIONS.md`. Residual at-scale burst risk on ARCHITECTURE watch list. |
| 3 | HIGH | **No idempotency keys on mutations.** Retries/double-clicks can double-post the ledger. | `BACKLOG.md`; standup 2026-06-08 §1 (Backend) | OPEN → this is the NEXT ACTION |
| 4 | MED | **Chain fully mocked.** No funded TestNet, `ASA_ID` unset, metadata not on IPFS. | `BACKLOG.md`; standup 2026-06-08 §1 (Chain) | OPEN |
| 5 | — | **SessionStart hook was phantom.** | was `BACKLOG.md` | **FIXED 2026-06-10** — built; observed firing at session start. |

> Risks #3–#4 carry forward. They do **not** clear on a mention — only when a test proves the fix.
