# HANDOFF — the baton

> Single source of truth for **what the next chat does first**. Rewritten by `/closeout` at
> the end of every chat; read by `/handoff-audit` at the start of the next. If this file and
> the code disagree, the code wins — fix the baton. See `docs/SESSION_PROTOCOL.md`.

**Last rewritten:** 2026-06-10 · **By:** Session Relay Protocol install chat
**Active branch:** `claude/session-relay-protocol-ybubw7`
**Open PR awaiting audit:** _none yet — this chat's PR is opened by `/closeout`._
**Previous PR audit status:** n/a (protocol bootstrap)

---

## NEXT ACTION (the one scoped item the next chat does)

**Make the phantom gates real.** `make check-memory` and `make check-migrations` both
reference Python scripts that do not exist (see OPEN RISKS #1). Build
`scripts/check_memory.py` (broken-link / ✅-citation / layer-map-drift checks per
`docs/memory/README.md`) and `scripts/check_single_head.py` (Alembic single-head check), wire
them into CI, and reconcile the false ✅ claims in `docs/memory/BACKLOG.md`.

- **Scope:** only the two scripts + their CI wiring + the BACKLOG reconciliation.
- **Risks:** `check_memory.py` must not flag the existing docs as broken on first run — write
  it against the current tree, then tighten.
- **Off-limits:** no gameplay/engine/economy changes; no chain or web work in this chat.

---

## What THIS chat did

Installed the Session Relay Protocol, adapted to GROWv2's Layer 0–4 memory system:
- `docs/SESSION_PROTOCOL.md` — the loop + the four improvements (definition-of-done,
  carried-risks ledger, device-vs-agent split, reply format).
- `docs/HANDOFF.md` (this baton) + `docs/audits/` (README + template).
- `.claude/hooks/session-start.sh` — **made real** (it was a phantom that `CLAUDE.md` and
  `BACKLOG.md` both claimed shipped). It best-effort installs deps and prints this baton.
- `.claude/settings.json` — registers the SessionStart hook and sets `PYTHONPATH=src`.
- `.claude/skills/handoff-audit/` and `.claude/skills/closeout/` — the start/end skills,
  wired to GROWv2's gates (`make test` / `make lint` / `make check-memory`).

## Verification split (this chat)

**Agent-verifiable (done):**
- SessionStart hook exists, is executable, and exits 0 on a dry run; prints the baton.
- All new docs are internally link-clean by inspection.

**Device/human-verifiable (owner, please confirm):**
- That a fresh web session actually runs `.claude/hooks/session-start.sh` and you see the
  baton printed at session start (hook execution depends on the harness, not the test suite).
- That `make setup && make test` is green on your machine (the suite was **not** run in this
  chat — see OPEN RISKS, the install gates are themselves under repair).

---

## OPEN RISKS (carried) — clears only when VERIFIED FIXED (test-backed)

| # | Sev | Risk | Evidence | Status |
|---|-----|------|----------|--------|
| 1 | HIGH | **Phantom integrity gates.** `scripts/check_memory.py` & `scripts/check_single_head.py` are referenced by `Makefile`, `CLAUDE.md`, and claimed ✅ in `BACKLOG.md`, but do **not** exist → `make check-memory` / `make check-migrations` fail; memory & migration drift are currently **unguarded**. | `Makefile:22-26`; `BACKLOG.md:20-24,74-77`; `ls scripts/` (python files absent) | OPEN → this is the NEXT ACTION |
| 2 | HIGH | **Sim compute-on-read is O(elapsed hours), no cost cap.** A long-idle plant can spike a `/state` request. | `BACKLOG.md:32`; standup 2026-06-08 §1 (Simulation) | OPEN |
| 3 | HIGH | **No idempotency keys on mutations.** Retries/double-clicks can double-post the ledger. | `BACKLOG.md:33`; standup 2026-06-08 §1 (Backend) | OPEN |
| 4 | MED | **Chain fully mocked.** No funded TestNet, `ASA_ID` unset, metadata not on IPFS → "on-chain" unproven end-to-end. | `BACKLOG.md:31`; standup 2026-06-08 §1 (Chain) | OPEN |
| 5 | — | **SessionStart hook was phantom** (claimed ✅, absent). | was `BACKLOG.md:16-18` | **FIXED this chat** — hook created + exits 0 (test-backed); keep until a web session confirms it actually fires (device-verifiable). |

> Risks #1–#4 are pre-existing GROWv2 findings carried forward. They do **not** clear on a
> mention — only when a test proves the fix.
