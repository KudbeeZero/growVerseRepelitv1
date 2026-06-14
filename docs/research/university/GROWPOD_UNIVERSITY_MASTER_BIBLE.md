# 🌿🎓 GROWPOD UNIVERSITY — MASTER BIBLE

> **Single source of truth for GrowPod University.** This is the canonical front-door: the academic
> structure, governance, and the *what/why* of every system, with pointers to the deep per-stream
> research (Directive UNI-001, agents UNI-A01–A10). If this Bible and a worker deliverable disagree,
> **this Bible + the ADR win** — fix the deliverable. If this Bible and the *code* disagree, the code
> wins — fix the Bible.
>
> **Phase:** ✅ Research complete · 🧊 **Build FROZEN until post-MVP** (see §14). Honest tags
> throughout: ✅ built · 🔨 partial · ⬜ planned. Nothing here is shipped beyond what cites a real path.

| Field | Value |
|---|---|
| **Directive** | UNI-001 (research) · **UNI-ADR-001** (governance, ratified 2026-06-14) |
| **Lead** | UNI-A00 · **Records** | UNI-A10 |
| **Status** | Foundations LOCKED · build parked post-MVP |
| **Canon of record** | `docs/memory/DECISIONS.md` → "GrowPod University foundations (UNI-ADR-001)" |
| **Front-door** | this file → detail in `docs/research/university/UNI-A01..A10` |

---

## 1. Governance & canon — UNI-ADR-001 (the six locked decisions)
Ratified by the Owner 2026-06-14; recorded append-only in `docs/memory/DECISIONS.md`.

1. **Rewards stay NON-GROW, always.** Titles · badges · profile flair · lab decorations · cosmetic
   frames · genetics-lore unlocks · prestige points · achievements. **Prohibited:** GROW emissions,
   passive token farming, any "educational yield." (Preserves the net-deflationary invariant.)
2. **Doctorate is prestige, not participation.** **Master's** = complete curriculum + pass all exams
   + publish a **strain thesis**. **Doctorate** = Master's **AND one of**: Top-10 Cannabis Cup
   placement · breed a Legendary Cultivar · discover a new mutation · a recognized genetics
   contribution. *(The extra paths lean on `05-events-and-competition.md`, `02-genetics.md`,
   `knowledge/mutation-system.md`; those checks are ⬜/🔨 today — the requirement is canon, the checks
   ship with the build.)*
3. **Quizzes are REQUIRED progression gates.** Lesson → quiz → **≥70%** → next lesson unlocks.
   Grading is **deterministic / server-side** (DB authoritative, CI key-free; UNI-A09 §3).
4. **Structured-only social for V1.** Ship: study groups · mentor requests · professor boards ·
   research collaborations · thesis comments. Defer: global chat · DMs · voice · open forums.
5. **Monetization PARKED; V1 is free.** Collect completion / retention / popularity / time-spent /
   quiz-pass / engagement metrics first. Anti-moat NOT-TO-BUILD list (UNI-A06 §3) stands — no paid
   time-skips / practical-bypass / degree-or-perk purchase / loot boxes.
6. **Merit prestige ladder** (no pay-to-win; earned only) — see §2.

