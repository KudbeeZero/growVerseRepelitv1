# Audit — PR #18: plant-visuals / strains / whole-plant

**Branch:** `claude/planning-session-4v29n1` → `main` · **Head SHA:** `2d234d6` · **Auditor run:** 2026-06-13
**CI on the PR:** ⚠️ MIXED — last completed run (on parent SHA `78866ca`) had **backend FAILED, web success**; head SHA `2d234d6` (the de-flake fix) has **no checks yet (pending)**. The backend failure was the exact flaky test this PR's final commit repairs (see Claim 7).
**Reviewer:** independent auditor (does not trust PR prose)

Scope of verification: today's plant/strain/whole-plant commits `e1e30e5..2d234d6` (12 commits, all 2026-06-13). Older branch history is already in `main` (full-branch diff == today's diff: 21 files, +1577/-91).

## Claims vs. evidence
| # | PR claims | Verified? | Evidence (`file:line`) |
|---|-----------|-----------|------------------------|
| 1 | Three strains added to catalog | ✅ | `src/growpodempire/data/strains.yaml` — G13, Purple Diddy Punch, Animal Mints (diff lines 10/18/26) |
| 2 | Full KB entries for all three; catalog↔KB sync test passes | ✅ | `strain_knowledge.yaml:629` `g13:`, `:657` `purple-diddy-punch:`, plus `animal-mints:` — full detailed entries (aroma/terpenes/cannabinoids/grow), not stubs. `tests/test_knowledge.py::test_every_catalog_strain_has_a_knowledge_entry` → 6 passed |
| 3 | `budDna.ts` per-strain presets | ✅ | `web/src/lib/chamber/budDna.ts:71-87` AUTHORED map has `g13`, `purple-diddy-punch`, `animal-mints` |
| 4 | `applyEnvironmentToBudDNA` is non-mutating | ✅ | `budDna.ts:128-160` — deep-copies palette (`base.palette.map((p) => ({ ...p }))`, :140) and returns a fresh object via spread (`{ ...base, ... }`, :148). Genetic preset untouched |
| 5 | Ring-packing + golden-angle in macro builder | ✅ | `GrowChamber.tsx:291` ring assignment `j<3?0:j<7?1:2`; `:292` golden angle `(j * 2.399) % TAU` (≈137.5°); `:301` `pods.sort` by ring (concentric draw order) |
| 6 | 5 whole-plant systems in buildPlant/drawPlant | ✅ | node spacing `GrowChamber.tsx:547`; branch curvature `:664` (`rot` w/ topStretch); bud-weight droop `:1042-1044,:1073`; airflow wave `:1036-1039` (top leads, lower nodes lag); stretch `:521-527,:642-664`. `buildPlant():513`, `drawPlant():995` |
| 7 | De-flaked stage-forecast / catch-up tests | ✅ | `tests/test_stage_forecast.py` & `test_simulation.py` — prime plant healthy/fed + widen forecast window 4→5d. Test-only; no engine change. 10×10 deterministic locally |
| 8 | `/knowledge` docs exist | ✅ (as docs, NOT a web route) | 10 files under `knowledge/` (botanical-bible, whole-plant-architecture, macro-bud-rules, …). No `web/src/app/knowledge` route exists — claim refers to the doc corpus |

No phantom claims found.

## Gates re-run by the auditor
- `make test` → **PASS — 222 passed, coverage 80.87% ≥ 79%** (50.8s)
- `make lint` → **PASS** (ruff E9,F63,F7,F82 clean)
- `make check-memory` → **PASS** (18 files, links + ✅ citations resolve)
- `make check-migrations` → **PASS** (single head `f1a2b3c4d5e6` — unchanged; no migration in this PR)
- web `tsc --noEmit` → **PASS** (exit 0)
- web `next lint` → **PASS** (no ESLint warnings/errors)
- web `next build` → **PASS** (exit 0; all routes compiled incl. chamber + lab/strains)
- Determinism loop `pytest test_stage_forecast.py test_simulation.py` ×10 → **10/10 PASS**

All gates green on the auditor's machine at head SHA `2d234d6`.

## Scope check
- In-scope diff (21 files): `knowledge/*.md` (10), `docs/BUD_ARCHITECTURE_BLUEPRINT.md`, `strains.yaml`, `strain_knowledge.yaml`, `tests/test_simulation.py`, `tests/test_stage_forecast.py`, `web/.../chamber/page.tsx`, `web/.../lab/strains/[strainId]/page.tsx`, `web/components/viz/GrowChamber.tsx`, `web/lib/chamber/{budDna,morphology,strainVisuals}.ts`.
- **Divergence from baton (NOT rogue creep — owner-directed):** The baton's NEXT ACTION was "Finish idempotency: `Idempotency-Key` header + one-shot-grant uniqueness (RISK #6 remainder)", scope `api/` + migration + `progression_service.py`, with web/sim/chain **off-limits**. PR #18 did **none of that** — zero idempotency code, no migration, `progression_service.py`/`api/`/`economy/` untouched. It instead shipped a plant-visuals workstream touching the declared-off-limits **web** (6 files) and **data** (strains). Per the task brief, the session transcript shows the owner redirected to plant visuals → this is an **owner-directed pivot**, not unauthorized creep. The baton was simply not updated to reflect the redirect (HANDOFF.md untouched).
- **No off-limits sim-engine or chain *source* touched.** Only `tests/test_simulation.py` (a test) was edited; `simulation/`, `chain/`, `settlement_service.py` source is untouched.

## Carried-risks ledger check
- Any OPEN RISK silently dropped from `docs/HANDOFF.md`? **No.** The PR does not touch `docs/HANDOFF.md`, `economy/`, `api/`, or `docs/memory/`. The ledger (#1–#11) is intact.
- Any risk marked FIXED **without** a test? **No.** The PR makes no ledger edits, so no FIXED claims were added.
- HIGH risks still OPEN and untouched by this PR: **#3/#6 idempotency remainder** (no idempotency code), **#7 chain settlement** (no chain code), **#8 web safety net** — vitest/Playwright still stubbed; this PR added ~500 lines of untested web canvas code (`GrowChamber.tsx`, `budDna.ts`) with **no executing JS test coverage**, widening the #8 gap.

## Device-verifiable vs agent-verifiable
- **Agent proved:** all 7 gates green at head SHA; 222 backend tests + coverage 80.87%; 10/10 determinism on the de-flaked tests; all 8 load-bearing claims confirmed at file:line; non-mutation of `applyEnvironmentToBudDNA`; CI backend failure on parent SHA was the exact flake this PR's last commit fixes.
- **Owner must confirm by hand:** the *visual* result of the plant/bud rendering (ring-packing cola, whole-plant droop/sway, per-strain colours) — canvas output is not asserted by any test and only a human can judge fidelity. Also: re-run CI on head SHA `2d234d6` to confirm the de-flake clears the backend job before merge.

## Verdict
**CONCERNS** — All gates pass locally and every load-bearing claim is verified at file:line, but (1) the PR head SHA has **no green CI yet** (last run failed the backend job on the parent SHA; the de-flake fix is unverified by CI), (2) it is a large **owner-directed pivot away from the baton's NEXT ACTION** that left HANDOFF.md stale, and (3) it adds ~500 lines of **untested web canvas code**, widening the already-OPEN HIGH RISK #8 (web safety net). No invariants violated, no risk silently dropped, no FIXED-without-test.
