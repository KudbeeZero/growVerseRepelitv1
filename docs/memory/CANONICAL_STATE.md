# 📒 Canonical Project State — Records Department single source of truth

> Produced by **REC-004 — Full Repository Memory Reconciliation Sweep** (2026-06-14). This is the
> consolidated, point-in-time ledger of *what exists* — PRs, branches, directives, the launch
> critical path, and department status — reconciled against `main` (head `15f9699`). It complements,
> and does not replace, the live baton (`docs/HANDOFF.md`) or the prioritized backlog
> (`docs/memory/BACKLOG.md`). When this file and the code disagree, **the code wins** — fix this file.
>
> **Maintenance:** this is a *snapshot* ledger, not a daily doc. Refresh it on the next full sweep or
> when a milestone materially changes the picture; cite PRs by GitHub number. Routine churn belongs in
> BACKLOG (priority) and the dated standups (Layer 4).

**Reconciled:** 2026-06-14 · **Against:** `main` @ `15f9699` · **By:** REC-004 (Records Department)

---

## 1) Canonical Project State (one screen)

**GROWv2 / GrowPod Empire** (`growpodempire`) — a cannabis-growing game: persistent ledger economy,
real strain genetics/crossbreeding, a server-authoritative compute-on-read grow simulation, an
Algorand on-chain asset layer (mock in CI; real settlement deferred to Sprint 4), and an AI "Master
Grower" advisor. Backend Python/Flask; web client Next.js 15 in `web/`.

