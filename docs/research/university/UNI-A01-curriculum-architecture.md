# UNI-A01 — GrowPod University: Curriculum Architecture
**Directive ID:** UNI-001 · **Lead Agent:** UNI-A00 · **Worker Agent:** UNI-A01
**Asked:** Design the educational structure of GrowPod University — progression, modules, prereq chains, XP, streaks, degrees, and a beginner→Doctorate pathway, mapped to `curriculum.yaml`.
**Done:** Audited the shipped backend and proposed a backward-compatible curriculum schema (modules, quizzes, streaks, departments, a Doctorate tier) plus a concrete first-grow→Doctorate progression graph and a scaling model for the time-gate + practical.
**Risks:** Schema additions must stay additive (no break to `university_service.py`); streaks/quizzes are new state (DB migration); XP curve can become an inflation faucet if degrees ever pay GROW; over-gating can wall casual players out of the moat.
**Needs You:** Two product calls — (1) whether streaks may grant *any* GROW (recommend no; cosmetic/XP only) and (2) whether a Doctorate should require a Cup placement (recommend yes, as the capstone proof). Else nothing.
**Next:** Hand to UNI-A00 for merge with UNI-A02 (economy/balance of tuition & XP) and UNI-A03 (Professor/lecture content); this blueprint is the data-shape contract those agents fill.

---

## 0. Grounding & scope

