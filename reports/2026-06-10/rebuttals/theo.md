# Theo — docs & compliance rebuttal / handoff notes (2026-06-10)

Lane: `LICENSE`, `README.md`, `docs/memory/MAP.md`, `setup.py` (license metadata only),
the player strain manual (`docs/manual/strain-codex.md`), `.env.example` (doc fixes only).

All assigned findings (F034/G1, F035/G2, G3, G4, G5, G6) were resolved in the working
tree. `make check-memory` passes. No fabricated claims introduced. Two items below are
NOT rebuttals of my own work — they are out-of-lane handoffs I cannot fix without
touching files another owner controls.

## Handoff 1 — residual strain-count drift OUTSIDE my lane (G2 follow-on)
`docs/manual/game-manual.md:161` still reads:

> A **strain** is a genetic line in the catalog (16 founders ship at launch; you
> create more by breeding).

The catalog now ships **47** strains (verified: 47 `name:` entries in
`src/growpodempire/data/strains.yaml`, 47 slug entries in `strain_knowledge.yaml`,
1:1 sync test-enforced). `game-manual.md` is not in my assigned edit list (only
`strain-codex.md` is), so I did not change it. Recommend the docs owner update
line 161 to reflect 47 catalog strains (or "47 catalog strains, 16 catalogued in
full" to match the codex framing). This is the same G2 drift class, just in a
sibling manual file.

## Handoff 2 — "16 founders" phrasing retained in strain-codex.md is INTENTIONAL
`docs/manual/strain-codex.md` still references "16 founders" in its master table
heading and per-strain detail entries. This is correct and was left deliberately:
the codex header now states the vault ships **47 catalog strains** and explains
that the **16 founding** strains are the ones catalogued in full (genomes, hidden
resistances, tier lists), while the remaining 31 expansion strains are seeded and
surfaced live via `GET /strains/<id>/knowledge`. The "16" here describes the subset
documented in depth, not the total catalog size — so it is accurate, not stale.
Flagging it so a future grep-for-"16" pass does not "fix" a true statement.

## Verification evidence
- `make check-memory` → `OK: memory layer integrity verified (links, ✅ claims, codex map).`
- Catalog count: `grep -cE '^\s{2}- name:' src/growpodempire/data/strains.yaml` → 47
- KB count: 47 top-level slug entries in `src/growpodempire/data/strain_knowledge.yaml`
- Stale-count sweep of README/MAP/strain-codex for `16 founding | 139 | 22 catalog | 22-strain`
  → clean.
- LICENSE: standard MIT, year 2026, holder "GrowPod Empire (GROWv2)" — generic, no
  personal data. README MIT badge + footer "MIT Licensed" + `setup.py` license metadata
  now all backed by the LICENSE file.