| Dimension | State today |
|-----------|-------------|
| **Phase** | New-Player / **Launch-Readiness** track. Backend foundation (Phases 1–3) + Sprints 1–3 shipped; the Graphics Phase and Dashboard wiring are **done and signed off**; the **FTUE epic** (guided first grow) is merged. |
| **Core loop** | grow → care → harvest → cure → sell/breed/stabilize → mint → trade — intact and test-covered. |
| **Strain catalog** | **29 strains** in `data/strains.yaml`, each with a 1:1 encyclopedia entry in `data/strain_knowledge.yaml` (sync enforced by test). |
| **Web client** | All seven screen groups + grow chamber (whole-plant + macro bud), `/ftue` guided tutorial, mobile-first responsive nav. |
| **Chain / real value** | **Not live.** Mock provider only; real TestNet settlement is a Sprint-4 gate (carried RISK #4/7). |
| **Governance** | OMNI Charter v1.0 in force (`docs/OMNI_CHARTER.md`). Session Relay Protocol in force (`docs/SESSION_PROTOCOL.md`). |
| **Gates** | `make test` / `make lint` / `make check-memory` / `make check-migrations` green on `main` (single Alembic head). Web `tsc`/`lint`/`build`/`vitest` green. Playwright e2e still a stub (RISK #8). |

---

## 2) PR Ledger

GitHub repo `kudbeezero/growverserepelitv1`. **Note the numbering drift:** several PR *titles* carry an
internal "PR #N" label that does **not** match the GitHub PR number (the internal sequence skipped
ahead when parallel sessions opened #27/#28). The GitHub number is authoritative below.

### Merged to `main` (history)
| GH # | Branch | What landed |
|------|--------|-------------|
| 1 | `…game-build-first-pr-6t18lz` | Replit onboarding/sign-in fix + developer build log |
| 2 | `claude/plant-stage-timeline` | Plant grow timeline: stage progress + countdown |
| 3 | `…session-relay-protocol-ybubw7` | Session Relay Protocol + real integrity gates/CI |
| 5 | `session/local-bringup` | Local bring-up fixes + strain encyclopedia |
| 6 | `…bomb-squad-defects-un7ldl` | Bomb Squad defect sweep (via #10) |
| 8 | `claude/fleet-audit-hardening` | 10-agent hardening sweep + dev/prod SQLite parity |
| 9 | `…concurrency-idempotency-hardening` | Wallet optimistic lock + non-negative balance + harvest-once |
| 10 | `claude/merge-bomb-squad-6` | Land #6 (Constellation canvas lifecycle) onto current main |
| 11 | `claude/api-validation-hardening` | API validation: 500s → 400 + money-endpoint HTTP tests |
| 12 | `claude/night-shift-2026-06-10` | Grow Chamber WIP (feature-flagged-style preserve + reconcile) |
| 14 | `claude/terpene-effect-engine` | Terpene→Effect engine + economy transparency |
| 15 | `…grovers-particle-leaf-i1s759` | GROVERS v2 hero: living particle-leaf logo + announcements |
| 17 | `…grovers-particle-leaf-i1s759` | Governance: delegation charter + end-of-chat report |
| 18 | `claude/planning-session-4v29n1` | Detailed Bud View overhaul + first 3 launch strains (G13, PDP, Animal Mints) |
| 19 | `…plant-structure-audit-1vfkgv` | Whole plant: denser flowering skeleton + per-strain silhouette |
| 21 | `…code-review-error-sweep-7h57k6` | Marketplace optimistic lock on auctions + pre-launch sweep |
| 22 | `claude/deflake-forecast-test` | Launch cleanup: de-flake + per-plant seed + matte de-gloss + **vitest in CI** |
| 24 | `claude/leaf-morphology-per-strain` | Per-strain fan-leaf morphology |
| 25 | `…de-grape-whole-plant-buds-8zrsnb` | De-Grape whole-plant buds (continuous bud-mass silhouette) |
| 26 | `…bud-weight-physics-polish-7daxpa` | Bud Weight Physics polish — **carried the Canonical Stage PNG / `chamberCore` extraction** |
| 29 | `…dashboard-gamestate-wiring-90io9r` | Dashboard / GameState wiring polish (titled "PR #30"); flat `/state` stays canonical; `AuthErrorListener` |
| 33 | `claude/launch-strains-catalog` | Launch Strain Integration Pack — White Rhino, White Fire OG, Gelato, Wedding Cake (catalog → 29) |
| 34 | `claude/ftue-starter-grant` | FTUE starter-grant rail — pod + seed on signup (one-shot, idempotent) |
| 35 | `claude/ftue-tutorial-flow` | FTUE deterministic guided tutorial (backend) + AI Master Grower coaching |
| 36 | `…growpod-design-director-8lya2y` | DXD Mobile-first: responsive nav + responsive Grow Chamber |
| 38 | `…growpod-empire-constitution-oqtzqk` | OMNI Charter v1.0 organizational constitution |
| 39 | `claude/web-ftue-route` | Web `/ftue` guided tutorial route — Master Grower walks the first grow |

### Open (active / parked — do NOT autonomously merge)
| GH # | Branch | State | Note |
|------|--------|-------|------|
| 27 | `…phenotype-generator-foundation-h4ii5y` | **PARKED** (green) | Do not modify. |
| 28 | `…circadian-leaf-motion-q7w2n8` | **PARKED** (green) | Do not modify. |
| 32 | `claude/mvp-e2e-grow-loop` | OPEN | Deterministic E2E grow-loop CI (titled "PR #31"). Relates to RISK #8. |
| 37 | `…growpod-dxt-mission-m9qt54` | OPEN | FTUE Grow Guide — game-state-driven onboarding coach (mobile). Overlaps merged #34/#35/#39 — needs reconcile/close. |
| 40 | `claude/dxt-sprint03-mobile-ux` | OPEN | DX Sprint 03 — Mobile UX (native bottom navigation). |
| 41 | `…dx-care-feedback-celebration` | OPEN | DXD Care Feedback & Celebration (DX-001). |
| 42 | `…growpod-mvp-launch-planning-4n2ps4` | OPEN | **MVP Feature Flag Layer** — this is the "Feature Flags" critical-path item; audit & land rather than rebuild. |
| 43 | `claude/closeout-ftue-epic` | OPEN | Docs-only FTUE closeout: rewrites baton + BACKLOG + adds FTUE ADR/standup. **Superseded by REC-004** (this sweep folds its content in). Owner: close #43 or merge it first to avoid a conflicting double-edit of HANDOFF/BACKLOG/DECISIONS. |

### Closed without merge (superseded / abandoned WIP)
| GH # | Why |
|------|-----|
| 4 | Grow-chamber plants WIP — superseded; reconciled into #12. |
| 7 | Night-shift WIP — superseded. |
| 13 | Terpene→Effect WIP — superseded by #14 (rebased). |
| 16 | Idempotency-Key replay WIP — never merged; general `Idempotency-Key` header remains carried RISK #3. |
| 20 | De-flake follow-up — superseded by #22. |
| 23 | Stage-reference visual polish — superseded. |
| 30 | Canonical Stage PNG Generation — the work **landed via #26** (carried on its branch); this PR closed unmerged. |
| 31 | Launch Strain Integration Pack (first cut) — **superseded by #33** (merged). |

---

## 3) Branch Ledger

`main` is the trunk (`15f9699`). 44 `claude/*` + `session/*` branches exist on the remote; most are
**merged or superseded** and can be pruned. **Pruning is an owner decision** (charter: destructive git
is stop-and-ask) — this ledger only classifies.

- **Live / do-not-touch:** `main`; `claude/phenotype-generator-foundation-h4ii5y` (#27 parked);
  `claude/circadian-leaf-motion-q7w2n8` (#28 parked).
- **Open PR branches (in flight):** `mvp-e2e-grow-loop` (#32), `growpod-dxt-mission-m9qt54` (#37),
  `dxt-sprint03-mobile-ux` (#40), `dx-care-feedback-celebration` (#41),
  `growpod-mvp-launch-planning-4n2ps4` (#42), `closeout-ftue-epic` (#43).
- **Merged → safe to prune (representative):** `plant-stage-timeline`, `session-relay-protocol-*`,
  `fleet-audit-hardening`, `concurrency-idempotency-hardening`, `api-validation-hardening`,
  `night-shift-2026-06-10`, `terpene-effect-engine`, `planning-session-4v29n1`,
  `plant-structure-audit-*`, `code-review-error-sweep-*`, `deflake-forecast-test`,
  `leaf-morphology-per-strain`, `de-grape-whole-plant-buds-*`, `bud-weight-physics-polish-*`,
  `dashboard-gamestate-wiring-*`, `launch-strains-catalog`, `ftue-starter-grant`,
  `ftue-tutorial-flow`, `growpod-design-director-*`, `growpod-empire-constitution-*`, `web-ftue-route`.
- **Closed-unmerged / abandoned → safe to prune:** `grow-chamber-plants-*`, `grovers-night-shift-*`,
  `terpene-effects-economy`, `night-shift-pexjg3`, `stage-reference-visual-polish`,
  `launch-strain-integration-pack` (first cut), `growpod-stage-png-export-*`, plus exploratory
  branches with no PR (`cannabis-growth-engine-*`, `cannabis-strain-research-*`,
  `growpod-obsession-lab-*`, `multi-agent-stranger-outreach-*`, `heygen-hyperframes-install-*`,
  `session/local-bringup`, etc.).

---

## 4) Directive Ledger

Formal directives are a Records-Department construct introduced with the OMNI Charter; there is no
prior machine-readable registry, so earlier "directives" are reconstructed from PR titles/commits.

| ID | Title | Source | Status |
|----|-------|--------|--------|
| — | Session Relay Protocol (one-chat-one-PR + audited handoff) | `docs/SESSION_PROTOCOL.md` (PR #3) | ✅ in force |
| — | Owner delegation charter + end-of-chat report | `CLAUDE.md` (PR #17) | ✅ in force |
| OMNI v1.0 | Organizational constitution (chain of command, departments, work orders) | `docs/OMNI_CHARTER.md` (PR #38) | ✅ in force |
| DX-001 | Care Feedback & Celebration | PR #41 (open) | 🔨 in flight |
| DX-003 | FTUE epic (guided first grow) | PRs #34/#35/#39 | ✅ delivered |
| DXT Sprint 03 | Mobile UX (native bottom navigation) | PR #40 (open) | 🔨 in flight |
| **REC-004** | **Full Repository Memory Reconciliation Sweep** | this directive | ✅ this sweep |

---

## 5) Launch Critical Path

```
Feature Flags (PR #42 open — audit & land)
   → Mobile Polish (PR #36 ✅ nav+chamber; PR #40/#41/#37 open)
      → Playtesting
         → Retention Validation
            → MVP Launch Candidate
```

- **Off-chain MVP first** (charter principle): real TestNet settlement / IPFS (Sprint 4) is *after*
  the MVP, not on this path. It remains gated by carried RISK #4/7.
- The aspirational `GameState/EnvironmentState/UIState` aggregate is **not** on the path — the flat
  `GET …/plants/<id>/state` wire is canonical (DECISIONS 2026-06-14).

---

## 6) Department Status (per OMNI Charter)

| Department | Lead area | Status |
|------------|-----------|--------|
| **Executive** | Owner + Director Chat | OMNI Charter v1.0 in force; delegation charter active. |
| **Engineering — Backend** | economy/ledger, services, API | ✅ Phases 1–3 + Sprints 1–3 shipped, test-backed. Carried: idempotency header (#3), chain settlement (#4/7). |
| **Engineering — Simulation** | `simulation/` | 🔨 Phase A (VPD/DLI) + sim-cost-cap/dormancy shipped; Phase B (photosynthesis/transpiration/EC) ⬜. Dormancy *semantics* carried as RISK #9. |
| **Engineering — Frontend / Dashboard** | `web/` | ✅ full UI + chamber + `/ftue`; flat `/state` wire canonical; 401/403 handler shipped (RISK #10 cleared). |
| **Engineering — Strain Integration** | `data/strains.yaml` + chamber visuals | ✅ 29 strains, 7 with authored chamber visuals; rest derived. |
| **Design & Experience (UX/Mobile/Art/Tutorial/A11y)** | `web/` UX | 🔨 Mobile-first nav shipped (#36); FTUE tutorial shipped (#34/#35/#39); care-feedback/celebration (#41) + bottom-nav (#40) in flight. |
| **Quality (QA/Perf/Playtester)** | tests + CI | ✅ backend suite + coverage gate + memory/migration gates green; ⬜ Playwright e2e stub (RISK #8); ⬜ load/soak on `/state`. |
| **Product (Retention/Economy/Lore/Monetization)** | balance + retention | ✅ daily stipend + achievements + Cannabis Cup + University; 🔨 retention validation pending; fiat rail parked. |
| **Operations (Monitor/Security/Release/Reconciliation)** | gates + records | ✅ memory integrity enforced; this sweep is the Reconciliation function. ⬜ secrets hardening before real value. |

---

## 7) Carried risks (authoritative copy lives in `docs/HANDOFF.md`)

RISK #3 (general `Idempotency-Key` header) PARTIAL · RISK #4/7 (real chain settlement) OPEN ·
RISK #8 (web Playwright e2e stub) PARTIAL · RISK #9 (sim dormancy semantics) OPEN · RISK #11
(rate-limiter `memory://`, public `get_level`) PARTIAL. **Cleared:** RISK #10 (web 401/403 handler —
shipped in PR #29/#30). See the baton for full evidence; a risk clears only when **verified fixed,
test-backed**.
