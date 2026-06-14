# UNI-A10 — GrowPod University: Records Consolidation

**Directive ID:** UNI-001 · **Lead Agent:** UNI-A00 · **Worker Agent:** UNI-A10 (Records)
**Asked:** Consolidate the 9 worker deliverables (UNI-A01–A09) into one synthesis — cross-link findings, reconcile conflicts, and produce the Owner decision docket.
**Done:** Campaign complete; all 9 streams landed. This doc is the single front-door: status board, unified picture, conflict/reconciliation register, the consolidated Owner decision docket, a build-readiness ranking against the *shipped* backend, and the BACKLOG hand-off.
**Risks:** This is research, not a build commitment — three streams independently propose `curriculum.yaml` extensions that **must be merged into one schema before any code** (see §3). Treating any ⬜ item as shipped would violate the codex honesty rule.
**Needs You:** ✅ Resolved — all six §4 decisions ratified as **UNI-ADR-001** (2026-06-14, `docs/memory/DECISIONS.md`). Nothing open.
**Next:** University build is **post-MVP** (Owner order: Feature Flags → e2e Grow Loop → Playtesting → Retention → MVP → **University Build Phase**). First build artifact: the R1 `curriculum.yaml` schema merge + deterministic quiz engine.

---

## 1. Campaign status board

