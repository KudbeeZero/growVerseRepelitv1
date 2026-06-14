# UNI-A10 — GrowPod University: Records Consolidation

**Directive ID:** UNI-001 · **Lead Agent:** UNI-A00 · **Worker Agent:** UNI-A10 (Records)
**Asked:** Consolidate the 9 worker deliverables (UNI-A01–A09) into one synthesis — cross-link findings, reconcile conflicts, and produce the Owner decision docket.
**Done:** Campaign complete; all 9 streams landed. This doc is the single front-door: status board, unified picture, conflict/reconciliation register, the consolidated Owner decision docket, a build-readiness ranking against the *shipped* backend, and the BACKLOG hand-off.
**Risks:** This is research, not a build commitment — three streams independently propose `curriculum.yaml` extensions that **must be merged into one schema before any code** (see §3). Treating any ⬜ item as shipped would violate the codex honesty rule.
**Needs You:** Six decisions in §4 — five are Owner-only (economy / player-facing); recommendations attached.
**Next:** Owner rules on §4 → Lead opens a single implementation directive (likely starting with the deterministic quiz engine, the one fully shovel-ready, CI-safe item).

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

## 4. Owner decision docket (the "Needs You")

Per `CLAUDE.md`, player-facing economy and difficulty calls are Owner-only. Five of these six are
that. Recommendations are the campaign's, not commitments.

| # | Decision | Raised by | Campaign recommendation |
|---|----------|-----------|-------------------------|
| 4.1 | **May any university reward touch the GROW ledger?** (streaks, social rewards, Knowledge Score → tradeable reputation) | A01, A05, A07 | **No.** Keep it XP/perk/title/cosmetic/standing only — preserves the net-deflationary invariant and the no-faucet rule. Wiring Knowledge Score into a *tradeable* economy is a separate, later economy change. |
| 4.2 | **Doctorate capstone: Cup *entry* or Cup *placement*?** | A01 | **Placement.** The capstone should prove mastery, not participation — and it gives the unused `cup_entry` practical type a real endgame home. |
| 4.3 | **Quizzes: advisory or a hard completion gate?** | A01, A08 | **Ship advisory, promote to required per-course** once quiz banks are proven. `gate: advisory\|required` supports both; it's a faucet/sink-adjacent difficulty knob. |
| 4.4 | **Community: free-text UGC, or structured-only social?** | A07 | **Structured-only first** (endorsements, templated peer review). Free-text is the dominant moderation-cost/safety risk in a public-read, cannabis-context system. |
| 4.5 | **Monetization** (all 5 families) | A06 | **Stay parked.** Build none yet. Enforce the anti-moat NOT-TO-BUILD list (no paid time-skips / practical bypass / degree or perk purchase / loot boxes). Diploma NFTs double-parked behind the mocked chain layer. |
| 4.6 | *(Optional, Lead-scoped)* Ship **teach-ahead** curriculum (A02 Modules 4 & 7) before sim Phase B deepens the model? | A02 | Lead call: teach-ahead is fine *if* the tutor honestly tags "the science vs. what the sim models." A02's fidelity dashboard is the guardrail. |

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
