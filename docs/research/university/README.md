# 🌿 GROWPOD EMPIRE — Research Department · Directive UNI-001

> **GrowPod University — Complete Research Foundation.** This folder is the consolidated output of
> a 10-agent Think-Tank campaign (research only, no code — per the OMNI Charter, Core Rule #2). Each
> worker agent owns one directive and one deliverable file. The Records agent (UNI-A10) synthesizes
> them into `UNI-A10-records-consolidation.md`.
>
> **This is research, not shipped product.** It *extends* the already-shipped university backend
> (`src/growpodempire/services/university_service.py`, `data/curriculum.yaml`, the AI lecturer stack)
> and its design codex (`docs/memory/design/06-university.md`). Honest tags throughout:
> ✅ built · 🔨 partial · ⬜ planned. Nothing here is an implementation commitment — build work still
> flows through `docs/memory/BACKLOG.md` with Owner approval (economy/monetization decisions are
> Owner-only).

| Field | Value |
|---|---|
| **Department** | Research (Think Tank) |
| **Directive ID** | UNI-001 |
| **Title** | GrowPod University — Complete Research Foundation |
| **Lead Agent** | UNI-A00 |
| **Status** | APPROVED · executing |
| **Executive Summary** | Build the complete research foundation for GrowPod University across 10 specialized streams. |
| **Director Decision** | ✅ Launch 10 University Research Agents (A01–A09 workers, A10 Records). |
| **Scope guardrails** | Research only — no code mutations. Off-chain MVP first. No faucet-without-sink. Monetization = backlog/Owner-only. CI-safe AI. |

---

## Agent Registry

| Agent ID | Assignment | Deliverable file | Notes |
|----------|-----------|------------------|-------|
| **UNI-A00** | Lead / Directive owner | this `README.md` | Issues directives, owns the board |
| **UNI-A01** | Curriculum Architecture | `UNI-A01-curriculum-architecture.md` | Progression, courses, XP, streaks, degrees |
| **UNI-A02** | Cannabis Science | `UNI-A02-cannabis-science.md` | Teachable science KB, mapped to the sim |
| **UNI-A03** | Master Grower Methods | `UNI-A03-master-grower-methods.md` | Expert craft → course practicals |
| **UNI-A04** | Learning Psychology | `UNI-A04-learning-psychology.md` | Learning science for the time-gate model |
| **UNI-A05** | Gamification Systems | `UNI-A05-gamification-systems.md` | XP, streaks, badges, leaderboards |
| **UNI-A06** | Monetization (Backlog Only) | `UNI-A06-monetization-backlog.md` | **PARKED** — Owner decision required |
| **UNI-A07** | Community Research | `UNI-A07-community-research.md` | Cohorts, mentorship, peer learning |
| **UNI-A08** | Production Pipeline | `UNI-A08-production-pipeline.md` | Research → curriculum.yaml → lectures/quizzes |
| **UNI-A09** | AI Tutor Systems | `UNI-A09-ai-tutor-systems.md` | The AI Professor, quizzes, adaptive tutoring |
| **UNI-A10** | Records Consolidation | `UNI-A10-records-consolidation.md` | Synthesis, conflicts, cross-links, Owner asks |

> The agent IDs are the point: Records can later cite *"UNI-A04 found…, UNI-A07 recommended…"* and
> you instantly know who did what across many parallel work streams.

---

## Report format (every deliverable opens with this)

```
**Directive ID:** UNI-001 · **Lead Agent:** UNI-A00 · **Worker Agent:** UNI-A0X
**Asked:**     one line — what the directive requested
**Done:**      1–2 lines — what the deliverable contains
**Risks:**     what could go wrong / what's uncertain
**Needs You:** Owner decisions only (else "nothing")
**Next:**      the hand-off
```
Optional: **Blocked · Observations · Recommendation.**

---

## How this connects to the rest of the repo
- **Design codex:** `docs/memory/design/06-university.md` (what's shipped vs planned).
- **Prior research grounding:** `docs/research/2026-06-08-cannabis-education-curriculum.md`,
  `docs/research/2026-06-08-cannabis-strain-genetics-and-cultivation.md`.
- **Live code:** `src/growpodempire/services/university_service.py`,
  `src/growpodempire/services/lecturer_service.py`, `src/growpodempire/data/curriculum.yaml`.
- **Governance:** `docs/OMNI_CHARTER.md` (Think Tank = research only) · `CLAUDE.md` (invariants).
- **Start here:** read `UNI-A10-records-consolidation.md` for the synthesis, then dive into any stream.
