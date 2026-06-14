# HANDOFF — the baton

> Single source of truth for **what the next chat does first**. Rewritten by `/closeout` at
> the end of every chat; read by `/handoff-audit` at the start of the next. If this file and
> the code disagree, the code wins — fix the baton. See `docs/SESSION_PROTOCOL.md`.

**Last rewritten:** 2026-06-14 · **By:** REC-004 — Full Repository Memory Reconciliation Sweep
**Active branch:** `claude/repo-memory-reconciliation-frcgap` (docs/memory-only — see "Open PRs" below)
**Just merged to main (head moved `15f9699` → post-#46 during this sweep):** the **FTUE epic** —
**PR #34** (starter-grant rail), **PR #35** (FTUE tutorial backend + Master Grower coaching),
**PR #39** (web `/ftue` guided route). Also live: **PR #29** (Dashboard / GameState wiring, titled
"PR #30"), **PR #33** (Launch Strain Integration Pack → 29-strain catalog), **PR #36** (mobile-first
responsive nav + Grow Chamber), **PR #38** (OMNI Charter v1.0), **PR #41** (DX-001 Care Feedback &
Celebration), **PR #43** (FTUE-closeout docs — owner merged it 10:09 UTC), **PR #45** (DIR-004 / FP-3
Primary Plant CTA), **PR #46** (REC-003 Studio Agent Registry — `docs/STUDIO_AGENT_REGISTRY.md`, the
live coordination roster).
**Parked (open PRs, green — do NOT modify):** **PR #27** Phenotype Generator Foundation,
**PR #28** Circadian Leaf Motion.
**Other open PRs:** **PR #32** E2E grow-loop CI, **PR #42** *MVP Feature Flag Layer* (the NEXT ACTION).
**Retired (closed without merge):** **PR #37** Grow Guide (superseded by the FTUE epic; backend ideas
salvaged to BACKLOG), **PR #40** mobile bottom nav (FP-1 superseded by #36; FP-3 re-cut as #45).