> The throughline binding all six: **earned mastery over real time** (`00-game-vision.md` §Moat #6).
> Money and shortcuts may never substitute for proven mastery.

---

## 2. The prestige ladder (8 tiers — canonical)
A player's University title, earned by demonstrated mastery, never bought:

```
Seedling → Grower → Cultivator → Breeder → Researcher → Professor → Master Grower → Doctorate
```
These are **profile titles** (cosmetic prestige), distinct from academic *degrees* (§3) though they
advance together. The ladder is new data-shaped requirement for the schema merge (§13).

---

## 3. Academic structure (faculties · degrees)
**Shipped today ✅** (`src/growpodempire/data/curriculum.yaml`, `services/university_service.py`):
**6 departments · 14 courses · 5 degree tiers** (Certificate → Associate → 2× Bachelor → Master),
each course carrying credits, `duration_hours`, `tuition` (a GROW **sink**), `prereqs`, `level_req`,
a `lecture`, a `practical`, and `perks`.

**Degree ladder (canonical):** Certificate → Associate → Bachelor → Master → **Doctorate** (capstone,
§1.2). A degree is a *horizontal slice* across departments at a tier; a department reads top-to-bottom
as a syllabus (UNI-A01 §1).

**Faculty expansion (⬜ planned, codex `06-university.md`):** the 6 shipped departments grow toward a
broader faculty set by adding **Lab Analytics & QA**, **Business / Law / Compliance**, and
**Pharmacology / Medical** — heading to ~8–9 faculties. *Reconciliation note:* the UNI-ADR-001
closeout referenced an "8-faculty structure" and "19 scientific domains"; on disk the **science
curriculum is 8 teachable modules** (§4) across the **6 shipped + planned faculties** — the larger
"19 domains" is an **expansion target**, not yet authored. Slot-in is non-breaking: add a
`departments.<key>`, then courses; degrees opt in via `required_courses` (UNI-A01 §3).

---

## 4. Science curriculum — 8 modules, mapped to the sim → `UNI-A02-cannabis-science.md`
The teachable knowledge base, each topic tied to an exact sim variable and tagged sim-accurate / partial / teach-ahead:
1. Cannabis Botany & the Plant · 2. Plant Physiology & the Grow Cycle · 3. Environmental Science
(Light/VPD/Temp/RH/CO₂) · 4. Nutrient & Soil Science · 5. Cannabinoid & Terpene Biosynthesis ·
6. Genetics & Inheritance · 7. Analytics (CoA, GC/LC, Lab Trust) · 8. Post-Harvest Science.
> **Fidelity flags:** Genetics (6) & curing (8) are the **most sim-accurate** — teach as live mechanics.
> Nutrients (4) & analytics/CoA (7) are the **deepest teach-ahead gaps** (engine models one nutrient
> scalar, no CoA artifact). The tutor must tag science-vs-sim honestly.

---

## 5. Master-grower methods (craft → practicals) → `UNI-A03-master-grower-methods.md`
Training (topping/LST/SCROG/mainlining/supercropping), defoliation, canopy/VPD dialing, feeding &
deficiency diagnosis, IPM, ripening, harvest timing, drying/curing/burping — each as a tiered,
practical-backed method. Two new practical checks proposed (`env_band`, `recovered`) reuse state the
engine already tracks; dry/cure practicals are already fully grounded.

## 6. Curriculum architecture & progression → `UNI-A01-curriculum-architecture.md`
The **5-gate** unlock model: `prereq · level · time · practical · quiz(≥70%)`. `modules[]` inside
courses; tier-scaled XP (no GROW, ever); streaks (cosmetic/XP only); the full first-grow→Doctorate graph.

## 7. AI tutor / "Professor" → `UNI-A09-ai-tutor-systems.md`
Extends the shipped one-shot lecturer into five capabilities — lecture · **quiz (gen + pure-Python
deterministic grading)** · adaptive/Socratic Q&A · real-grow-data feedback · named-faculty persona.
Every capability has a deterministic mock path; **CI never needs a live key**. Honesty guardrails:
KB-grounded, self-tagged confidence, admit-uncertainty.

## 8. Learning psychology → `UNI-A04-learning-psychology.md`
SDT spine (autonomy/competence/relatedness); the real-time gate is a *desirable difficulty* that turns
into a dark pattern the instant a time-skip is sold or hours are padded — the honesty boundary.

## 9. Gamification (faucet-free) → `UNI-A05-gamification-systems.md`
XP / Scholar Level · streaks (+ freeze tokens, non-punitive comeback) · cosmetic badges · prestige
titles · transcripts · seasonal knowledge leaderboard. Every reward is **non-GROW by construction**.

## 10. Community (structured-only V1) → `UNI-A07-community-research.md`
Study cohorts · mentorship · professor boards · research collaborations · thesis comments · peer
review. Structured-before-free-text (public reads make UGC the dominant new risk); rewards stay non-GROW.

## 11. Production pipeline → `UNI-A08-production-pipeline.md`
Research → `curriculum.yaml` → lectures/quizzes/practicals; additive schema (provenance, version,
status, quiz banks) + a proposed `curriculum-validator` CI lint. Data-driven; scales without code changes.

## 12. Monetization — 🧊 PARKED → `UNI-A06-monetization-backlog.md`
Five option families surveyed, **all deferred to the Owner**; explicit anti-moat NOT-TO-BUILD list.
V1 is free; revisit only after the §14 metrics exist. Diploma NFTs double-parked behind the mocked chain.

---

## 13. Build readiness — first artifact
**🟢 Shovel-ready, CI-safe (no sim dependency):** the **deterministic quiz engine** — merge the
A01/A08/A09 `curriculum.yaml` schema proposals into **one** schema (reconciliation **R1**, UNI-A10 §3),
then authored quiz banks + pure-Python grader. Closes the ⬜ quiz gap at `06-university.md:53`. The
prestige ladder (§2) + the 70% gate are data-shaped requirements for that schema. Full ranking:
UNI-A10 §5 (🟢 ready / 🟡 sim-gated / 🔵 owner-gated).

## 14. Priority stack & freeze order (canonical)
University build **SHALL NOT begin** until the MVP Launch Candidate milestone completes:
```
Feature Flags → BE-004 e2e Grow-Loop Validation → Playtesting → Retention Validation
→ MVP Launch Candidate → ⮕ GrowPod University Build Phase
```
Only owner-gated build item carried forward: **methods-track `curriculum.yaml` integration**, deferred
to the University Build Phase.

## 15. Canonical sources index
- **Governance:** `docs/memory/DECISIONS.md` (UNI-ADR-001) · `docs/OMNI_CHARTER.md` · `CLAUDE.md`
- **Design codex:** `docs/memory/design/06-university.md`
- **Research streams:** `UNI-A01..A10` in this folder (`README.md` = directive board / agent registry)
- **Prior grounding:** `docs/research/2026-06-08-cannabis-education-curriculum.md`
- **Live code:** `src/growpodempire/services/university_service.py` · `services/lecturer_service.py`
  · `data/curriculum.yaml` · `ai/` lecturer stack