| Agent | Stream | Deliverable | One-line finding |
|-------|--------|-------------|------------------|
| UNI-A01 | Curriculum Architecture | `UNI-A01-curriculum-architecture.md` | 5-gate progression (prereq·level·time·practical·**quiz**), `modules[]`, `-401` capstone layer, Doctorate tier — all backward-compatible with the live loader. |
| UNI-A02 | Cannabis Science | `UNI-A02-cannabis-science.md` | 8-module science KB mapped 1:1 to sim variables, tagged sim-accurate/partial/**teach-ahead**; nutrients (M4) & analytics/CoA (M7) are the deepest sim gaps. |
| UNI-A03 | Master Grower Methods | `UNI-A03-master-grower-methods.md` | Craft compendium → practicals; `env_band` + `recovered` are the two new checks reusing state the sim *already* tracks; dry/cure already fully grounded. |
| UNI-A04 | Learning Psychology | `UNI-A04-learning-psychology.md` | SDT spine; the real-time gate is a textbook *desirable difficulty* that becomes a dark pattern the instant a time-skip is sold or hours are padded. |
| UNI-A05 | Gamification Systems | `UNI-A05-gamification-systems.md` | Faucet-free engagement layer (XP, streaks+freeze, cosmetic badges, titles, seasonal leaderboard); deliberately does **not** copy the GROW-paying achievement path. |
| UNI-A06 | Monetization *(parked)* | `UNI-A06-monetization-backlog.md` | 5 option families, all deferred to Owner; explicit **anti-moat NOT-TO-BUILD** list (paid time-skips, practical bypass, degree purchase, perk boosts, loot boxes). |
| UNI-A07 | Community | `UNI-A07-community-research.md` | 9 social mechanics, **structured-before-free-text** (public reads make UGC the dominant new risk); social rewards stay non-GROW to block Sybil farming. |
| UNI-A08 | Production Pipeline | `UNI-A08-production-pipeline.md` | 5-stage research→ship flow; additive schema (provenance/version/status/quiz banks) + a proposed `curriculum-validator` CI lint with 17 rules. |
| UNI-A09 | AI Tutor Systems | `UNI-A09-ai-tutor-systems.md` | Extends the shipped one-shot lecturer into 5 capabilities; quiz **generation + pure-Python deterministic grading** keeps the DB authoritative and CI key-free. |
| **UNI-A10** | **Records** | **this file** | Synthesis + reconciliation + Owner docket. |

> Grounding for every stream: the **shipped** backend (`src/growpodempire/services/university_service.py`,
> `services/lecturer_service.py`, `data/curriculum.yaml`, the `ai/` lecturer stack) and the codex
> (`docs/memory/design/06-university.md`). Prior research: `docs/research/2026-06-08-cannabis-education-curriculum.md`.

---

## 2. The unified picture (how the streams compose)

The nine streams describe one coherent system, separable into four layers that map onto the
existing architecture:

```
   CONTENT          A02 science KB  ─┐
   (what's taught)  A03 craft       ─┼─►  A08 production pipeline  ──►  curriculum.yaml (data)
                    A01 structure   ─┘         (research → ship)              │
                                                                              ▼
   DELIVERY         A09 AI tutor (lecture · quiz · Socratic Q&A · grow feedback) ◄─ reads KB + data
   (how it's taught)                                                          │
                                                                              ▼
   MOTIVATION       A04 learning psychology  ──constrains──►  A05 gamification (XP/streak/badge/title)
   (why they stay)                                                           │
                                                                              ▼
   SOCIAL           A07 community (cohorts · mentorship · leaderboard · peer review)
   (who they stay with)
                                                                              │
   ECONOMICS        A06 monetization  ── PARKED, Owner-only, anti-moat list enforced
```

**The throughline all nine agreed on independently:** the moat is *earned mastery over real time*
(`00-game-vision.md` §Moat #6). Every reward stays **non-GROW** (XP / perk / title / cosmetic /
standing) so the university remains net-deflationary, and **nothing may let money or shortcuts
substitute for proven mastery** — A04 frames it as psychology, A05/A07 as faucet-free mechanics,
A06 as the anti-monetization line. That convergence is the strongest signal in the campaign.

---

## 3. Conflict & reconciliation register

The streams were independently scoped, so three areas need an explicit merge before code:

| # | Tension | Streams | Reconciliation (Lead/UNI-A00) |
|---|---------|---------|-------------------------------|
| R1 | **Three `curriculum.yaml` schema proposals.** A01 (`modules[]`, quiz block, capstone), A08 (provenance/`content_version`/`status`/quiz banks), A09 (`quiz:`/`faculty:`/`professor:`). | A01·A08·A09 | **Not a conflict — a union.** All three are additive & back-compatible with `load_curriculum`. Merge into ONE schema doc before implementation, with A08's pipeline as the authoring contract and A09's Pydantic shapes as the runtime contract. This is the first build artifact. |
| R2 | **Quiz grading authority.** | A01 (index-graded) · A08 (authored answer/explain = truth) · A09 (pure-Python grader, no model in loop) | **Already aligned.** Deterministic, server-side, replayable; AI generates/presents but never grades. Honors DB-authoritative + CI-safe-AI invariants. No decision needed — just build it once. |
| R3 | **Cohort / leaderboard data model.** | A05 (leaderboard + cohort mechanics) · A07 (cohort container + anti-Sybil) | Align on **one** cohort/leaderboard table/schema before either ships; A05 owns the mechanic, A07 owns the social container & abuse model. Flagged, not blocking research. |

**Quiz-as-gate** (A01 §4, A08 §6) is *not* a conflict — both propose a per-course `gate: advisory|required`
knob. It is an Owner *tuning* decision (§4.3), not a schema clash.

---

## 4. Owner decision docket — ✅ RESOLVED by UNI-ADR-001 (2026-06-14)

> **All six are now canon** — ratified by the Owner as **UNI-ADR-001** (`docs/memory/DECISIONS.md`,
> 2026-06-14). They no longer block anything; they govern the University build phase (sequenced
> *post-MVP*). Recorded outcomes below (the Owner expanded several beyond the campaign's recommendation).

| # | Decision | Raised by | ✅ Ratified outcome (UNI-ADR-001) |
|---|----------|-----------|-----------------------------------|
| 4.1 | May any university reward touch the GROW ledger? | A01, A05, A07 | **NO — all rewards NON-GROW, always.** Titles/badges/flair/lab-decor/frames/lore-unlocks/prestige-points/achievements only. No emissions, no passive farming, no educational yield. |
| 4.2 | Doctorate capstone requirement? | A01 | **Prestige, not participation.** Master's = curriculum + all exams + **strain thesis**. Doctorate = Master's **AND one of**: Top-10 Cup placement · breed a Legendary Cultivar · discover a new mutation · recognized genetics contribution. *(broader than the Cup-only rec.)* |
| 4.3 | Quizzes advisory or hard gate? | A01, A08 | **REQUIRED gate, ≥70%** (lesson→quiz→unlock). *(Owner chose required outright.)* Grading stays deterministic/server-side (A09 §3). |
| 4.4 | Free-text UGC or structured-only social? | A07 | **Structured-only for V1** (study groups, mentor requests, professor boards, research collabs, thesis comments). Global chat / DMs / voice / open forums deferred. |
| 4.5 | Monetization (5 families) | A06 | **PARKED — V1 is free.** Collect completion/retention/popularity/time/quiz-pass/engagement metrics first. Anti-moat NOT-TO-BUILD list stands. |
| 4.6 | *(Lead-scoped)* Teach-ahead curriculum before sim Phase B? | A02 | Lead call retained — fine **if** the tutor honestly tags science-vs-sim (A02 fidelity dashboard is the guardrail). |

**New canon added by the Owner — Merit Prestige Ladder (titles):**
`Seedling → Grower → Cultivator → Breeder → Researcher → Professor → Master Grower → Doctorate`.
No pay-to-win shortcuts; earned only. This is a new data-shaped requirement for the R1 schema merge.

---

## 5. Build-readiness ranking (against the shipped backend)

What this research says is *shovel-ready* vs *sim-gated*, honestly tagged:

**🟢 Shovel-ready now (no sim/engine dependency, CI-safe):**
1. **Deterministic quiz engine** (A09 §3 + A01 §4 + A08 schema) — authored banks, pure-Python grader, mock-safe. Closes the ⬜ at `06-university.md:53`. *Best first build.*
2. **`curriculum-validator` + CI lint** (A08 §4) — closes the `_practical_met()` silent-auto-pass footgun; pure tooling.
3. **Faucet-free gamification primitives** (A05) — XP/streak/title/transcript on existing service patterns.
4. **Two new practical checks** `env_band` + `recovered` (A03) — reuse state the engine already tracks.
5. **Named-faculty persona** (A09 §2) — data, not code; closes the ⬜ at `06-university.md:55`.

**🟡 Sim-gated (needs `01-simulation-horticulture.md` Phase B/C):**
- Per-ion feeding / nutrient-lockout practicals & lectures (A02 M4, A03) — engine models one nutrient scalar today.
- CoA / lab-trust mechanic (A02 M7) — *most shovel-ready new-feature idea*, but it's a new artifact, not a tutor change.
- Training/defoliation/harvest-window practicals (A03) — ride `harvest_quality` proxies until the sim deepens.

**🔵 Owner-gated (see §4):** Doctorate capstone, quiz-gate promotion, any GROW-touching reward, free-text social, all monetization.

---

## 6. Hand-off to BACKLOG / codex

- A single **BACKLOG entry** ("GrowPod University v2 — research foundation") points here; the first
  implementation directive is the **deterministic quiz engine** (R1 schema merge → A09 grader → A08 validator).
- `06-university.md §Where it's going` already lists quizzes, persona depth, diploma NFTs, reputation
  tie-in as ⬜ — this campaign supplies the *how* for each. A cross-link from the codex to this folder
  keeps the memory map honest (no tag flips — nothing shipped here).
- Schema merge (R1) is the prerequisite artifact for **any** university build PR.

---

## 7. Deliverable index
- `README.md` — Directive board & agent registry (UNI-A00)
- `UNI-A01-curriculum-architecture.md` · `UNI-A02-cannabis-science.md` · `UNI-A03-master-grower-methods.md`
- `UNI-A04-learning-psychology.md` · `UNI-A05-gamification-systems.md` · `UNI-A06-monetization-backlog.md`
- `UNI-A07-community-research.md` · `UNI-A08-production-pipeline.md` · `UNI-A09-ai-tutor-systems.md`
- `UNI-A10-records-consolidation.md` — this synthesis
