# Agent Memory — GROWv2 Night/Audit/Quantum system

> Adapted from the FRONTIERNeXt 10-agent master prompt to the GROWv2 stack
> (Python/Flask + SQLAlchemy/Alembic + Next.js 15 web; deterministic mock chain
> + mock AI; pytest/ruff). Every agent reads this FIRST and treats **L4** as
> standing review heuristics. Never store secrets, mnemonics, or API keys here.

## L3 — Run log (≤40 lines/run, appended)
- **2026-06-10 @ d96cff2** · focus: live-game readiness · 9/9 night agents, 47 findings →
  47 consolidated (0 evidence-rejected). Audit re-ran 2 Critical + 5 High (all verified true) +
  3 spot Medium; F004 unverifiable (no TestNet). P0 opened: 2 Criticals **fixed in-cycle**
  (instant-harvest gate; GPE_DEV_LOGIN secure-default-off) + dead-plant gate + serializer↔TS drift.
  Suite 186→192 green, coverage 79.47%. Blake↔Casey withdrawal-cap dispute resolved by re-run
  (latent, not exploitable via current HTTP). Consolidator bug found+fixed: severity casing
  normalization (was rejecting 18 valid findings).

- **2026-06-10 @ dc1094c** · focus: NEW-2/NEW-3 + chain codex · Builder (Reese) bounded the
  cup faucet (payouts ≤ prize_pool + house_sponsorship, Decimal end-to-end) and pinned the
  REWARD overload audit with 4 regression tests; independent verifier (Casey) re-proved every
  claim incl. mutation-testing the guards (rebuttal in reports/2026-06-10/rebuttals/). Numeric
  sweep: 5600 bound never clamps (tight bound 4700) — conservative, intended. Five-agent chain
  design team + synthesis landed docs/memory/design/chain/ (wallet login, GrowAsset/ARC-19
  lifecycle, tokenomics audit: +55–75 GROW/day late-game inflation + engine auto-feed leak,
  merkle/snapshot recording, custody/NEW-4 deposit redesign) with 6 debate rulings in
  00-overview.md. Suite 221→227, coverage 79.88%. check_memory strip→rstrip fix (leading `..`
  in doc-relative tokens was being eaten). Residual: judge() TOCTOU = known F005 class.

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

### Lessons from cycle 2026-06-10 (standing heuristics)
- **Harvest must be gated.** Yield is currency; the server-authoritative harvest path
  (`weight_g is None`) MUST require `is_alive` + stage ≥ flowering. Any new yield/payout path
  needs the same "did it actually grow?" guard. Faucets without a maturity gate are exploits.
- **`lifetime_vigor` falls back to `health` when `lifetime_hours==0`** — fine for grown plants
  (catch_up ticks them) but full-value for never-ticked rows. Don't add new paths that read vigor
  without ensuring the plant was simulated.
- **Security flags are secure-by-default OFF.** A convenience bypass (e.g. `GPE_DEV_LOGIN`) that
  discloses credentials must default off and be opt-in per environment; never ship default-on.
- **`session` is `autoflush=False`** — any "sum prior rows in this window" guard (withdrawal cap,
  rate limits) misses un-flushed same-session rows. Flush before summing, or lock the row.
- **Custodial chain pulls need a player signature.** `deposit()` (player→treasury) cannot move a
  user's ASA from server code alone; real-provider inbound transfers require the player to sign.
- **One canvas renderer per card = N always-on rAF loops.** Virtualize / IntersectionObserver-gate
  `PlantCanvas`; pause rAF when off-screen. Reduced-motion already short-circuits correctly.
- **Consolidator: normalize severity/category case** before validating (agents emit "Medium" and
  "medium"). Be liberal in what you accept so a casing slip never drops a real finding.

### Invariant harness (use it; extend it)
- `tests/test_invariants.py` is the system-level safety net (built 2026-06-10): ledger conservation,
  compute-on-read partition-invariance + idempotence, and no-double-credit at every payout path.
  When you add a **new faucet/payout** (a `LedgerEntryType` credit) add it to the no-double-credit
  layer; when you add **sim state**, add the field to `_state()` in the partition/idempotence tests.
  The sim RNG is `(plant_id, hour)`-seeded, so determinism tests MUST hold the RNG constant —
  never compare two different plant ids.

### Stack command cheatsheet (use REAL commands as evidence)
- Python deps live in `.venv` (NOT system python — system has a PyYAML collision).
- Tests: `.venv/bin/python -m pytest -q tests/<file>.py` (full suite ~80s, 186 tests).
- Lint gate: `.venv/bin/python -m ruff check --select=E9,F63,F7,F82 src tests scripts`.
- Coverage gate: `fail_under=78` in pyproject; full run `.venv/bin/python -m pytest --cov`.
- Memory/migration gates: `make check-memory`, `make check-migrations`.
- Web: `cd web && npm run typecheck && npm run lint && npm run build`.
- Single Alembic head currently `c1d2e3f4a5b6`.
