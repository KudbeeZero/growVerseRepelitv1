# Audit — PR #3: Session Relay Protocol + real integrity gates/CI + bounded sim compute-on-read

**Branch:** `claude/session-relay-protocol-ybubw7` → `main` · **Head SHA:** `2379c61a06c8ee796d7bb9f0b164e0fedd8aebc8` (base `d0bad301`, merged as `f7744b5`) · **Auditor run:** 2026-06-10
**CI on the PR:** green on a real runner — backend job 80491825386 ✅, web job 80491825368 ✅ (verified via GitHub API) · **Reviewer:** independent auditor (does not trust PR prose)

## Claims vs. evidence
| # | PR claims | Verified? | Evidence (`file:line`) |
|---|-----------|-----------|------------------------|
| 1 | `SESSION_PROTOCOL.md` / `HANDOFF.md` / audits scaffolding created | ✅ | New files in diff: `docs/SESSION_PROTOCOL.md` (+80), `docs/HANDOFF.md` (+71), `docs/audits/README.md` (+15), `docs/audits/TEMPLATE.md` (+30) |
| 2 | 2 skills created (`/handoff-audit`, `/closeout`) | ✅ | New files: `.claude/skills/handoff-audit/SKILL.md` (+46), `.claude/skills/closeout/SKILL.md` (+49) |
| 3 | SessionStart hook created | ✅ | New files: `.claude/hooks/session-start.sh` (+39, executable, exits 0, best-effort `make setup` + prints baton); wired in `.claude/settings.json:5-16` (also sets `PYTHONPATH=src`) |
| 4 | `scripts/check_memory.py` created | ✅ | New file (+140): required-files check :42-50, codex-vs-MAP check :100-110, broken-link check :119-124, ✅-claim-cites-missing-path check :126-132. Base `Makefile:23` already invoked it — it was phantom before this PR |
| 5 | `scripts/check_single_head.py` created | ✅ | New file (+46): `ScriptDirectory.get_heads()` :26, fails >1 head with `alembic merge` hint :32-42. Base `Makefile:26` already invoked it (phantom before) |
| 6 | Both checkers "teeth-tested" | ⚠️ | Not verifiable from the diff: **no committed test artifact** for either script (no `tests/test_check_*`; `BACKLOG.md:28` "the two checkers carry a teeth-test" overstates — the teeth-test was a manual session exercise). The scripts do demonstrably run and gate (re-run below, and as CI steps). Minor |
| 7 | `.github/workflows/ci.yml` created — backend: lint→memory→single-head→alembic upgrade→pytest+coverage; web: typecheck/lint/build | ✅ | New file (+79): backend steps in exactly that order `ci.yml:38-52` (ruff :39, `check_memory.py` :42, `check_single_head.py` :45, `alembic upgrade head` :48, `pytest --cov` :51); web `npm ci`/typecheck/lint/build :64-79. No CI existed at base (`.github/` absent) |
| 8 | Four false ✅ claims in BACKLOG.md annotated with corrections, not erased | ✅ | Exactly four "*(⚠️ Drift corrected 2026-06-10 …)*" annotations: `docs/memory/BACKLOG.md:26` (hook), `:34` (check_memory), `:41` (CI for coverage gate), `:96` (check_single_head). Original ✅ entries retained, not deleted |
| 9 | Dormancy-snap sim cost cap: `max_catchup_hours` in balance.yaml, dormancy PlantEvent with `skipped_hours`, stage clock pause | ✅ | `engine.py:250-252` (raw_elapsed vs cap), `:285-293` (dormancy block: `last_tick_at += skipped` :287 lands plant at `now`; **stage clock pause** via `stage_entered_at += skipped` :288; `_record_event(... "dormancy", {"skipped_hours": skipped})` :290-293, gated on `is_alive`). `balance.yaml:84-89`: note the **key + value (8760) pre-existed at base** — the diff only rewrites the comment; the new behavior is entirely in the engine. Claim as worded is accurate |
| 10 | 3 new dormancy tests in `tests/test_simulation.py` | ✅ | +71 lines, exactly 3 new tests: `test_long_idle_read_is_bounded_and_converges` :185 (step count ≤ cap, one-read convergence, `skipped_hours` payload, zero-cost follow-up read, stage-clock pause), `test_cap_leaves_normal_reads_untouched` :224 (near-term parity: no dormancy event, lands at `now`), `test_long_idle_unattended_plant_dies_without_dormancy` :234 (death path) |
| 11 | ADR added to `docs/memory/DECISIONS.md` | ✅ | `DECISIONS.md:156-172` — "2026-06-10 — Bounded compute-on-read via dormancy-snap" (decision/why/consequences, append-only) |
| 12 | `ARCHITECTURE.md` risk list updated | ✅ | `ARCHITECTURE.md:66-70` — "Sim cost is O(elapsed hours)" replaced with "Sim cost per read is bounded (fixed 2026-06-10)" + residual first-read-burst watch item |
| 13 | Coverage floor ratcheted 78 → 79 | ✅ | `pyproject.toml:20` `fail_under = 79` (was 78 at base) |
| 14 | `web/package-lock.json` resynced (missing `@emnapi/*` broke `npm ci`) | ✅ | Diff adds `node_modules/@emnapi/core` + `@emnapi/runtime` entries and drops stale `"peer": true` flags; commit `b66cad6`. CI web job green on this exact head proves `npm ci` now works |
| 15 | Baton claims "185 passed, coverage **79.29%**" | ⚠️ | Auditor re-run got **79.26%** (the same-PR standup addendum also says 79.26% — `standups/2026-06-10-lut-report.md:69`). Trivial prose discrepancy in `HANDOFF.md:45`; gate (≥79) unaffected |

