# GrowPod Empire — Studio Agent Registry (REC-003)

> **Air-traffic control for the studio.** The [OMNI Charter](OMNI_CHARTER.md) defines *who may
> build what*; this registry tracks *who is building what right now* — live branch/PR ownership,
> the file surfaces each directive touches, and the rules that stop two agents from colliding on
> the same surface. It governs **coordination**; `CLAUDE.md` + `docs/memory/` govern the **code**.
>
> **Maintainer:** Records Department · **Authority:** Studio Director (Mission Control)
> **Last updated:** 2026-06-14 (REC-003 activation, post-DIR-004 deconfliction)

---

## Why this exists

On 2026-06-14 three parallel directives shipped overlapping work onto the same file surfaces
(navigation, FTUE, app shell) without knowing the others existed — producing duplicate
implementations and stale PRs (see **Collision Log** below). The fix is not "fewer agents"; it is
**a shared roster every agent checks before building.** Parallel work is safe when ownership of a
surface is explicit.

---

## Pre-work checklist (every agent, before writing code)

1. **Check this registry** — is any active directive already touching your file surfaces?
2. **Claim your surfaces** — add a row to the Live Assignment Ledger (Directive, branch, surfaces).
3. **Rebase onto `main`** — never build on a stale base; `main` moves under you.
4. **Verify no active directive owns the same files** — if one does, STOP and escalate to the
   Director. Do not build on a [Protected Surface](#protected-surfaces) without Director approval.

> **No autonomous merges. No autonomous rebases of someone else's branch. No mutations without
> approval.** (OMNI Charter, Core Rules.)

---

## Protected surfaces

These are high-traffic, shared surfaces where collisions are most damaging. **No two agents may
build on the same protected surface concurrently without explicit Director approval.** Serialize.

| Surface | Representative paths |
|---|---|
| Navigation | `web/src/components/layout/NavBar.tsx`, `MobileTabBar.tsx`, `navLinks.ts` |
| FTUE / Onboarding | `web/src/app/ftue/**`, `web/src/components/onboarding/**`, FTUE libs |
| App Shell | `web/src/components/layout/AppShell.tsx` |
| Root Layout | `web/src/app/layout.tsx` (metadata/viewport), `globals.css` |
| Global State | session/store providers (`web/src/lib/session.tsx`, `lib/localStore.ts`, providers) |
| Simulation engine | `simulation/**` (server-authoritative; backend WO required) |
| Ledger / economy | `services/**`, `db/models.py` (backend WO required) |

---

## Live Assignment Ledger

Open / in-flight directives. One row per directive; update **Status** as it moves.

| Directive | Dept | Lead | Workers | Branch | PR | Owned file surfaces | Deps | Status |
|---|---|---|---|---|---|---|---|---|
| DX-006 (P4 Sticky One-Handed CTAs) | Design & Experience | DX-A00 | DX-A01–A10 | `claude/dx-sticky-one-handed-ctas` | (this PR) | Plant-care placement: `components/ui/StickyActionBar.tsx` (new), `app/dashboard/plants/[plantId]/page.tsx` | Reuses merged FP-3 `lib/plantAction.ts` + `PlantActionCTA` **read-only** (no logic change) | 🟢 Open |

### Recently merged to `main` (for collision awareness)

| PR | Title | Surfaces touched |
|---|---|---|
| #46 | REC-003 Studio Agent Registry activation | docs (governance) |
| #45 | DIR-004 / FP-3 Primary Plant CTA (next-action resolver + `PlantActionCTA`) | Plant-care (`plantAction.ts`, `PlantActionCTA.tsx`, plant detail, `PlantCard`, `PodCard`) |
| #41 | DX-001 Care Feedback & Celebration | Plant-care (care bursts), `globals.css`, chamber end-state |
| #39 | `/ftue` guided tutorial route | FTUE |
| #38 | OMNI Charter v1.0 | docs (governance) |
| #36 | DXD Mobile-first — responsive nav + chamber | **Navigation**, App Shell, Layout, chamber |
| #35 | Deterministic guided tutorial + AI Master Grower | **FTUE** |
| #34 | FTUE starter-grant rail (pod + seed on signup) | backend grant + onboarding |

### Parked (open, green — do NOT modify)

| PR | Title | Owner |
|---|---|---|
| #27 | Phenotype Generator Foundation | Graphics (parallel session) |
| #28 | Circadian Leaf Motion | Graphics (parallel session) |

### Retired (closed without merge)

| PR | Title | Reason |
|---|---|---|
| #40 | Mobile bottom nav (FP-1) + FP-3 | FP-1 superseded by #36; FP-3 re-cut as #45 |
| #37 | Grow Guide FTUE coach | Superseded by canonical FTUE (#35 + #39) |

---

## Collision Log

| Date | Collision | Resolution |
|---|---|---|
| 2026-06-14 | Two mobile bottom-nav implementations (PR #40 `BottomNav` vs merged #36 `MobileTabBar`) on the **Navigation** surface | DIR-004: retire #40's FP-1; keep #36. |
| 2026-06-14 | Two FTUE systems (PR #37 `GrowGuide` vs merged #35/#39 guided tutorial) on the **FTUE** surface | DIR-004: close #37; salvage ideas to backlog (below). |

**Salvaged from #37 (archived to `docs/memory/BACKLOG.md`):** persistent per-player tutorial state,
non-nagging dismissal, and game-state-driven (auto-advancing) progression.

---

## Agent slot index

Slots are **reusable work-lanes / roles**, not always-on processes. A slot is "staffed" only while
a directive assigns it. Format mirrors the OMNI Charter department map.

| Dept | Slots | Notes |
|---|---|---|
| Records (REC) | REC-A01 … A10 | Maintains this registry. |
| Design & Experience (DX) | DX-A01 … A10 | UX/Mobile/Art/Tutorial/Accessibility. |
| Plant Engine (PE) | PE-A01 … A10 | Sim/renderer (server-authoritative; WO for logic). |
| Backend (BE) | BE-A01 … A10 | API/economy/ledger (WO-gated). |
| QA | QA-A01 … A10 | Tests, playtests, performance. |
| Monitoring (MON) | MON-A01 … A10 | Read-only observe → report. |
| Security (SEC) | SEC-A01 … A10 | Defensive only. |
| DevOps (DEVOPS) | DEVOPS-A01 … A10 | CI/release/infra. |
| Research (RES) | RES-A01 … A10 | Think-tank; no mutations. |
| Documentation/Ops (DOC) | DOC-A01 … A10 | Docs, memory, operations. |

### Agent record format (copy when staffing a slot)

```
Agent ID:
Department:
Role:
Status:            ACTIVE | IDLE | BLOCKED
Current Assignment:
Branch:
PR:
Owned File Surfaces:
Dependencies:
Last Update:
```

---

## Rules adopted with REC-003

- **Rebase requirement:** every implementation branch rebases onto `main` before work and before
  push. `main` is shared and moves.
- **Serialization:** the [Protected Surfaces](#protected-surfaces) are single-writer. Claim them in
  the ledger; if already owned, escalate rather than fork.
- **Registry-first:** no implementation directive begins until its surfaces are claimed here.
- **Closeout:** when a PR merges or closes, move its row to Merged/Retired and clear its surface
  claim so the next agent can take it.

> See also: [OMNI Charter](OMNI_CHARTER.md) (org constitution) and `docs/memory/MAP.md` (code↔doc map).