This blueprint **extends** — it does not restate — the three sources it sits on:
the design codex `docs/memory/design/06-university.md` (what's shipped vs planned),
the curriculum research `docs/research/2026-06-08-cannabis-education-curriculum.md`
(real institutions and course names), and the **live** data in
`src/growpodempire/data/curriculum.yaml` driven by
`src/growpodempire/services/university_service.py`.

**Status tags** (honest): ✅ built · 🔨 partial · ⬜ planned.

What is **✅ built today** (do not re-invent): 6 departments, 14 courses with
`prereqs`/`level_req`/`duration_hours`/`tuition`/`lecture`/`practical`/`perks`; 5
degree tiers (Certificate → Associate → 2×Bachelor → Master); enroll→study→complete
with a real **time gate** (`Clock`) and a **practical** checked against live game
state; idempotent `claim_degree`; degree perks aggregated over the *same* effect keys
as the research tree; tuition as a `LedgerEntryType.TUITION` **sink**; CI-safe AI
Professor. The economy is **net-deflationary** — degrees pay perks/XP/title, never GROW.

This document designs the **educational architecture on top of that spine**: how a
course is internally structured (modules), how knowledge is *tested* (quizzes), how
the long arc reads (first-grow → Doctorate), how engagement is rewarded without
inflation (XP + streaks), and how the schema grows as new departments slot in — all
**backward-compatible** with the shipped loader.

---

## 1. Educational progression model (the spine)

Real cannabis higher-ed sequences **intro → 200 → 300/400 → capstone** (NMU B.S.:
Gen Chem → Organic → Medicinal Plant Chem; City Colleges of Chicago: Basic Cert →
Advanced Cert → A.A.S. — see the research reference §4). GrowPod mirrors this with
three orthogonal gates already in the engine, plus two proposed:

| Gate | Mechanism | Status | What it teaches |
|------|-----------|--------|-----------------|
| **Prerequisite** | `prereqs[]` (course keys) | ✅ | Conceptual ordering — can't manage a canopy before you've grown |
| **Account level** | `level_req` | ✅ | Player has played enough to *use* the knowledge |
| **Time** | `duration_hours` + injected `Clock` | ✅ | "Growing doesn't happen overnight" — real study investment |
| **Practical** | `practical{type,threshold}` vs live state | ✅ | *Prove it in your grow* — earned mastery, not bought |
| **Knowledge quiz** | `quiz[]`, deterministically graded | ⬜ | Comprehension of the lecture, not just grind |

The **course numbering convention** (already implicit: `-101/-201/-301`) should be
formalized so new content self-documents its tier:

- **`-101` Intro** — no prereqs, `level_req` 1–3, ~48–72h, one foundational practical.
- **`-201` Intermediate** — one `-101` prereq, `level_req` 3–5, ~96–120h.
- **`-301` Advanced** — one `-201` prereq, `level_req` 6–8, ~168–192h.
- **`-401` Capstone/Lab** (⬜ new) — `level_req` 9+, ~240h, a *compound* practical
  (e.g. cure a 90-quality harvest), feeding the Doctorate tier.

This keys a clean **beginner→expert ladder**: a department reads top-to-bottom as a
syllabus, and a degree is a *horizontal slice* across departments at a tier.

---

## 2. Lesson / module structure (inside a course)

Today a course's `lecture` is a single `{topic, objectives[]}` block — the Professor
renders one lecture (`lecturer_service.teach(... level)`), and `level` already hints
at multi-part delivery. The research reference §2 shows real courses are **modular**
(Penn State PLANT 240: propagation → outdoor → indoor → irrigation/nutrients → IPM →
breeding → post-harvest). Proposed **backward-compatible** upgrade: keep the existing
single `lecture` working, but allow an optional `modules[]` list that the Professor
walks in order.

```yaml
cult-101:
  name: "Fundamentals of Cannabis Cultivation"
  # ... existing fields unchanged ...
  lecture:                      # ✅ still honored if `modules` absent
    topic: "..."
    objectives: ["...", "..."]
  modules:                      # ⬜ new, optional — ordered mini-lectures
    - id: cult-101-m1
      title: "The plant & the grow cycle"
      objectives: ["Name the growth stages", "Read an environmental dashboard"]
    - id: cult-101-m2
      title: "Abiotic & biotic drivers"
      objectives: ["Relate VPD/DLI to growth", "Distinguish stress signals"]
    - id: cult-101-m3
      title: "Yield forecasting from data"
      objectives: ["Estimate yield from canopy + light"]
```

Module semantics (loader rules — additive, no migration to *read* them):
- If `modules` is present, `lecture` becomes the **course abstract** and each module
  maps to a Professor lecture slot keyed by `?level=<module index>` (already the
  `teach(... level)` knob — no new API surface).
- `duration_hours` stays the **whole-course** gate (study time is course-level, not
  per-module, to keep the completion math identical to today's service).
- A module *may* carry an optional `quiz[]` (see §4); if any module quiz is unpassed,
  the course's quiz gate is unmet. No module-level practical — practicals are
  course-level so they map cleanly to live game state.

This gives the Professor real pedagogical pacing (a "session 2 of 3" feel) **without**
changing the enroll→study→complete contract or the DB.

---

## 3. Course progression & prerequisite chains (the graph)

The shipped graph is shallow (mostly single-prereq lines per department). The
**target graph** below keeps every shipped edge and adds the `-401` capstone layer
plus cross-department prereqs that mirror real interdisciplinary sequencing (NMU's
B.S. parallels Chemistry and Biology before the medicinal-plant capstone).

```
DEPARTMENT LADDERS (vertical) + DEGREE SLICES (horizontal)

Cultivation:   cult-101 ──► cult-201 ──► cult-301 ──► cult-401 (Commercial Grow Lab) ⬜
Genetics:      gen-101  ──► gen-201  ──► gen-301  ──► gen-401  (Cultivar Design Lab) ⬜
Nutrients:     nut-101  ──► nut-201  ─────────────►  nut-301  (Fertigation Eng.)     ⬜
IPM:           ipm-101  ──► ipm-201  ─────────────►  ipm-301  (Biocontrol Systems)    ⬜
Chemistry:     chem-101 ──► chem-201 ─────────────►  chem-301 (Extraction & CoA Lab)  ⬜
Post-harvest:  ph-101   ──► ph-201   ─────────────►  ph-301   (Cure Mastery)          ⬜

CROSS-DEPARTMENT EDGES (⬜ proposed, mirrors real interdisciplinary prereqs):
  chem-201  ──prereq──►  gen-401   (you can't design a cultivar's chemotype
                                    without analytics)
  cult-301  ──prereq──►  cult-401  (advanced canopy before a commercial grow lab)
  nut-201 + ipm-201 ──prereq──►  cult-401  (a grow lab integrates feed + pest)

NEW DEPARTMENTS (⬜ codex "where it's going") slot in as fresh ladders:
  Lab Analytics & QA:  lab-101 ──► lab-201 ──► lab-301   (Hocking GC/HPLC)
  Business/Law/Compliance:  biz-101 ──► biz-201           (Oaksterdam, compliance)
  Pharmacology/Medical:  pharm-101 ──► pharm-201          (Cornell, CU Pharmacy)
```

**Slot-in rule for a new department:** add a `departments.<key>` entry, then a
`-101` course with `prereqs: []` and a low `level_req`, and build upward. Because
degrees reference courses by key (not by department), a new department contributes to
degrees *only* when a degree's `required_courses` is extended — so new content is
**non-breaking and opt-in** to existing degree paths.

---

## 4. Knowledge quizzes (⬜ planned in codex, schema here)

The codex lists "knowledge quizzes (authored in curriculum data, deterministically
graded) on top of the practical." Schema (deterministic = CI-safe, no AI grading):

```yaml
chem-101:
  # ... existing fields ...
  quiz:                                   # ⬜ optional; absent ⇒ no quiz gate (today's behavior)
    pass_pct: 0.7                         # threshold to count as passed
    questions:
      - id: q1
        prompt: "Which terpene chemotype cluster is dominated by myrcene?"
        choices: ["Cluster 1", "Cluster 2", "Cluster 3"]
        answer: 0                         # index — graded by equality, fully deterministic
      - id: q2
        prompt: "A CoA reports total THC. What inflates label numbers most?"
        choices: ["Lab variance", "Decarb assumptions", "Both"]
        answer: 2
```

Completion gate becomes: **time elapsed AND practical met AND (quiz passed OR no
quiz)**. Quiz attempts are new state → one small table `QuizAttempt(player_id,
course_key, score, passed, attempted_at)` (mirrors `CourseEnrollment`); the loader
stays backward-compatible because `quiz` is optional and `complete_course` short-
circuits when it's absent. Authoring lives in YAML, grading is index-equality — **no
live key, no AI in the loop**, honoring the CI-safe invariant. (UNI-A03 owns question
*content*; this is the data shape.)

---

## 5. XP system & the progression curve

XP is **already wired** (`course_xp` default 50 per course via
`leveling_service.award_xp`; per-degree `xp_reward` 200→1500). This is the right
deflationary lever — XP drives `Player.level`, which gates *more* courses and game
content, but is **not** GROW. Refinements:

- **Tier-scaled course XP** (⬜): replace the flat `course_xp` with a per-course
  `xp_reward` so advanced courses pay more, encouraging the climb. Suggested curve
  (data-driven; final numbers are UNI-A02's call against `balance.yaml`):

  | Tier | Course XP | Degree XP (existing→proposed) |
  |------|-----------|-------------------------------|
  | 101 Intro | 50 | Certificate 200 |
  | 201 Intermediate | 100 | Associate 400 |
  | 301 Advanced | 175 | Bachelor 800 |
  | 401 Capstone/Lab | 300 | Master 1500 |
  | — | — | **Doctorate 3000** ⬜ |

- **First-attempt bonus** (⬜): a one-time XP bump for passing a quiz on the first try
  — rewards comprehension over grind, never repeatable (no faucet).
- **No GROW from XP, ever.** XP and degrees are *use-based* knowledge; the *spend*-based
  research tree (`03-grower-skills.md`) is the GROW sink companion. Keeping these
  separate is the moat's two-engine design — do not cross the streams.

---

## 6. Daily study streaks (⬜ new)

Streaks drive retention ("serious players, long-lived game") **without** touching the
economy. Proposed: a `study_day` event fires when a player makes meaningful university
progress in a UTC day (enrolls, completes a course/module, or passes a quiz). State:
`Player.study_streak_days` + `Player.last_study_day` (two columns; minimal migration).

Streak rewards must be **non-inflationary** — XP/cosmetic only, *never* GROW or perks
that compound the economy:

| Streak | Reward (recommended) |
|--------|----------------------|
| 3 days | small XP bump (e.g. +25) |
| 7 days | "Dedicated Scholar" cosmetic badge + XP |
| 30 days | "Honors Student" title flair (cosmetic; distinct from degree titles) |
| 100 days | "Tenured" prestige flair |

Streak break = reset to 0 (optionally a one-time "freeze" earned via a degree perk —
a *cosmetic-economy* reward, still no GROW). **Owner decision flagged:** confirm
streaks grant *no* GROW (recommended). This keeps the university net-deflationary even
with a daily hook.

---

## 7. Certifications & degrees (the credential ladder)

Shipped tiers map to the real credential structure (research reference §1:
Certificate → Associate → Bachelor → Master). Proposed addition completes the codex's
"Doctorate capstone tier":

| Tier | Real analog | Required courses (shape) | Perk weight | Title |
|------|-------------|--------------------------|-------------|-------|
| Certificate ✅ | Oaksterdam cert | 3 × `-101` across depts | small | "Certified Grower" |
| Associate ✅ | Hocking A.A.S. | ~4 mixed `-101/-201` | medium | "Associate Cannabis Scientist" |
| Bachelor ✅ | NMU / CSU-Pueblo B.S. | dept `-301`s | large | "Cannabis Horticulturist" / "Geneticist" |
| Master ✅ | CSU-Pueblo M.S. | all `-301`s | largest | "Master Grower" |
| **Doctorate ⬜** | CU Pharmacy doctoral | all `-401` capstones **+ a Cup placement** | prestige | "Doctor of Cannabis Science" |

**Doctorate proposal** (the endgame capstone — the literal top of the moat):

```yaml
phd-cannabis:                           # ⬜ proposed
  name: "Doctorate of Cannabis Science"
  tier: doctorate
  title: "Doctor of Cannabis Science"
  required_courses: [cult-401, gen-401, nut-301, ipm-301, chem-301, ph-301]
  required_degrees: [ms-master-grower]   # ⬜ new field: degree-prereq, mirrors real doctoral gating
  capstone:                              # ⬜ new: a degree-level practical beyond course practicals
    type: cup_entry
    threshold: 1                         # must have competed (or place — owner call)
  perks: {yield_pct: 0.12, quality_bonus: 4, terpene_pct: 0.08}
  xp_reward: 3000
```

Two **additive** schema fields make this work without breaking `claim_degree`:
`required_degrees[]` (claim-gate on prior degrees — natural extension of the existing
`required_courses` check) and a degree-level `capstone` practical (reuses the *exact*
`_practical_met` machinery already in the service, just invoked at claim time). The
`cup_entry` practical type already exists in the service but isn't used by any
shipped course — the Doctorate is its natural home. **Owner decision flagged:** entry
vs. *placement* for the capstone (recommend placement — a Doctorate should be rare).

Degree perks stay on the **research `_EFFECT_KEYS`** so `degree_effects()` keeps
aggregating with zero new apply-paths — the codex's core architectural win.

---

## 8. The full beginner→Doctorate pathway (worked example)

A single player's arc, showing how the three gates compound into a months-long,
genuinely-earned climb (illustrative hours/levels; UNI-A02 tunes against `balance.yaml`):

```
PHASE 1 — FRESHMAN (level 1–3, first grows)
  Grow your first plant (practical seed for cult-101).
  Enroll cult-101 (48h, $150) ─ practical: harvest 1 ─► complete ─► +XP
  Enroll nut-101, ipm-101, ph-101 (the cert spine; harvest a few, cure one)
  ✅ CLAIM  cert-cultivation  → "Certified Grower"  (+200 XP, +quality)

PHASE 2 — SOPHOMORE (level 3–5)
  gen-101 (breed 1) · cult-201 (quality 70) · chem-101 (harvest 3)
  ✅ CLAIM  assoc-science  → "Associate Cannabis Scientist"  (+400 XP)

PHASE 3 — JUNIOR/SENIOR (level 6–8, specialization)
  Horticulture track: cult-301, nut-201, ipm-201, ph-201 (quality 85, cure 3)
    ✅ CLAIM  bs-horticulture → "Cannabis Horticulturist"
  Science track:      gen-201→gen-301 (stabilize 1), chem-201 (quality 80)
    ✅ CLAIM  bs-genetics      → "Cannabis Geneticist"

PHASE 4 — GRADUATE (level 8+)
  All six -301s done ─►  ✅ CLAIM  ms-master-grower → "Master Grower" (+1500 XP)

PHASE 5 — DOCTORAL (level 9+, endgame) ⬜
  -401 capstones: cult-401 (commercial grow lab), gen-401 (cultivar design),
    + dept -301 labs (nut/ipm/chem/ph), all quizzes passed.
  Capstone: enter (place in) the Cannabis Cup.
  Requires ms-master-grower already earned.
  ✅ CLAIM  phd-cannabis → "Doctor of Cannabis Science" (+3000 XP, prestige perks)
```

The shape is deliberately a **tree, not a line**: Certificate→Associate is linear
(onboarding), then it *branches* into Horticulture vs Science Bachelors (player taste),
then *reconverges* at Master, then a *gated* Doctorate. This gives mid-game choice and
an endgame target — the retention arc a "long-lived live game" needs.

---

## 9. How the time-gate + practical scales (the durability argument)

The two earned-mastery gates scale **multiplicatively with content**, which is why
this model holds up as departments are added:

- **Time gate** is pure data (`duration_hours`) — adding a 240h `-401` course costs
  zero code; the injected `Clock` already makes it testable with `FrozenClock`.
- **Practical** scales by **threshold escalation on existing types** (harvest_count
  1→2→3, harvest_quality 70→85→90, breed 1→3, cure 1→3) — no new code per course.
  New *types* are rare and cheap: each is a single branch in `_practical_met`
  (e.g. a future `terpene_pct >= X` or `sale_revenue >= Y` reads one query). The 8
  shipped types already cover the whole core loop (grow→care→harvest→cure→breed→
  stabilize→cup→research→level), so most new courses need **zero engine change** —
  they recombine existing gates.
- **Degree-level capstone** (§7) reuses `_practical_met` verbatim at claim time —
  the same proven, deterministic, DB-authoritative check, no parallel path.

Net: a new department is ~1 `departments` entry + N course blocks in YAML, optionally
one new `_practical_met` branch. The architecture's load-bearing promise — *content
is data, gates are reused* — is what lets the curriculum grow from 14 to 40+ courses
without the service file growing at all.

---

## 10. Proposed `curriculum.yaml` schema (consolidated, backward-compatible)

Everything below is **additive**; the shipped loader (`load_curriculum`) reads it
unchanged, and `university_service.py` ignores fields it doesn't yet consume.

```yaml
departments:
  <dept_key>: {name: "<display>"}                 # ✅ unchanged

courses:
  <course_key>:                                   # e.g. cult-401
    name: "<display>"                             # ✅
    department: <dept_key>                         # ✅
    credits: <int>                                 # ✅
    level_req: <int>                               # ✅
    duration_hours: <int>                          # ✅ whole-course time gate
    tuition: <int>                                 # ✅ GROW sink
    prereqs: [<course_key>, ...]                   # ✅ may now cross departments
    lecture: {topic, objectives[]}                 # ✅ course abstract if modules present
    modules:                                        # ⬜ optional ordered mini-lectures
      - {id, title, objectives[], quiz?}
    practical: {type, threshold}                   # ✅ course-level, vs live game state
    quiz: {pass_pct, questions[{id,prompt,choices[],answer}]}   # ⬜ optional, deterministic
    xp_reward: <int>                               # ⬜ optional; falls back to univ.course_xp
    perks: {<effect_key>: <num>, ...}              # ✅ research _EFFECT_KEYS

degrees:
  <degree_key>:
    name, tier, title                              # ✅
    required_courses: [<course_key>, ...]          # ✅
    required_degrees: [<degree_key>, ...]          # ⬜ optional degree-prereq
    capstone: {type, threshold}                    # ⬜ optional claim-time practical
    perks: {<effect_key>: <num>}                   # ✅
    xp_reward: <int>                               # ✅
```

**Tiers (formalized):** `certificate < associate < bachelor < master < doctorate`.
**Course numbering:** `-101 < -201 < -301 < -401` = intro/intermediate/advanced/capstone.

---

## 11. Cross-agent dependencies & hand-off

- **UNI-A02 (economy/balance):** owns the *numbers* in §5/§7 — tuition per tier, the
  XP curve, and confirming the new Doctorate XP doesn't dent the deflation math. The
  tier tables here are slots, not final values; they belong in `balance.yaml`.
- **UNI-A03 (Professor/lecture content):** owns module *content* and *quiz questions*
  (§2/§4). This doc only fixes the data shape so authored content drops in.
- **Backend (future implementer):** the only code touched by this blueprint is
  additive — `complete_course` gains a quiz check, `claim_degree` gains
  `required_degrees`/`capstone` checks (both reuse existing helpers), and two small
  tables/columns (`QuizAttempt`, streak fields). No change to the pure simulation
  engine, no change to the ledger, no new GROW faucet.
- **Codex sync:** when any of this ships, `06-university.md` "Where it's going"
  bullets (more departments, Doctorate, quizzes) move from ⬜ to 🔨/✅ — keep
  `make check-memory` honest.

---

*Generated by Worker Agent UNI-A01 (research only — no code/git/build). Grounds and
extends `docs/memory/design/06-university.md`,
`docs/research/2026-06-08-cannabis-education-curriculum.md`, and the live
`src/growpodempire/data/curriculum.yaml` + `services/university_service.py`.*
