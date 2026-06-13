# HANDOFF — the baton

> Single source of truth for **what the next chat does first**. Rewritten by `/closeout` at
> the end of every chat; read by `/handoff-audit` at the start of the next. If this file and
> the code disagree, the code wins — fix the baton. See `docs/SESSION_PROTOCOL.md`.

**Last rewritten:** 2026-06-13 · **By:** plant-visuals / whole-plant chat
**Active branch:** `claude/planning-session-4v29n1`
**Merged to main:** **PR #18** (merge `48ea3cb`, 2026-06-13) — Detailed Bud View overhaul + 3 launch
strains + whole-plant systems. Independent audit: **CONCERNS** (receipt `docs/audits/PR-18-plant-visuals.md`)
— substance solid (all gates green locally, 8/8 claims verified), the only real gap was a flaky
backend test (`test_service_forecast_uses_its_clock`) that #18 merged with red.
**Follow-up PR (this branch → main):** lands the **de-flake fix** for that test (it's flaky on main
until this merges) + this audit receipt + the baton rewrite. Owner-directed pivot off the old baton.

> **Pivot note:** this session did **not** do the previous baton's NEXT ACTION (idempotency keys).
> The owner redirected the whole session to **plant visuals → strains → whole-plant** as the launch
> priority, and decided the Macro Bud View is "done enough" for launch (becomes an optional
> inspection/collector/NFT mode). The canonical spec for all of this now lives in **`/knowledge/`**
> (Botanical Bible + 10 docs). The launch-hardening risks below are therefore still OPEN.

---

## NEXT ACTION (the one scoped item the next chat does)

**Whole Plant phase, step 2 — finish the "alive" feel + start closing the web-test gap.** The five
core systems landed this chat (node-spacing genetics, branch curvature, bud-weight droop, airflow
wave, stretch animation). Next:
- **Per-strain fan-leaf morphology** (`leafFingerCount`/`leafWidth`/`leafLength`/`serrationDepth`)
  so leaves differ between strains, and **circadian** leaf motion (lights-on pray up, lights-off
  droop) — see `knowledge/whole-plant-architecture.md`.
- **Stand up a real vitest smoke** for the pure chamber logic (`morphology.ts`, `budDna.ts`,
  `strainVisuals.ts`) and wire it into web CI — begins closing **RISK #8** (the now ~heavy canvas
  code has zero executing JS test).
- **Scope:** `web/` only (`GrowChamber.tsx`, `lib/chamber/*`, a vitest config + tests).
- **Off-limits:** backend/api/sim/chain (no migration), the macro bud generator (it's done).
- **Then (separate):** the performance pass (offscreen-cache + visibility-gate the always-mounted
  strain hero) and the dashboard/GameState wiring toward the MVP loop.

---

## What THIS chat did (PR #18)

Owner-directed plant-visuals → strains → whole-plant phase:
- **Detailed Bud View**: DNA-driven generator (`BudDNA` presets per strain in
  `web/src/lib/chamber/budDna.ts`) → concentric **ring-packing** with golden-angle twist + brick
  nesting (`GrowChamber.tsx` `buildMacro`) → teardrop/ribbed/fuzzy calyx **texture** (center vein,
  side ridges, speckles, edge shadow, micro-fuzz) → additive **frost** patches → **§11 environmental
  reactions** (`applyEnvironmentToBudDNA`, non-mutating).
- **Per-strain bud colour** (`strainVisuals.ts`) — authored, pistil colour decoupled from anthocyanin.
- **Three launch strains** in the engine: **G13** (EPIC), **Purple Diddy Punch** (RARE, original),
  **Animal Mints** (RARE) — `data/strains.yaml` + full `strain_knowledge.yaml` (catalog↔KB sync at
  25). Growable + breedable via the generic cross.
- **Growth-preview slider** (chamber TIME tab); **strain-profile hero bud** (`/lab/strains/[id]`).
- **Whole-plant chamber systems**: node-spacing genetics, bezier **branch curvature**, **bud-weight
  droop**, **airflow wave** (top leads), **stretch animation** over flowering (`buildPlant`/`drawPlant`).
- **Canonical `/knowledge/` base** (Botanical Bible + anatomy/macro-rules/strain-dna/environment/
  mutation/genetics/grow-tent/procedural/whole-plant docs).
- De-flaked `test_service_forecast_uses_its_clock` + `test_catch_up_advances_growth_stage` (per-plant
  RNG + tight window → primed healthy + 5-day margin; 25/25 locally).

## Verification split (this chat)

**Agent-verifiable (proven):** `make test` **222 passed, coverage 80.87% ≥ 79** · `make lint` ✅ ·
`make check-memory` ✅ (18 files) · `make check-migrations` ✅ (head `f1a2b3c4d5e6`, no new migration) ·
web `tsc`/`lint`/`build` ✅ · de-flake loop **10/10** · independent audit verified 8/8 claims at
file:line (`docs/audits/PR-18-plant-visuals.md`).

**Device/human-verifiable (owner):** the plant/bud render is **eye-verified via screenshots only** —
no test asserts canvas output (RISK #8). Confirm the whole-plant + bud look in-app.

---

## OPEN RISKS (carried) — clears only when VERIFIED FIXED (test-backed)

| # | Sev | Risk | Status |
|---|-----|------|--------|
| 3 / 6 | HIGH | Idempotency-Key header + one-shot-grant uniqueness (stipend/achievement). | OPEN — concurrency core fixed earlier; the header + faucet-uniqueness remainder is untouched. |
| 4 / 7 | HIGH | Chain settlement not real / deposit trusts no on-chain proof. | OPEN — TestNet-gated; owner keeps chain docs/design-only for now. ALGO launch is the stated end goal. |
| 8 | HIGH | **Web safety net phantom + now WIDENED** — vitest/Playwright still stubbed to `echo`; this PR added ~500 lines of untested canvas code (`GrowChamber.tsx`, `lib/chamber/*`). | OPEN/worse — first item of the NEXT ACTION starts a real vitest smoke. |
| 9 | MED | Sim dormancy semantics. | OPEN. |
| 10 | MED | Web: no global 401/403 handler. | OPEN. |
| 11 | LOW | Redis rate-limit storage; `get_level` public oracle. | PARTIAL. |

> Reassuring (verified solid): no model↔migration drift; ledger/genetics/concurrency test-backed;
> AI SpendGuard unescapable; CI never hits a live key; catalog↔KB sync enforced (25 strains).
> The plant-visual systems are eye-verified, not test-backed — that's RISK #8.