## Gates re-run by the auditor
- `make test` → **185 passed**, coverage **79.26% ≥ 79.0** gate ("Required test coverage of 79.0% reached"), exit 0
- `make lint` → "All checks passed!" (ruff E9,F63,F7,F82 over src+tests), exit 0
- `make check-memory` → "Memory integrity OK — 18 files, links + ✅ citations resolve.", exit 0
- `make check-migrations` → "Alembic single-head OK — head: e7a9c1b3f2d8", exit 0
- web (touched: lockfile only) `typecheck`/`lint`/`build` → **not re-run locally**; justified by CI green on the exact head commit on a real runner (web job 80491825368: `npm ci` + typecheck + lint + build all passed)
- Sanity: current checkout (`claude/grovers-night-shift-cm59p1`) is tree-identical to `origin/main` (`git diff HEAD origin/main --stat` empty), so the re-run is on the merged code

## Scope check
- In-scope diff: protocol docs (`docs/SESSION_PROTOCOL.md`, `docs/HANDOFF.md`, `docs/audits/`), scripts (`scripts/check_memory.py`, `scripts/check_single_head.py`), CI (`.github/workflows/ci.yml`), skills/hooks (`.claude/skills/`, `.claude/hooks/session-start.sh`), sim dormancy + tests (`src/growpodempire/simulation/engine.py`, `tests/test_simulation.py`), `src/growpodempire/data/balance.yaml`, memory docs (`ARCHITECTURE.md`, `BACKLOG.md`, `DECISIONS.md`, `standups/2026-06-10-lut-report.md`), `pyproject.toml` (declared ratchet), `web/package-lock.json` (declared resync)
- **Scope creep / out-of-scope changes:** none material. Only file not explicitly named in the declared scope is `.claude/settings.json` (+17) — but it is solely the SessionStart hook registration + `PYTHONPATH=src` env, i.e. the wiring the hook claim requires. No engine logic beyond the dormancy block; no API/chain/web-source changes

## Carried-risks ledger check
- Any OPEN RISK silently dropped from `docs/HANDOFF.md`? **No** — #3 (idempotency) and #4 (chain mocked) are both still OPEN (`HANDOFF.md:67-68`); #3 is correctly promoted to the NEXT ACTION
- Any risk marked FIXED **without** a test backing it? **No (with one nuance):**
  - **#1 (phantom gates) FIXED** — backed by observable artifacts: scripts + CI workflow exist in the diff, all four gates re-run green by this auditor, and CI green on a real runner. Nuance: the checker scripts themselves carry no committed unit test (claim #6 above)
  - **#2 (unbounded sim compute-on-read) FIXED** — genuinely test-backed: 3 tests at `tests/test_simulation.py:185,224,234`; residual at-scale burst risk correctly kept on the ARCHITECTURE watch list rather than declared solved
  - **#5 (phantom hook) FIXED** — backed by the artifact (`.claude/hooks/session-start.sh` + `settings.json` wiring in the diff); "observed firing" is session evidence, and fresh-session behavior is correctly left in the device-verifiable column

## Device-verifiable vs agent-verifiable
- Agent proved: full suite (185) + coverage gate (79.26% ≥ 79), lint, memory integrity (18 files), single Alembic head (`e7a9c1b3f2d8`) — all re-run by this auditor on the merged tree; dormancy bound/convergence/pause/parity/death asserted in committed tests; CI green on the exact head SHA (both jobs, real runner)
- Owner must confirm by hand: a fresh Claude-Code-on-the-web session auto-installs deps via the SessionStart hook (harness-dependent); the 311 ms → 0.1 ms benchmark numbers are session measurements, not committed benchmarks (directionally supported by the bounded-step test)

## Verdict
**PASS** — every material claim has direct diff evidence and all four gates re-run green on the merged tree (185 passed, 79.26% ≥ 79); the only findings are cosmetic: the checkers' "teeth-test" is manual (no committed test artifact), the baton's 79.29% should read 79.26%, and the balance.yaml change is comment-only (the 8760 cap value pre-existed; the new behavior is in the engine).
