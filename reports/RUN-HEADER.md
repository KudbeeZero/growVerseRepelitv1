RUN: 2026-06-10 | SHA: d96cff2 | TRIGGER: dispatch (manual chat fallback, adapted to GROWv2)
FOCUS: live-game readiness — recent changes (lifetime-vigor migration, dev guest login,
  plant canvas renderer, +25 strains) + standing invariants (ledger double-entry / no-float,
  genetics determinism, compute-on-read sim, API-key auth + rate limit, DB↔chain mirror).
SCOPE PATHS: src/growpodempire/**, web/src/**, alembic/**, src/growpodempire/data/**
EXCLUDED: node_modules, .venv, web/.next, *.egg-info, web/package-lock.json
BUDGET: ~12 findings/agent, scoped exploration (manual fallback)
MEMORY: memory/agent-memory.md @ d96cff2

Roster (adapted): Alex=web architecture · Blake=chain/settlement/mint (opus) ·
Casey=test gaps+proposed tests · Dana=security (opus) · Evan=UI/UX+a11y ·
Fiona=performance · Gabe=docs/compliance · Harper=bug-hunter/edge-cases ·
Ivy=integration/data-flow. Jordan(me)=Audit+Quantum.
