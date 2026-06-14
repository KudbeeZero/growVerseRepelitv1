# 🎓 GROWPOD UNIVERSITY — MASTER BIBLE

> **The canonical, indexed blueprint for GrowPod University.** Consolidated by the Research
> Department (Directive **UNI-010**) from nine worker-agent research reports (**UNI-A01 → UNI-A09**).
> This is the single source of institutional knowledge for the University: what already ships, what
> we build next, what is parked, and what is research-only. When this document and the code disagree,
> **the code wins** — fix this file.
>
> **Scope note:** This is a *research-consolidation* artifact, not a status report. The live design
> doc is [`docs/memory/design/06-university.md`](memory/design/06-university.md); the ADR log is
> [`docs/memory/DECISIONS.md`](memory/DECISIONS.md); prioritized work lives in
> [`docs/memory/BACKLOG.md`](memory/BACKLOG.md). This Bible *feeds* those layers — it does not
> replace them.
>
> Capability tags throughout: ✅ **built** (a real path is cited) · 🔨 **partial** · ⬜ **planned**.
> Classification tags: **[P1]** Phase 1 · **[FUT]** Future Feature · **[BL]** Backlog ·
> **[RO]** Research Only · **[NEEDS-OWNER]** crosses a stop-and-ask gate (economy / chain / legal).

---

## 📑 INDEX

