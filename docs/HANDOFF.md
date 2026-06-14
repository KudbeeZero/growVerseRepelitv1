# HANDOFF — the baton

> Single source of truth for **what the next chat does first**. Rewritten by `/closeout` at
> the end of every chat; read by `/handoff-audit` at the start of the next. If this file and
> the code disagree, the code wins — fix the baton. See `docs/SESSION_PROTOCOL.md`.

**Last rewritten:** 2026-06-14 · **By:** BE-004.5 playtesting chat (PR #59 confirmed merged; FF-RECON-001 claimed; playtest run)
**Active branch:** `claude/growpod-playtesting-flags-ua1ikq` (docs-only: playtest report + registry/baton updates)
**Confirmed this chat:** **PR #59 (STEP 4.5 — `GameService` on `active_clock()` + cure e2e) is MERGED** to
`main` (commit `5d44d35`, merged 2026-06-14T12:40:34Z by KudbeeZero). **Carried RISK #1 → CLOSED**
(cure/auction now dev-clock-drivable; verified live + by `test_cure_advances_under_dev_clock`).
**Gates on `main`:** `make test` → **283 passed, 84.63%** (≥79 floor); `make lint` ✅; `make check-memory` ✅.
**CI:** `main` **green** — the merge-commit (`5d44d35`) CI run completed **success**.
**Playtest:** `docs/playtesting/BE-004.5-playtest-report.md` — core loop, economy invariants, fail-closed
feature-gating, and error scenarios all pass over the live HTTP API; **zero product defects**. Device/web-only
matrix (mobile viewport, safe-area, reduced-motion, keyboard a11y, screenshots, Playwright real-e2e) is **owner-verifiable, not run**.
**Just merged to main (this chat):** **PR #47 — Simulation Test Clock (BE-002, STEP 3) + e2e Grow Loop
(BE-004, STEP 4).** The dev/test-only `OffsetClock`/`active_clock()` seam, the `/api/dev/clock/*`
endpoints (force-disabled in production), **plus** the full core-loop e2e (seed → plant → flower →
harvest → sell over the HTTP API, fast-forwarded with the dev clock) and HTTP-boundary coverage for
the value-bearing routes (RISK #8, backend side). **Test-only / no production behaviour change.**
**Closed this chat:** **PR #44** (the competing STEP 3 test-clock) — **superseded by PR #47** per the
Director's BE-004A reconciliation decision.
**Recently merged (per `main` / REC-004 sweep):** FTUE epic (**#34/#35/#39**), Dashboard wiring
(**#29/#30**), Launch Strain Pack (**#33** → 29-strain catalog), mobile-first nav (**#36**), OMNI
Charter (**#38**), DX-001 Care Feedback (**#41**), FP-3 Primary CTA (**#45**), REC-003 Studio Agent
Registry (**#46**), REC-004 memory reconciliation (**#50**), University curriculum docs (**#51**).
**Parked (open PRs, green — do NOT modify):** **PR #27** Phenotype Generator Foundation,
**PR #28** Circadian Leaf Motion.
**Other open PRs (owner decision):** **PR #32** E2E grow-loop CI (service-layer + a CI gate step) —
**now overlaps PR #47's HTTP e2e**; the owner should decide *merge for the CI gate* vs *close as
overlapping*. **PR #42** *MVP Feature Flag Layer* (the NEXT ACTION).

> **Launch-Readiness path (Builder Dept):** Feature Flags → STEP 3 Simulation Test Clock ✅ → STEP 4
> e2e Grow Loop ✅ → **Feature Flags (#42, NEXT)** → Playtesting → Retention Validation → MVP Launch
> Candidate. The backend OPEN RISKS below were **not** re-audited beyond RISK #1/#8; re-verify against
> current code before acting. The authoritative consolidated Records ledger is
> `docs/memory/CANONICAL_STATE.md`; live cross-agent coordination is `docs/STUDIO_AGENT_REGISTRY.md`.

---

## NEXT ACTION (the one scoped item the next chat does)

**Feature Flags are DONE — `main` has ONE canonical system: PR #42 (CEO-selected 2026-06-14).**
Env-driven `FEATURE_*` (`Settings`/`create_app` → `current_app.config`) + `api/feature_gates.require_feature`
(404 when off), web mirror `NEXT_PUBLIC_ENABLE_*` (`web/src/lib/features.ts`) + `RequireFeature.tsx` +
nav gating (`navLinks.ts`) + route-layout gating (`app/{cup,university,market}/layout.tsx`), **defaults OFF**.
The duplicate backend layer (BE-003 / #55: `feature_flags.py` + `balance.yaml feature_flags:` +
`GET /api/game/flags`, defaults ON) was **retired via PR #61**.
**FF-RECON-001's "consolidate A→B / keep #55" proposal is SUPERSEDED** by the CEO decision to adopt
#42 — do **not** consolidate onto #55, and do not resurrect it. Feature-flag infra is a
**single-writer protected surface**; #42 is the sole canonical implementation.
- **Do NOT build or resurrect another flag system.** Toggle a launch surface via its `FEATURE_*` /
  `NEXT_PUBLIC_ENABLE_*` env (per-environment, no deploy); add a flag by extending PR #42's set.
- **Off-limits:** no economy / chain / breeding / factions / combat / new crop families. No new
  Phase-2 systems. Do NOT modify the parked PRs (#27, #28).
- **Next launch-path item:** the web/device playtest pass → Retention Validation → MVP Launch Candidate.

> **Also queued (owner/device):** the web playtest pass — run `cd web && npm i && npm run dev` and verify
> the device-only matrix the headless playtest could not (mobile viewport/safe-area, reduced-motion,
> keyboard a11y, refresh-mid-action, stale cache) + stand up the Playwright real-e2e (RISK #8 web side).

> **✅ Update (BE-004.5 playtest chat):** STEP 4.5 **merged as PR #59** (`5d44d35`); **RISK #1 closed**;
> Playtesting **done** (this chat — see report). Feature Flags **resolved** — #42 canonical, the #55
> duplicate retired via **PR #61**, FF-RECON-001 **superseded** (CEO decision). The path is now
> **web/device playtest pass → Retention Validation → MVP Launch Candidate.**

---

## What THIS chat did (BE-004A reconciliation + PR #47 landing)

Reconciled the three overlapping Builder-Dept PRs and landed the canonical one, per the Director's
BE-004A decision:
- **Reviewed PRs #32 / #44 / #47** and recommended #47 as canonical (the only one delivering the
  `/api/dev/clock/*` HTTP endpoints + `APP_ENV` prod-gate that BE-004 requires); confirmed BE-004's
  e2e + HTTP-boundary work was **already built on #47's branch** (commit `e9df323`), test-only and
  green.
- **Resolved #47's merge conflicts against current `main`** — docs-only (`HANDOFF.md`,
  `DECISIONS.md`; `BACKLOG.md` auto-merged); **zero source-code conflicts** — and merged #47.
- **Closed PR #44** as superseded by #47.
- Folded the STEP 3 (BE-002) and STEP 4 (BE-004) ADRs into `DECISIONS.md` alongside main's FTUE /
  mobile-nav / OMNI ADRs; recorded the landing in `BACKLOG.md` (STEP 3 ✅ / STEP 4 ✅).

Shipped by PR #47 (authored across the BE-002 + BE-004 sessions):
- **`tests/test_e2e_grow_loop.py` (3)** — full HTTP-API loop, dev-clock fast-forward; asserts balance
  rises by exactly the `harvest_sale` entry, no double-sell, and **ledger integrity** (advancing the
  clock posts zero ledger entries — BE-A08).
- **`tests/test_http_boundary.py` (13)** — RISK #8 HTTP coverage: withdraw/deposit (happy + validation
  + auth + insufficient), mint (happy/idempotent/not-found), strain non-breeder, ARC-3 metadata +
  unknown-kind 404. Offline `MockChainProvider`.
- **`tests/test_test_clock.py` (15)** — the OffsetClock primitive, config gating (off by default /
  on in dev / **force-off in prod**), the `active_clock()` selector, and the endpoints.
- **Docs:** `docs/SIMULATION_TEST_CLOCK.md`, `docs/STEP4_E2E_GROW_LOOP_VALIDATION.md`,
  `docs/audits/PR-47-simulation-test-clock.md`, standups `2026-06-14-lut-report-be002.md` /
  `-be004.md`.

## Verification split (this chat)

**Agent-verifiable (proven):**
- Post-merge gates on the merge result: `make test` ✅ · `make lint` ✅ · `make check-memory` ✅
  (re-run after conflict resolution — see the closeout report). PR #47's own suite: **262 passed,
  83.63% ≥ 79**; settlement 87% / minting 73% HTTP-boundary coverage.

**Device/human-verifiable (owner):**
- `GROW_TEST_CLOCK=true APP_ENV=development make serve`; `POST /api/dev/clock/advance {"days":40}` →
  plant flowers on next `/state`; harvest + sell succeed; `/api/dev/clock/*` 404 with flags unset.
  (Automated equivalents of all four are in the suite above.)

---

## OPEN RISKS (carried) — re-verify against current code before acting

> A risk clears only when VERIFIED FIXED (test-backed). Risk #1 is new (STEP 4).

| # | Sev | Risk | Evidence | Status |
|---|-----|------|----------|--------|
| 1 | MED | **Cure/auction not dev-clock-drivable.** `GameService` defaulted to `SystemClock`, so the dev clock couldn't fast-forward cure/auction over HTTP. | `services/game_service.py` (now `active_clock()`) | ✅ **CLOSED** — STEP 4.5 merged as **PR #59** (`5d44d35`); verified live in the BE-004.5 playtest + `test_cure_advances_under_dev_clock`. |
| 3 | HIGH | Idempotency on mutations — general `Idempotency-Key` header (duplicate → original response, not a 409). | `api/game_api.py` | PARTIAL — concurrency core + one-shot grants shipped (`grant_claims`, harvest-once index); FTUE `advance` replay-guarded. General header absent (WIP PR #16 closed unmerged). |
| 4/7 | HIGH | **Chain settlement not real** — deposit trusts no on-chain proof; treasury-drain path; no txid replay protection / reconciliation / address validation. | `services/settlement_service.py`, `db/models.py` | OPEN — blocks any real value moving (Sprint 4 gate). |
| 8 | HIGH | **Safety net** — **backend HTTP boundary now covered (PR #47: withdraw/deposit/mint/nft, `tests/test_http_boundary.py`)**; **web** Playwright real e2e still a stub; treasury-cap + chain-failure-rollback UI tests absent. | `web/package.json`, `.github/workflows/ci.yml`, `tests/test_http_boundary.py` | PARTIAL (backend ↑; relates to open PR #32). |
| 9 | MED | **Sim dormancy semantics** — large `max_catchup_hours` gaps can delay an earned harvest / skip lethal decay; needs a design decision + knob guard. (FTUE sidesteps it for the tutorial plant via `last_tick_at = now`.) | `simulation/engine.py` | OPEN. |
| 11 | LOW | Rate-limiter `memory://` per-worker (set Redis for multi-worker); `get_level` public oracle. | fleet-sweep audit | PARTIAL. |

**Cleared earlier:** *Web global 401/403 handler* (prev RISK #10) — an `AuthErrorListener` tears down
the session on a rejected key, shipped in **PR #29/#30** (see `DECISIONS.md` 2026-06-14).

> Reassuring (verified solid earlier, not re-checked here): no IDOR; auth/authz server-authoritative;
> AI SpendGuard unescapable + CI never hits a live key; ledger correct single-threaded; no
> model↔migration drift (single Alembic head).

---

## DIRECTOR DECISIONS (resolved 2026-06-14)

**BE-004A — PR reconciliation (this chat):**
1. **PR #47** — **CANONICAL** for the Simulation Test Clock; preserve `OffsetClock` / `active_clock()`
   / `/api/dev/clock/{,advance,reset}` / dev-only gating (`GROW_TEST_CLOCK` + `APP_ENV`, prod
   hard-disable). Conflicts resolved + **merged** this chat (owner-approved exception to
   one-PR-one-responsibility, since BE-004 was already built+green on the branch). ✅
2. **PR #44** — **closed** as superseded by #47. ✅
3. **PR #32** — service-layer e2e + a CI gate step; now overlaps #47's HTTP e2e. **Owner decision
   pending:** merge for the CI gate, or close as overlapping. ⬜
4. **BE-004** — **closed/complete** (its deliverables shipped within PR #47). ✅

**REC-004 (prior sweep, still in force):**
- **PR #43** owner-merged (folded into REC-004). **PR #37** closed (superseded by the FTUE epic; WO-1/
  WO-2 logged to BACKLOG). **Branch pruning** approved — recommended list in
  `docs/memory/CANONICAL_STATE.md` §3; owner executes (destructive git is owner-only).