> **⚠️ This was a reconciliation sweep, not a feature chat — and `main` moved under it.** Before
> REC-004 the baton was frozen at the Graphics Phase (PR #26) while the entire **New-Player /
> Launch-Readiness** track landed on `main`; during the sweep the owner also merged the FTUE-closeout
> docs (#43), DX-001 (#41), FP-3 (#45) and the REC-003 Studio Agent Registry (#46). This sweep was
> rebased onto current `main` and reconciles the baton, BACKLOG, ROADMAP, DECISIONS, and MAP, and
> produces the **authoritative** consolidated Records ledger `docs/memory/CANONICAL_STATE.md` (PR /
> Branch / Directive ledgers + Critical Path + Department Status — *the source of truth for records,
> per the Director's REC-004 decision*). Live cross-agent coordination lives in
> `docs/STUDIO_AGENT_REGISTRY.md` (REC-003); CANONICAL_STATE is the point-in-time snapshot. **No
> production code was changed by REC-004.** The backend OPEN RISKS below were **not** re-audited.

---

## NEXT ACTION (the one scoped item the next chat does)

**Audit & land Feature Flags (open PR #42 — "MVP Feature Flag Layer").** Feature Flags are the head
of the launch critical path, and a PR already exists — so the next chat **audits and finishes #42**
rather than building from scratch. Goal: a minimal, data-driven launch gate / kill-switch surface so
player-facing surfaces (the new `/ftue` tutorial, chamber polish, future systems) can be toggled
per-environment **without a deploy**, mirroring the `balance.yaml` "tuning surface" convention
(data-driven over code). Confirm the shape is additive: a `flags` section in config (or a small
`feature_flags` table only if per-player/cohort targeting is needed), a server-authoritative read
endpoint, and a tiny web hook to gate routes/components.
- **Off-limits:** no economy / chain / breeding / factions / combat / new crop families; no new
  Phase-2 systems. Do **not** modify the parked PRs (#27, #28).
- **Reuse, don't rebuild:** the chamber renders through `web/src/lib/chamber/chamberCore.ts` (single
  source for the live component + the headless `npm run gen:stages` generator) — keep it intact. The
  flat `GET …/plants/<id>/state` wire is canonical (DECISIONS 2026-06-14); do **not** build the
  aspirational `GameState/EnvironmentState/UIState` aggregate.
- **Critical path:** **Feature Flags (#42) → Mobile Polish (#36 ✅; #40/#41/#37 open) → Playtesting
  → Retention Validation → MVP Launch Candidate.** Off-chain MVP first; Sprint 4 (real TestNet/IPFS)
  is post-MVP and still gated by RISK #4/7.

---

## What THIS chat did (REC-004 reconciliation)

A one-time, read-only audit of `main` (10 worker assignments: PR/branch ledgers, baton, charter,
Phase-1 + feature flags, FTUE, plant engine, DX/mobile, backlog/ADRs, consolidation), then a
documentation/memory sweep — **no production code touched**:
- **Rewrote this baton** off the stale Graphics Phase onto the New-Player / Launch-Readiness track.
- **Reconciled `BACKLOG.md`** — marked the Graphics Phase + Dashboard wiring (#29/#30) ✅ COMPLETE,
  recorded the FTUE epic (#34/#35/#39), the launch strain pack (#33 → 29 strains), mobile-first nav
  (#36), and the OMNI Charter (#38); added the 🚀 New-Player / Launch-Readiness track with the
  critical path; noted the open PRs (#32/#37/#40/#41/#42/#43).
- **Reconciled `ROADMAP.md`** — recorded FTUE + mobile-first DX + OMNI Charter as shipped; catalog 29.
- **Appended `DECISIONS.md`** — ADRs for the FTUE epic, mobile-first navigation (#36), and adopting
  the OMNI Charter (#38).
- **Fixed `MAP.md`** — strain catalog/KB **22 → 29**; registered the new Records ledger.
- **Created `docs/memory/CANONICAL_STATE.md`** — the Records-Department single source of truth.
- Standup: `docs/memory/standups/2026-06-14-REC-004-reconciliation.md`.

## Verification split (this chat)

**Agent-verifiable (proven):**
- No code changed. Gates re-run on the docs branch: `make check-memory` ✅ · `make test` ✅ ·
  `make lint` ✅ (results recorded in the REC-004 standup).
- PR/branch ledgers cross-checked against the live GitHub PR list + `git log origin/main`; strain
  counts confirmed by parsing `data/strains.yaml` + `data/strain_knowledge.yaml` (29 each).

**Device/human-verifiable (owner):**
- The reconciliation **decisions**: whether to close PR #43 in favour of this sweep (or merge #43
  first), how to reconcile open PR #37 against the already-merged FTUE epic, and whether to prune the
  merged/abandoned branches in the Branch Ledger (destructive git = stop-and-ask).

---

## OPEN RISKS (carried) — NOT re-audited this chat

> These predate this sweep and were not re-verified here (REC-004 changed no code). Re-audit against
> current code before acting. A risk clears only when VERIFIED FIXED (test-backed).

| # | Sev | Risk | Evidence | Status |
|---|-----|------|----------|--------|
| 3 | HIGH | Idempotency on mutations — general `Idempotency-Key` header (duplicate → original response, not a 409). | `api/game_api.py` | PARTIAL — concurrency core + one-shot grants shipped (`grant_claims`, harvest-once index); FTUE `advance` is replay-guarded. General header still absent (WIP PR #16 closed unmerged). |
| 4/7 | HIGH | **Chain settlement not real** — deposit trusts no on-chain proof; treasury-drain path; no txid replay protection / reconciliation / address validation. | `services/settlement_service.py`, `db/models.py` | OPEN — blocks any real value moving (Sprint 4 gate). |
| 8 | HIGH | **Web safety net** — vitest runs in CI; Playwright e2e is still an `echo` stub; treasury-cap + chain-failure-rollback tests absent. | `web/package.json`, `.github/workflows/ci.yml` | PARTIAL (relates to open PR #32). |
| 9 | MED | **Sim dormancy semantics** — large `max_catchup_hours` gaps can delay an earned harvest / skip lethal decay; needs a design decision + knob guard. (FTUE sidesteps it for the tutorial plant via `last_tick_at = now`; the general knob is unchanged.) | `simulation/engine.py` | OPEN. |
| 11 | LOW | Rate-limiter `memory://` per-worker (set Redis for multi-worker); `get_level` public oracle. | fleet-sweep audit | PARTIAL. |

**Cleared since the graphics-phase baton:** *Web global 401/403 handler* (prev RISK #10) — an
`AuthErrorListener` tears down the session on a rejected key, shipped in **PR #29/#30** (see
`DECISIONS.md` 2026-06-14).

> Reassuring (verified solid earlier, not re-checked here): no IDOR; auth/authz server-authoritative;
> AI SpendGuard unescapable + CI never hits a live key; ledger correct single-threaded; no
> model↔migration drift (single Alembic head `9d669edf48a8`).

---

## DIRECTOR DECISIONS (REC-004, resolved 2026-06-14)

1. **PR #43** — owner **merged** it (10:09 UTC) before the Director's decision; its content is now on
   `main` and is fully folded into / superseded by REC-004. ✅ resolved (no action; not closeable).
2. **PR #37 (Grow Guide)** — **closed** (unmerged) as superseded by the FTUE epic. Unique ideas
   preserved: the REC-003 registry salvaged its game-state-driven / non-nagging progression; this
   sweep additionally logged its backend work orders **WO-1** (per-action "last cared at" signals) and
   **WO-2** (a "session delta / welcome-back" endpoint) to BACKLOG. ✅ resolved.
3. **Branch pruning** — **approved**; the verified stale-branch report is in
   `docs/memory/CANONICAL_STATE.md` §3. Per the Director's "stop after reports and cleanup
   recommendations," REC-004 **recommends** the prune list but does **not** delete (destructive git is
   denied to agents by `.claude/settings.json` and is the owner's to execute). ⬜ owner executes.

> **Remaining for the next chat:** the NEXT ACTION above — audit & land Feature Flags (open PR #42).
> Before building, follow the REC-003 registry: claim file surfaces in `docs/STUDIO_AGENT_REGISTRY.md`
> and rebase onto `main` first.