| ID | Section | Deliverables covered |
|----|---------|----------------------|
| **UNI-001** | [Executive Summary](#uni-001--executive-summary) | #1 Executive Summary |
| **UNI-002** | [Vision Statement](#uni-002--vision-statement) | #2 Vision Statement |
| **UNI-003** | [Course Hierarchy & Curriculum Architecture](#uni-003--course-hierarchy--curriculum-architecture) | #3 Course Hierarchy |
| **UNI-004** | [Curriculum Roadmap (Science + Master Methods)](#uni-004--curriculum-roadmap-science--master-methods) | #4 Curriculum Roadmap |
| **UNI-005** | [Learning Psychology Systems](#uni-005--learning-psychology-systems) | #5 Learning Psychology Systems |
| **UNI-006** | [Gamification Systems](#uni-006--gamification-systems) | #6 Gamification Systems |
| **UNI-007** | [Production Requirements](#uni-007--production-requirements) | #7 Production Requirements |
| **UNI-008** | [AI Tutor Roadmap](#uni-008--ai-tutor-roadmap) | #8 AI Tutor Roadmap |
| **UNI-009** | [Community Recommendations](#uni-009--community-recommendations) | #9 Community Recommendations |
| **UNI-010** | [Backlog · Risks · Priorities · Canonical Recommendations + Consolidation Report](#uni-010--backlog--risks--priorities--canonical-recommendations) | #10 Backlog · #11 Risks · #12 Implementation Priorities · #13 Canonical Recommendations |

**Reports consolidated:** UNI-A01 Curriculum Architecture · UNI-A02 Cannabis Science Curriculum ·
UNI-A03 Master Grower Methods · UNI-A04 Learning Psychology · UNI-A05 Gamification Systems ·
UNI-A06 Monetization (Backlog Only) · UNI-A07 Community · UNI-A08 Production Pipeline ·
UNI-A09 AI Tutor Systems.

---

## UNI-001 · Executive Summary

GrowPod University is **already shipped and working** — it is one of the two earned-mastery axes of
the game's moat (the time-and-practice companion to the GROW-spend research tree). The system that
exists today (✅):

- **Data-driven curriculum** — 6 departments, 14 courses, 5 degree tiers in `data/curriculum.yaml`;
  the service layer (`services/university_service.py`) contains *zero* hardcoded course/degree logic.
  New catalog content is a YAML edit.
- **The core loop** — enroll (pay **tuition**, a GROW *sink*) → study over **real time**
  (`duration_hours`, injected `Clock`) → meet a **practical tied to live gameplay** → claim a
  **degree** that grants permanent perks (reusing the research tree's effect keys) + a permanent
  `Player.university_title` + XP. Idempotent via the `degree_progress` unique constraint.
- **The AI Professor** — a `LecturerProvider` ABC mirroring the advisor stack: deterministic
  `MockLecturerProvider` for CI (no key), real `ClaudeLecturerProvider` in prod (structured outputs,
  a professor system prompt grounded in real horticultural science).
- **Economy-honest** — tuition is the only money flow; degrees pay perks/XP, not GROW →
  net-deflationary, honoring the faucet/sink invariant.

**The unanimous finding across all nine reports:** the *skeleton is excellent and must not be
rebuilt* — but it is **broad and shallow**, and three things hold it back from being a real
university rather than a degree-vending machine:

1. **There is no real assessment of knowledge.** The "quiz" (`LectureReport.quiz_question`) is a
   single ungraded free-text string rendered as decoration. Deterministically-graded quizzes are the
   single most-requested Phase-1 item — named by UNI-A02, A03, A04, A08, **and** A09 independently.
2. **The curriculum is unguarded.** No schema validation, no integrity test: a dangling prereq, a
   bad department reference, or a typo'd perk key ships silently (unknown perk keys are *dropped*, not
   errored). This is the top scaling risk as departments multiply.
3. **Methods are taught but verified only by outcome-proxy.** A "VPD & DLI" course passes on
   `harvest_quality ≥ 70` — the student never has to *steer VPD*. The sim already exposes the
   telemetry (VPD/DLI/PPFD, a committed cure window) to verify the actual technique.

The good news: **most high-value Phase-1 work is cheap, data-driven, and reuses shipped patterns**
(quizzes = YAML + a pure grader; transcript/GPA/leaderboards = read-only aggregation; new practicals
= one branch in `_practical_met`). The expensive, owner-gated work (monetization, new economy perk
keys, on-chain diplomas, UGC) is correctly deferred. See **UNI-010** for the prioritized plan.

---

## UNI-002 · Vision Statement

> **GrowPod University makes you *earn knowledge over time* — and then makes you *prove it in your
> grow*.** A degree is a genuine investment of real study hours and demonstrated technique, not a
> purchase. It is the anti-whale, earned-mastery heart of the game: *you cannot credit-card your way
> to a Master Grower title.*

The University exists to turn the game's scientist-grade strain knowledge and agronomy into
**teachable, testable, and provable** mastery. Its north star, consolidated from the reports:

- **Teach real science, grounded in real programs** (NMU, CSU-Pueblo, Cornell, Penn State PLANT 240,
  Oaksterdam) — rigorous, evidence-based, practice-oriented, never recreational-enthusiast.
- **Verify the technique, not just the outcome.** The long-term vision is that a course in VPD
  steering is *passed by steering VPD*, a cure course by *hitting the cure window* — the practical
  is the method, made measurable.
- **Make learning stick.** Lean on evidence-based pedagogy (retrieval practice, spaced repetition,
  scaffolding, transfer) so a degree represents durable mastery in a *long-lived* game, not a
  one-time unlock that decays into inert lore.
- **Earned mastery is power-neutral-to-buy.** Perks are earned; prestige is earned. Monetization, if
  it ever happens, must be **provably power-neutral** (cosmetic / credential / flair / pure sink) —
  pay-to-win is an *existential* threat to the moat, not merely a balance risk.
- **Stay honest and CI-safe.** DB authoritative; deterministic practical checks; the AI Professor is
  mock-in-CI and never requires a live key; the engine stays pure (player-scoped logic lives in
  services, never the sim).

The endgame: a credential ladder from Certificate → Associate → Bachelor → Master → **Doctorate**,
across cultivation, genetics, chemistry, post-harvest, and (later) lab analytics, business, and
medical departments — taught by **named faculty**, examined by **graded quizzes + technique
practicals**, celebrated in **graduation events and an alumni knowledge economy**, and tutored by an
AI Professor that has evolved from a lecture-reader into a genuine Socratic, fact-grounded tutor.

---

## UNI-003 · Course Hierarchy & Curriculum Architecture
*Source: UNI-A01. Cross-refs: UNI-A02 (content depth), UNI-A05 (tier prestige).*

### The shipped skeleton (✅)
- **6 departments:** Cultivation & Horticulture · Plant Genetics & Breeding · Soil & Nutrient
  Science · Integrated Pest Management · Cannabis Chemistry · Post-Harvest & Processing.
- **14 courses**, two-deep prereq chains per department (`101 → 201 → 301`); each course carries
  `credits`, `level_req`, `duration_hours`, `tuition`, `prereqs`, a `lecture`, a `practical`, `perks`.
- **5 degrees:** Certificate → Associate → 2× Bachelor → Master, each composed from
  `required_courses` and granting perks + a title + XP.
- The catalog is **extensible by YAML alone** — this is the right architecture; preserve it.

### Architectural gaps (consensus)
1. **`tier` is free-text, unordered, unenforced.** Nothing prevents claiming a Master before a
   Bachelor; tiers are cosmetic today.
2. **Degrees cannot depend on degrees.** `claim_degree` checks `required_courses` only — there is no
   `requires_degree`. This is the **single biggest blocker to a real Doctorate capstone**.
3. **The perk vocabulary is the binding constraint on new departments.** Course/degree perks must use
   the 10 shared `_EFFECT_KEYS` (`research_service.py`). Lab Analytics & QA, Business/Law/Compliance,
   and Pharmacology/Medical have **no natural effect key** — adding keys is a code + economy change
   touching every apply-site. **[NEEDS-OWNER]** — crosses the player-facing-economy line.
4. **Coverage is uneven & the graph is a forest, not a DAG.** Cultivation/genetics are 3 deep;
   the rest are 2 deep. No cross-department prerequisites exist, though real programs chain chemistry
   through biology.
5. **Decorative fields.** `credits` is stored/displayed but never summed or gated; `course_xp` is a
   flat 50 regardless of depth (a 168h capstone pays the same XP as a 48h intro);
   `seed_discount_pct` and `pod_capacity_bonus` effect keys are defined but unused.

### Recommendations
- **[P1]** Make `tier` an ordered enum and add an optional `requires_degree: [...]` to degrees,
  checked at claim time. Small additive service change; unblocks every future tier.
- **[P1]** Fill the 200-only departments to 300-level parity (`nut-301`, `ipm-301`, `ph-301`) — pure
  YAML; gives Bachelor/Master a real 300-level spine.
- **[P1]** Scale `course_xp` by depth (per-course `xp_reward`, or `course_xp_per_credit` in
  `balance.yaml`) so capstones out-reward intros.
- **[P1]** Add a **curriculum-integrity check** (see UNI-007) — the hand-edited graph needs a guard.
- **[FUT]** **Doctorate capstone tier** (`phd-*`) requiring the Master + a capstone practical
  (e.g. `cup_win`, or a composite "dial-in a room" practical from UNI-A03). The earned-mastery apex.
- **[FUT][NEEDS-OWNER]** New departments (Lab/QA, Business/Compliance, Medical) — blocked on the
  perk-vocabulary gap; each needs new effect keys + apply-sites (owner sign-off on the economy).
- **[FUT]** Cross-department prerequisites (turn 6 linear chains into a real DAG) and credit-total
  degree gating (`min_credits`, activating the dormant `credits` field, mirroring real 120-credit B.S.).
- **[BL]** Electives / "N-of-M" course tracks (`required_any`), minors/concentrations, and
  wiring-up or retiring the unused effect keys.
- **[RO]** A shared "core curriculum" (general-ed 101s required across all degrees), mirroring real
  chemistry-spine-first B.S. sequencing — a larger redesign.

---

## UNI-004 · Curriculum Roadmap (Science + Master Methods)
*Sources: UNI-A02 (science content), UNI-A03 (master-grower methods). Cross-ref: UNI-A01 (structure).*

### A. Scientific content (UNI-A02)
The 14 courses **name the right real topics** but each carries only 2–3 objective bullets and one
paragraph of lecture, with **no per-tier depth gradient in the *content*** (cult-101 and cult-301
differ in perks/practicals, not rigor).

**The dominant accuracy risk: teaching-ahead-of-sim.** Several courses teach levers the engine does
not yet model — a diligent player will discover the taught technique does nothing in-game, which
*undermines the moat*:
- `nut-201` teaches EC/per-ion N-P-K and pH-as-uptake-gate; the sim has a **single nutrient scalar**,
  no EC, no per-ion model, pH only saps health.
- `cult-201` teaches DLI-driven yield; **DLI is derived/exposed but not yet a yield input** (PPFD
  affects health only).
- `chem-101/201` teach cannabinoid/terpene **biosynthesis over flowering**; the sim expresses
  terpenes at harvest from the genome, with **no accumulation curve** ("when you chop matters" is
  taught, not simulated).
- `gen-101` teaches **polygenic** inheritance; the genetics core is 14 single-value traits with
  blend-and-jitter (single-gene Mendelian reasoning maps; polygenic does not yet).

**Well-aligned today (teach to the exact numbers):** IPM (humidity pest trigger ≥62, mildew ≥64),
post-harvest cure (sqrt curve, over-dry penalty), VPD-as-derived, Mendelian dominance.

**Missing topics the sim *does* model but no course teaches:** the **stress-band model itself** (the
core of how health is scored), **G×E** as a standalone concept, **stability → phenotype-range
narrowing**, and **rarity genetics**.

**Depth benchmark:** scale rigor by tier — Certificate = recognize/describe · Associate =
apply/diagnose · Bachelor = quantify/interpret-data · Master = design/optimize · Doctorate =
research/novel.

Recommendations:
- **[P1]** Add a depth gradient to existing lecture content per tier (verb ladder recognize →
  diagnose → quantify → design); anchor every 200/300-level objective to a number the sim actually
  uses. Data-only.
- **[P1]** **Reconcile lecture claims with sim reality** — where a course teaches a missing lever,
  reframe as forward-looking principle or soften to what's modeled. Never imply a control the game
  ignores. Content edit, not code.
- **[P1]** Add an explicit **G×E thread** and a **"reading plant stress"** topic (teach the actual
  scoring model players optimize against).
- **[FUT]** **Lab Analytics & QA department** — the real chemistry rigor (GC vs LC, calibration,
  LOD/LOQ, full CoA incl. contaminants); strong fit since the game already models potency-label
  inflation. Deepen chem/post-harvest content (water-activity chemistry) as the sim gains the model.
- **[FUT]** Doctorate capstone content = original-research methods (experimental design, controlled
  breeding trials, statistical phenotype analysis) — teaches the discovery economy.
- **[BL]** Knowledge-quiz question banks (the accuracy-review hotspot); per-ion/EC course content and
  spectrum/photoperiod content **gated behind the matching sim phase**.
- **[RO]** Pharmacology/Medical department (regulatory/accuracy risk — research, don't ship as
  gameplay-linked); chemotype taxonomy depth (Type I/II/III + the three terpene clusters).

### B. Master-grower methods (UNI-A03)
The curriculum **names the right master methods** (canopy training, VPD steering, the cure, IPM
discipline, pheno-hunt rigor) but **every practical collapses to one of 8 generic outcome checks**
(`harvest_count`, `harvest_quality`, `breed`, `stabilize`, `cure`, `cup_entry`, `research`, `level`).
The technique is taught and gated by *result*, but **the specific technique is not what's verified**.
That is the central gap *and* the biggest realism opportunity.

Crucially, **the sim already exposes the telemetry to verify two flagship methods with near-zero new
physiology**: VPD/DLI/PPFD are derived and on `/state`; curing already has the player *commit to a
cure target* and rewards hitting the window.

Recommendations:
- **[P1]** Add a **`vpd_in_band`** practical type (held VPD in the stage band for a sustained window)
  → wire to `cult-201`. Highest realism-per-effort win.
- **[P1]** Add a **`cure_window`** (precision-cure) practical type (target committed *and* hit within
  the optimal window, net-positive bonus) → wire to `ph-101`.
- **[P1]** Make Professor lectures **method-prescriptive and student-grounded** — pass the plant's
  VPD/DLI/PPFD + condition flags into the lecturer context; diagnose-then-prescribe-the-technique.
  No sim change, large credibility gain.
- **[P1]** Encode method **mental models as deterministic quiz items** (trichome-call heuristics,
  VPD-by-stage table, action-threshold ladder, when-to-top).
- **[FUT]** (gated on sim Phase B/C) `harvest_timing` (trichome-window call) · `pest_free_cycle`
  ("clean run" IPM) · `nutrient_steering` (vegetative↔generative steer, needs EC/pH model) ·
  `trained_canopy` (needs a canopy/leaf-area state + training verbs).
- **[BL]** Method-mastery XP hooks feeding the future `grower_skills` axis; a "dial-in a room"
  composite capstone practical for the Master; pheno-hunt selection-rigor practical.
- **[RO]** How much VPD/cure history to persist vs. recompute (honor the engine cost-cap); minimum
  honest trichome/ripeness representation; which levers can plausibly model crop-steering.

---

## UNI-005 · Learning Psychology Systems
*Source: UNI-A04.*

**The shipped loop is already strong on two of the three axes the science prizes most.** Real-time
`duration_hours` is unintentional but real **spacing** (you can't cram a 168h course); the
gameplay-tied practical is near-textbook **transfer / authentic assessment**. The missing third — and
cheapest, highest-impact intervention in all of learning science — is **retrieval practice (the
testing effect)**. The planned quizzes are the hook, but a one-shot gate captures almost none of the
benefit.

Other findings: lecture `objectives` are well-written and already map to **Bloom's taxonomy**
(Explain = Understand; Predict/Diagnose = Apply/Analyze; Design = Create) but are passive prose shown
once (no constructive alignment). The practical is **summative-only** — no formative checkpoint, no
diagnostic feedback, no second-chance learning. There is **no memory-maintenance** mechanism, so a
degree's knowledge decays (Ebbinghaus) in a long-lived game. SDT's three needs (autonomy/competence/
relatedness) are largely served — but a **punitive quiz would invert competence into test anxiety**.

Recommendations:
- **[P1]** Author quizzes as **retrieval practice, not a gate**: each item lives in `curriculum.yaml`,
  **maps to exactly one lecture objective** (constructive alignment), is **low-stakes, retryable, with
  immediate corrective feedback** (every item carries an `explanation` shown right or wrong).
- **[P1]** Write items at the **objective's Bloom level** (tag `bloom` in YAML) — predict/apply, not
  define; higher-order items transfer better and resist answer-key sharing.
- **[P1]** Place the quiz as a **formative checkpoint *before* the summative practical** (lecture →
  study → quiz-with-feedback → practical) — a dress rehearsal that tells the player what they don't
  know before they spend a real harvest.
- **[P1]** Use **plausible distractors mined from real grower misconceptions** ("higher EC = faster
  growth", "potency label = real potency"); a good distractor is a teaching moment.
- **[P1]** Surface objectives as a **visible checklist** tied to quiz results (competence signal +
  metacognitive map).
- **[FUT]** **Spaced-repetition "Continuing Education"** — a deterministic SM-2/Leitner scheduler
  (testable with the injected `Clock`) resurfaces passed items at expanding intervals; opt-in,
  reward-light (reward shape owned by UNI-006). Fights the forgetting curve; gives lapsed players a
  reason to return.
- **[FUT]** **Interleaving** at Master/Doctorate capstone quizzes (mix departments); **mastery-gated
  prereqs** (advance on ≥80% quiz, not just time); **two-stage practical feedback** (a failed
  practical returns a diagnostic tied to the missed objective).
- **[BL]** Generation/self-explanation prompts; confidence-weighted answering (hypercorrection
  effect); within-course difficulty adaptivity.
- **[RO]** Instrument **retention telemetry** before investing in spaced repetition (does the live
  grow already rehearse the concept?); measure whether the practical produces real far-transfer
  (do degree-holders' grow stats improve *beyond* the flat perk?).

*Cited science:* testing effect (Roediger & Karpicke 2006); feedback (Hattie & Timperley 2007);
spacing/forgetting (Ebbinghaus; Cepeda 2006; SM-2; Leitner); interleaving (Rohrer & Taylor 2007);
desirable difficulties (Bjork); Bloom's revised (Anderson & Krathwohl 2001); mastery learning
(Bloom 1968); constructive alignment (Biggs 1996); SDT (Deci & Ryan); generation/self-explanation
(Slamecka & Graf; Chi); hypercorrection (Butterfield & Metcalfe 2001); formative assessment
(Black & Wiliam 1998); scaffolding/ZPD (Wood/Bruner/Ross; Vygotsky).

---

## UNI-006 · Gamification Systems
*Source: UNI-A05. Cross-refs: UNI-A04 (quizzes/GPA), UNI-A07 (titles/leaderboards).*

University already does the *"what you earn"* half well (perks, `university_title`, XP) but is missing
the *"how you feel earning it"* half — **no transcript/GPA, no badges, no honor roll, no streaks, no
university leaderboards, no mastery tiers beyond the degree gate.** The key insight: **most of this is
read-only aggregation over data that already exists** (`CourseEnrollment`, `DegreeProgress`, curriculum
YAML), so it adds *feedback* without touching the economy. The leaderboard pattern
(`LeaderboardService`) is already built and trivially extensible (~10 lines per board).

**Economy safety:** every recommendation pays **prestige/cosmetics/XP, never GROW** — so no new
faucet. The one trap: the existing `progression.achievements` infra **pays GROW**, so university
badges must be a **separate cosmetic track**, not appended to it.

Recommendations:
- **[P1]** **Transcript + GPA** on the existing `GET /players/<id>/university` endpoint — total
  credits, in-progress %, and a **deterministic GPA derived from practical *margins*** (how far a
  harvest exceeded the threshold). Pure compute-on-read, no schema. Highest-impact, lowest-risk item.
- **[P1]** **In-flight progress feedback** ("X of Y study-hours remaining", "practical met / not
  yet") — turns the invisible study clock into visible progress.
- **[P1]** **University leaderboards** via `LeaderboardService`: `most_degrees`, `most_credits`,
  `fastest_mastery`. Same read-aggregate pattern, no economy impact.
- **[P1]** **Cosmetic-only badges** ("Dean's Honors: graduated with all practicals exceeded",
  "Polymath: a degree in every department") as a **separate non-GROW track**.
- **[FUT]** **Honor roll / Dean's list** — seasonal (reuse `events.current_season` like the Cup),
  recognition = a cosmetic prestige title, **no GROW**, compute-on-read.
- **[FUT]** **Mastery / prestige tiers beyond the Master** (a Ph.D. requiring all degrees + a high
  practical bar) — perks kept *modest* (prestige, not power creep).
- **[FUT][NEEDS-OWNER]** **Diploma NFTs** (Sprint 4) — mint a `DegreeProgress` as an on-chain
  credential, mirroring the Cup-trophy NFT; DB stays authoritative; gated behind real chain
  settlement (carried RISK #4/7).
- **[BL]** **Study streaks** — *high grind/dark-pattern risk*; only if gentle, losable-without-penalty,
  never a GROW faucet; park until the owner wants engagement loops (design against
  `04-honesty-and-trust.md`). **Reputation tie-in** (degrees + Cup → unified grower reputation).
- **[RO]** GPA semantics (keep cosmetic + eligibility-only, never a perk multiplier); quizzes as a
  GPA input (UNI-A04 handoff).

---

## UNI-007 · Production Requirements
*Source: UNI-A08 (content-production & engineering pipeline).*

The authoring format is clean and minimal **but completely unguarded**, and "quiz grading" /
localization / assets are greenfield.

Findings:
- **Zero schema validation.** `curriculum.yaml` is loaded via `yaml.safe_load` into a module-global
  cache with no checks: nothing verifies that a course's `department` exists, that `prereqs`/
  `required_courses` reference real keys, that `practical.type` is one of the 9 handled types, or that
  perk keys ∈ `_EFFECT_KEYS`. **Unknown perk keys are silently dropped** — a typo'd perk fails with
  no error. A malformed file or dangling prereq ships to prod and silently locks a course.
- **No CI integrity test.** `tests/test_university.py` is behavior-focused and hard-codes specific
  keys/values; there is no data-driven test iterating every course/degree for referential + effect-key
  consistency. **This is the #1 scaling risk as departments multiply.**
- **The "quiz" is decorative** — `quiz_question` is one free-text string, never graded. Real quiz
  authoring + grading is greenfield (confirms UNI-A04/A09).
- **Lectures generate live with no server-side cache or cost cap** — every `GET .../lecture` is a
  fresh ~8k-token call to the real provider; the endpoint is rate-limited (30/min) but cost is unbounded.
- **No localization** (English-only inline strings; no i18n) and **no content-asset pipeline**
  (titles are strings; no diploma/department imagery).
- **Schema-drift hole:** course/degree keys double as DB foreign-keys-by-convention with no FK or
  migration guard — renaming/removing a key **orphans existing `CourseEnrollment`/`DegreeProgress`
  rows** silently.

Requirements / recommendations:
- **[P1]** **Curriculum validator + CI data-integrity test** (`tests/test_curriculum_integrity.py`):
  assert every department resolves; every prereq/required-course is a real key; every `practical.type`
  is handled; every perk key ∈ `_EFFECT_KEYS`; no prereq cycles; `level_req` monotonic along chains;
  positive numeric gates. Pure-Python, mock-only. **Highest ROI, smallest effort.**
- **[P1]** Promote the validator to a **loader-time check** (fail fast on boot) and/or a
  `make validate-curriculum` script wired into the gate.
- **[P1]** **Make the unknown-perk-key silent-drop loud** in CI (caught by the validator).
- **[P1]** **Persist/cache lectures** keyed by `(course_key, level, context_bucket)`; regenerate only
  on explicit re-deliver with a per-player budget — caps real-Claude cost and makes lectures stable
  content. (Pairs with the SpendGuard in UNI-008.)
- **[FUT]** **Real quiz schema + deterministic grader** (`quiz: [{q, choices, answer, explanation,
  bloom}]`, MCQ/numeric, graded server-side, **no AI in the grading path**). The natural home for the
  UNI-A04 / A09 quiz design.
- **[FUT]** Localization readiness (locale-keyed strings or `curriculum.<lang>.yaml`; pass a
  `language` into the lecturer context) — defer the web i18n framework until a 2nd language is real.
- **[BL]** Course-key **lifecycle guard** (flag orphaned rows; a tombstone/deprecation convention
  instead of hard-delete); **split curriculum by department** (`curriculum/<dept>.yaml`) past ~6
  departments; diploma/department **imagery pipeline** (Adobe asset MCP) if the University gets a
  visual identity.
- **[RO]** AI-assisted authoring (generate-then-human-review, validator-gated before commit); a
  lecture **fact-checking harness** (deep-research pattern) as an *offline* QA tool, never in the live
  request path.

*Determinism invariant (non-negotiable):* the lecture path stays mock-gated so CI is keyless and
green; quiz grading and any learner-model update must be **pure** (no LLM), testable deterministically.

---

## UNI-008 · AI Tutor Roadmap
*Source: UNI-A09.*

**What ships is a one-shot lecture generator, not a tutor** — `LecturerProvider.lecture(context) →
LectureReport` is stateless, single-turn, with no conversation, learner state, adaptation, or grading.
But **the architecture already has every primitive a tutor needs** — they need *new ABCs alongside
the lecturer, not a rebuild*:
1. **Structured outputs** (`messages.parse(..., output_format=PydanticModel)`) — a tutor turn schema
   (reply + hint-level + concept-tags + correctness) fits directly.
2. **Deterministic mock + key-gated factory** — every tutor capability ships with a deterministic
   mock twin so CI never needs a key.
3. **Cost control already exists** — the autocare `_SpendGuard` (caps spend/actions per invocation)
   is the exact pattern to copy for token/turn budgets.

Grounding material (strain KB, curriculum objectives, the research reference, live sim state) **exists
in-repo but is not currently fed to the AI** — the central hallucination risk for a tutor that answers
open questions; the prompt says "don't fabricate" but provides no retrieved facts to ground against.

Roadmap:
- **[P1]** **Deterministically-graded quizzes** — the biggest ⬜ gap, near-zero AI risk; author
  `quiz` blocks + a pure `quiz_service` grader. Gives the tutor the *labels* (which concepts a student
  missed) everything downstream needs. (Shared item with UNI-A04/A07/A08.)
- **[P1]** **`TutorProvider` ABC** for Socratic Q&A on a lecture (beside `LecturerProvider`):
  `answer(context, history) → TutorTurn` (reply, `concept_tags`, `hint_level`, `is_socratic_question`).
  Ship `MockTutorProvider` (deterministic) + `ClaudeTutorProvider`; history passed explicitly
  (DB-authoritative, provider holds no state).
- **[P1]** **Hint ladder** on the practical/quiz (generic nudge → concept reminder → worked step);
  levels 1–2 are authored data (deterministic, free), only the final hint needs the LLM.
- **[P1]** **Wire a SpendGuard for the tutor** (per-session turn cap + per-player daily token budget,
  graceful mock fallback when capped). Non-negotiable before any real-key tutor ships.
- **[P1]** **RAG grounding v1** (no vector DB): inject relevant curriculum objectives + lecture text +
  cited strain-KB rows + live sim snapshot as explicit "GROUNDING FACTS — answer only from these";
  refuse/defer when the answer isn't grounded. The single biggest anti-hallucination lever.
- **[FUT]** **Tool-grounded tutor** (autocare `@beta_tool` pattern, **read-only** `lookup_strain` /
  `lookup_course_objective` / `read_my_plant`); **named-faculty personas / course voices**;
  **personalized practical feedback** on real grow telemetry; **knowledge tracing / learner model**
  (start with a simple deterministic BKT-style update, no LLM).
- **[BL]** Adaptive difficulty / outer-loop sequencing (needs the learner model); a **tutor-quality
  eval harness** (deterministic golden set in CI + key-gated LLM-judge offline) before broad exposure;
  diploma-NFT tie-in for tutor mastery.
- **[RO]** BKT vs DKT vs LLM-as-tracer (classic **BKT is almost certainly right** — interpretable,
  deterministic, no training data); open-learner-model UX; whether the small structured corpus ever
  needs real embeddings (keyed lookup likely suffices indefinitely).

---

## UNI-009 · Community Recommendations
*Source: UNI-A07.*

University is currently a **fully solo loop** — every checkpoint is single-player. But **the social
primitives already exist and aren't yet connected**: leaderboards, the Cup + permanent Hall of Fame,
profiles carrying lifetime titles. A "knowledge economy tying degrees + Cup standing" is named-but-
unbuilt in both `06-university.md` and `03-grower-skills.md`. **The honesty/trust ethos
(`04-honesty-and-trust.md`) sets hard constraints** — any reputation/peer-review/vote mechanic must be
verifiable and Sybil/collusion-resistant — and **all player-authored content is a brand-new
moderation surface** the project has never had (the dominant risk, gating UGC features).

Recommendations:
- **[P1]** **Alumni network + degree directory** — public read of who holds which degrees/titles
  (reuse `LeaderboardService`); zero moderation, makes solo study visible.
- **[P1]** **Deterministic knowledge/reputation score** ("Scholar standing" = pure function of earned
  degrees + Cup standing + verified discoveries) — server-authoritative, honest-by-construction, the
  spine everything else hangs on. No new faucet (a label, not GROW).
- **[P1]** **Named faculty (NPC professors)** — per-department personas on the existing provider;
  advances the planned faculty depth, zero UGC.
- **[P1]** **Graduation events** — a seasonal, compute-on-read ceremony batching recently-claimed
  degrees into a permanent "graduating class" (Hall-of-Fame-for-scholars; reuse Cup machinery).
- **[FUT]** **Mentor↔apprentice** (master witnesses/co-signs an apprentice's practical; both earn
  standing) — design alongside the anti-Sybil framework, reputation/XP only with a sink; **study
  groups / cohorts** (seasonal); **guilds / grow-co-ops as "schools"**.
- **[BL]** **Peer-reviewed practicals** (subjective judgment into a deterministic gate — needs
  anti-collusion + dispute path); **discussion / Q&A** around lectures (free-text UGC — blocked on
  moderation).
- **[RO][NEEDS-OWNER]** **Community-authored courses** (UGC granting in-game perks, in a cannabis
  context — full moderation + editorial + legal sign-off first); **knowledge marketplace** (paid
  consulting/recipes — touches real economy, owner-gated).

---

## UNI-010 · Backlog · Risks · Priorities · Canonical Recommendations
*+ the formal Records-Department consolidation report (Directive UNI-010).*

### Deliverable #10 — Backlog Recommendations (consolidated)
Items deliberately parked (lower priority, or gated on a dependency / owner sign-off):

- **Curriculum:** electives & "N-of-M" tracks, minors/concentrations, wire-up/retire unused effect
  keys; split `curriculum.yaml` by department past ~6; diploma/department imagery pipeline.
- **Methods/sim-gated:** trichome harvest-window, "clean run" IPM, crop/nutrient steering, canopy
  training practicals (each gated on sim Phase B/C); method-mastery XP into a future `grower_skills`
  axis; "dial-in a room" composite capstone; pheno-hunt selection-rigor practical.
- **Pedagogy:** generation/self-explanation prompts, confidence-weighted answering, within-course
  adaptive difficulty.
- **Gamification:** study streaks (dark-pattern-risk, owner-gated), unified grower-reputation tie-in.
- **AI tutor:** adaptive outer-loop sequencing, tutor-quality eval harness, diploma-NFT tutor tie-in.
- **Community:** peer-reviewed practicals, lecture Q&A (both blocked on a moderation pipeline).
- **Production:** course-key lifecycle/tombstone guard; localization framework (defer to 2nd language).

### Deliverable — Monetization (RESEARCH / BACKLOG ONLY — UNI-A06)
**Phase 1 = NONE, explicitly.** Every viable University monetization hits a stop-and-ask gate (real
money / chain settlement / player-facing prices), the **fiat rail is already parked by the owner**
(ADR 2026-06-11), and pre-launch compliance (age-gating, ToS/privacy for a cannabis product taking
money) is unfinished. The current sink-only design is correct and shipping. Future options, graded by
ethos-fit (best first), **all [NEEDS-OWNER]**:
1. **Cosmetic-only regalia / diploma skins** — lowest pay-to-win risk; the safe default if pursued.
2. **Diploma / credential NFTs** (Proof-of-Cultivation kin) — keep a *mirror credential*, never a
   perk source; chain-settlement gated.
3. **Premium AI-Professor tier** (richer lectures/personas) — *danger zone*: must be provably
   power-neutral (no faster degrees, no exclusive hints).
- **[BL]** Cosmetic "semester pass" (FOMO risk vs. the deliberate-pace ethos); optional
  tuition-assistance/scholarship **sink**.
- **[RO]** Sponsored real-brand courses (severe cannabis-advertising legal risk — **legal sign-off
  before any conversation**); premium-currency top-ups (the parked-faucet class).
> **Hard rule for all future work:** University monetization must be **provably power-neutral**
> (cosmetic / credential / flair / pure sink only). Pay-to-win breaks the moat.

### Deliverable #11 — Risks (consolidated, severity-ordered)
| Sev | Risk | Source | Mitigation |
|-----|------|--------|------------|
| **HIGH** | **Pay-to-win / monetization breaking the moat** | A06 | Power-neutral rule; all monetization owner-gated. |
| **HIGH** | **Unguarded curriculum** — dangling prereqs, bad refs, silently-dropped perk keys ship to prod | A01, A08 | Validator + CI integrity test + loader-time check (**P1**). |
| **HIGH** | **Teaching-ahead-of-sim** — courses teach levers the engine ignores; players discover the technique does nothing | A02, A03 | Reconcile lectures with sim reality; verify technique (vpd_in_band/cure_window); frame missing levers as forward-looking. |
| **HIGH** | **AI hallucinated / unsafe / age-inappropriate advice** (open-Q&A tutor) | A09 | RAG grounding ("answer only from these"); refusal rules; eval probes; tool-grounded lookups. Launch blocker for the tutor. |
| **MED** | **Faucet creep / perk power-creep** — a gamification mechanic paying GROW, or stacked tier perks inflating yield/quality | A05, A01 | Keep all feedback cosmetic/XP; separate badge track from paid achievements; balance-pass in `balance.yaml`; cap apex-tier perks. |
| **MED** | **Outcome-proxy practicals** teach *that* quality matters, not *how* | A03 | Technique-verifying practical types. |
| **MED** | **UGC moderation + cannabis age/legal** | A07 | No UGC past Phase 1 until a moderation pipeline + age-gating + legal sign-off exist. |
| **MED** | **Test-anxiety / grind** — a punitive quiz or a streak treadmill inverts intrinsic motivation | A04, A05 | Quizzes low-stakes/retryable/feedback-first; streaks gentle, losable, owner-gated. |
| **MED** | **Schema drift** — renaming/removing a course key orphans player rows | A08 | Tombstone convention + lifecycle guard. |
| **MED** | **Live-lecture cost** (no cache) | A08, A09 | Persist/cache lectures; SpendGuard for the tutor. |
| **LOW** | **CI determinism regressions** | A08, A09 | Every AI capability ships a deterministic mock twin; grading/learner-model stay pure; never require a live key in CI. |

### Deliverable #12 — Implementation Priorities
**Phase 1 (launch track) — the consensus build order.** Cheap, data-driven, reuses shipped patterns,
no economy/chain/UGC:

1. **Curriculum integrity validator + CI test + loader-time check** (A01/A08) — *guard before you
   grow the catalog.* Smallest effort, highest ROI; unblocks everything else safely.
2. **Deterministically-graded quizzes** — schema in YAML + a pure grader (A04/A08/A09); authored as
   objective-mapped, Bloom-tagged, retryable, feedback-first **retrieval practice placed before the
   practical** (A04). *Named by 5 of 9 reports — the flagship Phase-1 feature.*
3. **Tier ordering + `requires_degree`** (A01) — make the credential ladder real; prerequisite for a
   Doctorate.
4. **Technique practicals: `vpd_in_band` + `cure_window`** (A03) — the sim already exposes the
   telemetry; verify the method, not just the result.
5. **Student-grounded, method-prescriptive lectures + lecture caching/SpendGuard** (A03/A08/A09).
6. **Read-only feedback layer: transcript + GPA, in-flight progress, university leaderboards,
   cosmetic badges** (A05) — visible progression, zero economy impact.
7. **Content depth-gradient + reconcile lectures with sim reality; add G×E + stress-band topics**
   (A02) — pure content.
8. **Community Phase-1 (no UGC): alumni directory, deterministic Scholar-standing score, named
   faculty, graduation events** (A07).

**Future (post-launch):** Doctorate tier + capstone practical; Lab/QA & other departments
**[NEEDS-OWNER]**; spaced-repetition Continuing Education; `TutorProvider` Socratic ABC + hint
ladders + RAG grounding; mentor/apprentice + cohorts; honor roll / prestige tiers; diploma NFTs
(Sprint 4) **[NEEDS-OWNER]**.

**Backlog / Research-only / Monetization:** as enumerated above — all monetization is owner-gated and
not a launch dependency.

### Deliverable #13 — Canonical Recommendations
The non-negotiable, cross-report consensus that should govern all future University work:

1. **Do not rebuild the skeleton.** The data-driven catalog + `enroll→study→practical→degree` loop +
   provider-ABC Professor is the right architecture. Extend by YAML and new ABCs/practical-branches.
2. **Guard the curriculum in CI before scaling it.** A validator is the load-bearing prerequisite for
   every department/course/quiz that follows.
3. **Quizzes are the keystone Phase-1 feature** — and they are **retrieval practice, not a gate**:
   low-stakes, retryable, feedback-first, objective-mapped, Bloom-tagged, **deterministically graded
   with no AI in the grading path**, placed *before* the practical.
4. **Verify technique, not just outcome** — migrate practicals from outcome-proxies toward
   method-verifying types as the sim exposes the telemetry (start with VPD + cure).
5. **Keep every lecture claim auditable against the sim *or* explicitly forward-looking.** Never imply
   a control the game ignores.
6. **All gamification pays prestige/cosmetics/XP — never GROW.** Keep the University net-deflationary;
   any GROW-paying mechanic or new economy perk key is **[NEEDS-OWNER]**.
7. **AI stays CI-safe and grounded:** deterministic mock twin for every capability, never a live key
   in CI, SpendGuard on cost, RAG/tool grounding + refusal rules against hallucinated/unsafe advice.
8. **No UGC until moderation + age-gating + legal sign-off exist.** Prefer deterministic,
   server-authoritative reputation (degrees + Cup) over crowd-voted scores.
9. **Monetization is research-only and provably power-neutral** — and nothing ships without explicit
   owner sign-off.

---

## 📋 CONSOLIDATION REPORT — Directive UNI-010

**Directive ID:** UNI-010
**Lead Agent:** UNI-A00
**Worker Agent:** UNI-A10
**Reports Received:** 9 of 9 — UNI-A01 (Curriculum Architecture), UNI-A02 (Cannabis Science
Curriculum), UNI-A03 (Master Grower Methods), UNI-A04 (Learning Psychology), UNI-A05 (Gamification
Systems), UNI-A06 (Monetization — Backlog Only), UNI-A07 (Community), UNI-A08 (Production Pipeline),
UNI-A09 (AI Tutor Systems).

**Consensus Findings:**
1. The University is **shipped and architecturally sound** — do not rebuild; extend via data + new
   ABCs.
2. **Deterministically-graded quizzes** are the single most-requested Phase-1 feature (named
   independently by A02, A03, A04, A08, A09); today's "quiz" is decorative.
3. The **curriculum is unguarded** (no schema validation, silent perk-key drops) — the top scaling
   risk; a validator + CI test is the highest-ROI Phase-1 item (A01, A08).
4. **Practicals verify outcome, not technique**; the sim already exposes VPD/DLI/PPFD + a cure window
   to verify real method now (A03).
5. **Read-only gamification** (transcript/GPA/leaderboards/badges) and **Phase-1 community**
   (alumni/Scholar-standing/faculty/graduation) are cheap, economy-safe wins reusing shipped patterns
   (A05, A07).
6. **Pedagogy:** the loop already nails spacing + transfer; it lacks retrieval practice, formative
   feedback, and memory maintenance (A04).
7. **AI tutor:** evolve the lecture-reader into a grounded Socratic tutor via new ABCs + RAG +
   SpendGuard, all CI-safe (A09).

**Conflicts:** Minimal, and resolved. The only real divergence was the **role of quizzes** — A04
framed them as *low-stakes formative retrieval practice placed before the practical*, while A08/A09
floated them as an optional *soft gate*. **Resolution (canonical):** quizzes are low-stakes,
retryable, feedback-first retrieval practice placed *before* the practical, **never a hard fail**;
they may inform GPA/eligibility but do not block a paid enrollment. Secondary: GPA's role — resolved
to **cosmetic + eligibility-only, never a perk multiplier** (A05). No factual contradictions between
reports; the nine were highly complementary.

**Risks:** See Deliverable #11. Top three: (1) pay-to-win monetization breaking the moat; (2) the
unguarded curriculum shipping silent errors; (3) teaching-ahead-of-sim eroding credibility. AI
hallucination/unsafe advice is the launch blocker specific to the tutor track.

**Needs You (owner decisions — none block Phase 1):**
1. **New perk effect keys** for Lab/QA · Business/Compliance · Medical departments — crosses the
   player-facing-economy line.
2. **UGC + cannabis age/legal go/no-go** before any community feature past Phase 1.
3. **Free vs. paid/economy-gated AI tutor** — a player-facing economy decision.
4. **Any monetization at all** — all options are owner-gated; recommended posture is cosmetic-only,
   power-neutral, deferred until post-launch + fiat rail un-parked.

**Next:** Promote the Phase-1 priority list (Deliverable #12) into `docs/memory/BACKLOG.md` as scoped
build items; the highest-ROI first build is the **curriculum-integrity validator + CI test**, which
safely unblocks the **graded-quiz** feature that five of the nine reports converged on.

**Observations:** The reports were strikingly aligned — the same three gaps (no real quizzes, no
curriculum guard, outcome-proxy practicals) surfaced from independent angles (pedagogy, engineering,
horticulture). That convergence is itself a strong signal for the priority order. Notably, almost all
Phase-1 value is *cheap and economy-safe*, while nearly everything *expensive* is correctly
owner-gated or sim-phase-gated — the University is in a healthy position to deepen without risk.

**Recommendation:** Adopt this Bible as the canonical University blueprint. Build Phase 1 in the
Deliverable-#12 order, validator-first. Hold all monetization, new economy perk keys, on-chain
diplomas, and UGC for explicit owner sign-off.

**Blocked:** Nothing. This was a records-consolidation directive; all nine input reports were
received and consolidated. No code was changed; no gate was touched beyond adding this document and
its cross-links.

---

*Consolidated 2026-06-14 by the GrowPod University Research Department (Directive UNI-010,
Lead UNI-A00 / Worker UNI-A10). Grounds and is grounded by
[`docs/memory/design/06-university.md`](memory/design/06-university.md) and
[`docs/research/2026-06-08-cannabis-education-curriculum.md`](research/2026-06-08-cannabis-education-curriculum.md).*
