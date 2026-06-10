# Agent Memory — GROWv2 Night/Audit/Quantum system

> Adapted from the FRONTIERNeXt 10-agent master prompt to the GROWv2 stack
> (Python/Flask + SQLAlchemy/Alembic + Next.js 15 web; deterministic mock chain
> + mock AI; pytest/ruff). Every agent reads this FIRST and treats **L4** as
> standing review heuristics. Never store secrets, mnemonics, or API keys here.

## L3 — Run log (≤40 lines/run, appended)
- (none yet — this is cycle #1)

## L4 — Lessons & standing heuristics (≤200 lines, rewritten by Jordan each cycle)

### Architecture invariants (from CLAUDE.md — violations are findings)
- **DB is authoritative; the chain is a mirror/settlement layer.** On-chain state must
  never drive gameplay truth. A code path that reads chain state to decide gameplay = finding.
- **The simulation engine is pure + server-authoritative**, compute-on-read (lazy catch-up
  in `simulation/engine.py`). Player-scoped economy/research logic must live in `services/`,
  not inside the pure engine. RNG must be seeded from (plant_id, hour) for idempotent reads.
- **Money is `Decimal`, ledger-based, double-entry, auditable.** No floats for money. Every
  spend/earn posts to the ledger (`economy/ledger.py`). Faucets need matching sinks. A float
  in a money path, or a balance mutation that doesn't post to the ledger = finding.
- **Writes require API-key auth (`api/auth.py`, `X-API-Key`, constant-time compare); reads
  are public. Mutations are rate-limited (`api/ratelimit.py`).** A write route missing
  `@require_player`, or a player-scoped route that doesn't check ownership = finding.
- **Providers are swappable behind ABCs (`chain/`, `ai/`)**: deterministic Mock for CI, real
  for prod, chosen by config. CI must never require a live key. A test that needs a real key,
  or a hard dependency on a live provider = finding.
- **`balance.yaml` is the tuning surface.** Prefer data-driven balance over hardcoded magic
  numbers in code.

### Known recent changes to scrutinize (landed on branch claude/grow-chamber-plants-6ud1q4)
- **Lifetime vigor → yield**: `Plant.lifetime_health_sum`/`lifetime_hours` accumulate hourly
  in `engine._step`; `harvest_plant` sizes weight off `lifetime_vigor` (avg). Migration
  `c1d2e3f4a5b6`. Watch: division-by-zero guard, overflow over long grows, back-compat for
  rows created before the migration (server_default "0"), interaction with dead plants.
- **Dev guest login**: `POST /players/guest` (find-or-create by username, returns API key)
  gated by `GPE_DEV_LOGIN` (default ON). SECURITY-SENSITIVE: returns an account's key to
  anyone who knows the username. Must be off for prod. Verify the gate + rate limit.
- **Plant renderer**: `web/src/components/plant/plantRenderer.ts` + `PlantCanvas.tsx`
  (canvas, rAF, ResizeObserver, pointer events). Watch: leaks (listeners/rAF not torn down),
  SSR/`window` access, reduced-motion path, perf with many cards.
- **+25 catalog strains** in `data/strains.yaml` + `data/strain_knowledge.yaml` (now 47).
  Sync invariant: every catalog slug has a KB entry and vice-versa (tests enforce).

### Stack command cheatsheet (use REAL commands as evidence)
- Python deps live in `.venv` (NOT system python — system has a PyYAML collision).
- Tests: `.venv/bin/python -m pytest -q tests/<file>.py` (full suite ~80s, 186 tests).
- Lint gate: `.venv/bin/python -m ruff check --select=E9,F63,F7,F82 src tests scripts`.
- Coverage gate: `fail_under=78` in pyproject; full run `.venv/bin/python -m pytest --cov`.
- Memory/migration gates: `make check-memory`, `make check-migrations`.
- Web: `cd web && npm run typecheck && npm run lint && npm run build`.
- Single Alembic head currently `c1d2e3f4a5b6`.
