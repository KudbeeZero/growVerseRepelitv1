# HANDOFF — the baton

> Single source of truth for **what the next chat does first**. Rewritten by `/closeout` at
> the end of every chat; read by `/handoff-audit` at the start of the next. If this file and
> the code disagree, the code wins — fix the baton. See `docs/SESSION_PROTOCOL.md`.

**Last rewritten:** 2026-06-10 · **By:** Session Relay Protocol install + integrity-gate repair chat
**Active branch:** `claude/session-relay-protocol-ybubw7`
**Open PR awaiting audit:** _this chat's PR (opened by `/closeout`) — audit it next chat._
**Previous PR audit status:** n/a (protocol bootstrap)

---

## NEXT ACTION (the one scoped item the next chat does)

**Cap the sim's compute-on-read (OPEN RISK #2).** `simulation/engine.py` catch-up is O(elapsed
hours) with no bound — a long-idle plant can spike a `/state` request. Add a max catch-up window
(clamp elapsed to a configurable cap in `data/balance.yaml`) and/or materialize dormant plants,
turning the unbounded cost into a bounded one. Add a test that proves a very-old plant resolves in
bounded work.

- **Scope:** the engine cap + its `balance.yaml` knob + tests. Touch `services/` only if
  materialization is needed; keep the pure engine pure.
- **Risks:** the cap must not change near-term plant outcomes (only bound the worst case) — assert
  parity with the uncapped path for normal elapsed times.
- **Off-limits:** no chain/web/economy changes in that chat.

---

## What THIS chat did

1. **Installed the Session Relay Protocol** on GROWv2's Layer 0–4 memory: `docs/SESSION_PROTOCOL.md`
   (loop + the four improvements), this baton, `docs/audits/` (README + template), and the
   `/handoff-audit` + `/closeout` skills under `.claude/skills/`.
2. **Caught and fixed real truth-drift.** Four things claimed ✅ shipped were **absent on disk**;
   built them for real and verified:
   - `scripts/check_memory.py` — memory-integrity gate (links · ✅ citations · layer-map), teeth-tested.
   - `scripts/check_single_head.py` — Alembic fork gate (head `e7a9c1b3f2d8`).
   - `.claude/hooks/session-start.sh` — SessionStart hook (it **fired this session**).
   - `.github/workflows/ci.yml` — the missing CI (lint → memory → single-head → migrate → tests; + web job).
3. **Reconciled** the four false ✅ claims in `docs/memory/BACKLOG.md` and wrote standup
   `docs/memory/standups/2026-06-10-lut-report.md`.

## Verification split (this chat)

**Agent-verifiable (proven — test-backed):**
- `make check-memory` ✅ · `make check-migrations` ✅ · `make lint` ✅ ·
  `make test` → **182 passed, coverage 79.1% ≥ 78** ✅ · `alembic upgrade head` on fresh sqlite ✅ ·
  checker teeth-test ✅.
- SessionStart hook executes and prints the baton (observed this session).

**Device/human-verifiable (owner, please confirm):**
- `.github/workflows/ci.yml` goes **green on first push** — the YAML is agent-written; its
  *commands* are locally verified, but the GitHub Actions run (esp. the **web job**'s
  `npm ci && npm run build`) was not run on a runner this session.
- A fresh **web session** auto-installs deps via the hook (harness-dependent).

---

## OPEN RISKS (carried) — clears only when VERIFIED FIXED (test-backed)

| # | Sev | Risk | Evidence | Status |
|---|-----|------|----------|--------|
| 1 | HIGH | **Phantom integrity gates.** `scripts/check_memory.py` & `scripts/check_single_head.py` (and CI itself) were referenced everywhere but absent → `make check-memory`/`make check-migrations` failed; drift unguarded. | was `Makefile:22-26`; `BACKLOG.md` | **FIXED 2026-06-10** — both scripts + `.github/workflows/ci.yml` built; gates green + teeth-tested. CI green on first push is still owner-verifiable. |
| 2 | HIGH | **Sim compute-on-read is O(elapsed hours), no cost cap.** A long-idle plant can spike a `/state` request. | `BACKLOG.md`; standup 2026-06-08 §1 (Simulation) | OPEN → this is the NEXT ACTION |
| 3 | HIGH | **No idempotency keys on mutations.** Retries/double-clicks can double-post the ledger. | `BACKLOG.md`; standup 2026-06-08 §1 (Backend) | OPEN |
| 4 | MED | **Chain fully mocked.** No funded TestNet, `ASA_ID` unset, metadata not on IPFS → "on-chain" unproven end-to-end. | `BACKLOG.md`; standup 2026-06-08 §1 (Chain) | OPEN |
| 5 | — | **SessionStart hook was phantom** (claimed ✅, absent). | was `BACKLOG.md` | **FIXED 2026-06-10** — hook built and observed firing this session. |

> Risks #2–#4 are pre-existing GROWv2 findings carried forward. They do **not** clear on a
> mention — only when a test proves the fix.
