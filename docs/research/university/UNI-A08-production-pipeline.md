# UNI-A08 — GrowPod University: Production Pipeline
**Directive ID:** UNI-001 · **Lead Agent:** UNI-A00 · **Worker Agent:** UNI-A08
**Asked:** Design the content production pipeline that turns raw research into shipped, data-driven GrowPod University courses (authoring flow, extended schema, validation/lint, versioning, QA gates, AI-lecturer consumption, localization, multi-department scale).
**Done:** Specced an end-to-end research→ship pipeline: an extended (back-compatible) `curriculum.yaml` schema with provenance + quiz banks, a curriculum-validator tool + CI lint gate, content versioning, a 4-gate review flow, the lecturer-consumption contract, and a localization/readability layer — all without code changes to the engine.
**Risks:**
- Schema growth can break the live service if not strictly additive — every new key MUST default-safely in `university_service.py`/`lecturer_service.py`.
- Quizzes introduce an *authored answer key* in data; a wrong key silently mis-grades players. The validator is the only guard.
- AI-generated draft content can hallucinate horticultural facts; the human review gate is load-bearing, not optional.
- Localization can desync from source if not version-pinned to the English `content_version`.
**Needs You:** nothing (research-only). One product decision flagged inline: whether quizzes are a *hard gate* on completion or *advisory* (affects economy + difficulty tuning — owner taste).
**Next:** Hand the extended schema + validator spec to an implementation agent; coordinate with UNI-A09 (lecturer consumption contract) and UNI-A01/A02/A03 (research intake format).

---

## 0. Scope & invariants this pipeline must honor

This is the **factory** that turns raw research (from UNI-A01/A02/A03 cannabis-science
research) into shipped `curriculum.yaml` content. It is explicitly *not* a code path: the
core loop and the engine never change to add a course. Grounding read:

- Content lives in `src/growpodempire/data/curriculum.yaml` (departments/courses/degrees).
- Economic knobs live in `src/growpodempire/data/balance.yaml` under `university:` (lines 199-201).
- The service that consumes it: `src/growpodempire/services/university_service.py`
  (`load_curriculum()`, `_practical_met()`).
- The lecturer that renders it: `src/growpodempire/services/lecturer_service.py` +
  `src/growpodempire/ai/provider.py` (`LectureReport`) + `ai/lecturer_mock.py`.
- Design intent: `docs/memory/design/06-university.md`.

**Hard invariants this pipeline must never violate** (from `CLAUDE.md`):
1. **`balance.yaml` / `curriculum.yaml` are the tuning surface** — new content is *data*, never code.
2. **DB is authoritative** — practicals are checked against live game state; quizzes are graded server-side.
3. **CI-safe** — content must be fully exercisable under the deterministic `MockLecturerProvider`, no live AI key.
4. **Faucet/sink discipline** — tuition is a sink; courses/degrees pay perks+XP, never GROW. New content must not add a GROW faucet.
5. **Add a test with every feature** — every schema extension ships with a validator rule + a test fixture.

Status tags used below: ✅ shipped · 🔨 partial/exists-but-thin · ⬜ proposed-by-this-spec.

---

## 1. The pipeline at a glance

```
 UNI-A01/A02/A03            UNI-A08 (this)                              Runtime
 ───────────────   ─────────────────────────────────────────   ──────────────────────
 raw research  →  [1 intake]  →  [2 author]  →  [3 validate]  →  [4 review/QA]  →  ship
 (science docs)    research-       draft YAML      curriculum-      4 gates,         merge to
                   pack (md+yaml)  fragment        validator +      sign-off         curriculum.yaml
                                   per course      CI lint                            │
                                                                                      ▼
                                                                    university_service / lecturer_service
                                                                    (UNI-A09 consumes lecture+quiz)
```

Each stage has a **defined artifact** and a **gate** before the next stage. Nothing reaches
`curriculum.yaml` (the shipped file the service reads) until it passes the validator and a human review.

---

## 2. Stage 1 — Research intake (⬜ proposed contract with UNI-A01/A02/A03)

Raw research today lands as free-form markdown (e.g.
`docs/research/2026-06-08-cannabis-education-curriculum.md`,
`docs/research/2026-06-08-cannabis-strain-genetics-and-cultivation.md`). That is fine for
humans but unstructured for authoring. Proposed **research-pack** handoff so authoring is
mechanical, not interpretive:

```yaml
# docs/research/university/intake/<topic>.research.yaml  (authored by A01/A02/A03)
topic: "Vapor-pressure deficit & DLI canopy steering"
maps_to_department: cultivation         # one of the schema departments
suggested_course_level: 201             # 101/201/301 band
learning_objectives:                    # the raw teachable claims
  - claim: "VPD targets shift by growth stage; transpiration scales with VPD."
    source: "Penn State PLANT 240; commercial-grow practice"
    confidence: high                    # high|medium|contested
  - claim: "DLI/PPFD drives yield up to a light-stress ceiling."
    source: "Cornell controlled-environment hort"
    confidence: high
quiz_seeds:                             # raw Q/A facts a quiz author can turn into items
  - fact: "Higher VPD => higher transpiration demand."
  - fact: "Excess DLI past the stress ceiling reduces, not increases, quality."
key_terms: [VPD, DLI, PPFD, transpiration]
citations:
  - "docs/research/2026-06-08-cannabis-education-curriculum.md"
```

This is the **only** thing A01/A02/A03 must produce for A08 to author. It is intake data, not
shipped content, so it lives under `docs/research/university/intake/` and never feeds the runtime.
Provenance (`source`, `confidence`, `citations`) is carried forward into the shipped schema (§3)
so a future audit can trace any taught fact back to a citation — the "scientist-grade" moat target.

---

## 3. Stage 2 — Extended content schema (🔨 extends the live schema)

The live schema (see `curriculum.yaml` lines 27-44) is intentionally minimal. This spec **extends
it additively** — every new key is optional and default-safe so the existing service keeps working
untouched. Below is an *illustrative* extended course entry; new keys are marked `# NEW`.

```yaml
courses:
  cult-201:
    name: "Environmental Control: VPD & DLI"
    department: cultivation
    credits: 4
    level_req: 3
    duration_hours: 96
    tuition: 300
    prereqs: [cult-101]

    # --- content metadata (NEW) -------------------------------------------
    content_version: 3          # NEW bump on any content change (see §5)
    status: published           # NEW draft|in_review|published|deprecated
    authored_by: "UNI-A08"      # NEW provenance
    reviewed_by: "UNI-A00"      # NEW set by the review gate (§6)
    research_refs:              # NEW traceability back to intake/citations
      - "docs/research/university/intake/vpd-dli.research.yaml"

    lecture:
      topic: "Steering the canopy with vapor-pressure deficit and daily light integral..."
      objectives:
        - "Target VPD by growth stage and relate it to transpiration."
        - "Use DLI/PPFD to drive yield without light stress."
      # NEW optional lecturer hints — consumed by LecturerService context (§7)
      key_terms: [VPD, DLI, PPFD, transpiration]
      citations: ["Penn State PLANT 240", "Cornell CEA"]
      readability_target: grade-10     # NEW localization/readability (§8)

    # --- quiz bank (NEW — the planned "knowledge quizzes" from 06-university.md §50) ---
    quiz:                       # NEW
      pass_threshold: 0.7       # fraction correct to pass (data-driven)
      draw: 3                   # serve N random items from the bank per attempt
      gate: advisory            # advisory | required  (see PRODUCT DECISION §6)
      bank:
        - id: q-vpd-1
          prompt: "As VPD rises, plant transpiration demand generally…"
          type: single_choice         # single_choice | multi_choice | true_false
          choices: ["increases", "decreases", "is unaffected", "inverts"]
          answer: 0                    # index into choices
          explain: "Higher VPD = drier air = more water vapor leaves the leaf."
          difficulty: easy
          objective_ref: 0             # ties item to lecture.objectives[0]
        - id: q-dli-1
          prompt: "Pushing DLI past the light-stress ceiling will…"
          type: single_choice
          choices: ["raise quality", "reduce quality", "have no effect"]
          answer: 1
          explain: "Beyond the ceiling, light stress degrades quality."
          difficulty: medium
          objective_ref: 1

    practical: {type: harvest_quality, threshold: 70}
    perks: {yield_pct: 0.03}
```

**Practical schema** is unchanged — the eight `practical.type` values in
`university_service.py:_practical_met()` (`harvest_count`, `harvest_quality`, `breed`,
`stabilize`, `cure`, `cup_entry`, `research`, `level`) are the *closed vocabulary*. A new
practical type DOES require a code change (a new branch in `_practical_met`), so the validator
must reject unknown types loudly rather than let them silently pass (the function currently
`return True, "none"` on unknown types — a footgun the lint must cover; §4).

**Departments & degrees** extend the same way: new `departments:` entries and `degrees:` entries
are pure data. The "many departments without code changes" target (06-university.md §51, "Lab
Analytics & QA, Business/Law/Compliance, Pharmacology/Medical") is satisfied entirely by adding
`departments:` + `courses:` + `degrees:` rows — no service edit, provided perks reuse the existing
effect keys (`research_service._EFFECT_KEYS`) and practicals reuse the existing types.

---

## 4. Stage 3 — Validation / lint (⬜ proposed tool: `curriculum-validator`)

A standalone validator (`scripts/check_curriculum.py`, stdlib + PyYAML, mirroring
`scripts/check_memory.py`) run by `make lint` and CI. It is the single guard that makes
data-driven authoring safe. **Rules:**

**Structural / referential integrity**
1. Every `course.department` resolves to a `departments:` key.
2. Every `course.prereqs[]` and `degree.required_courses[]` resolves to a real course key.
3. **Prereq DAG is acyclic** and every course is reachable (no orphan that no degree/level path leads to).
4. `level_req` is non-decreasing along a prereq chain (you can't gate a 101 behind a level higher than its 301).

**Economy / invariant guards**
5. Every `perks:` key ∈ `research_service._EFFECT_KEYS` (so degrees keep reusing the same apply-sites — 06-university.md §31). An unknown effect key = silent no-op perk = player feels cheated.
6. `tuition >= 0`; warn if a course pays *anything* that looks like a GROW faucet (defense-in-depth on the sink invariant).
7. `duration_hours > 0`, `credits > 0`, `tuition` integer-valued (money is `Decimal`-clean).

**Practical safety (closes the `_practical_met` footgun)**
8. `practical.type` ∈ the closed vocabulary list. Unknown type = **hard fail** (because the service silently auto-passes unknown types).
9. `practical.threshold` numeric and ≥ 1.

**Quiz integrity (NEW content type — highest-risk)**
10. Every `quiz.bank[].answer` index is in range of `choices` (the mis-grade guard).
11. `quiz.draw <= len(bank)` and `0 < pass_threshold <= 1`.
12. Item `id`s unique within a course; `objective_ref` resolves to a `lecture.objectives[]` index.
13. `gate` ∈ {advisory, required}; `type` ∈ {single_choice, multi_choice, true_false}.

**Content/provenance hygiene**
14. `status` ∈ {draft, in_review, published, deprecated}; only `published` courses are servable (the service should filter — see §7).
15. `content_version` is a positive int and present whenever `status: published`.
16. Lecture `objectives` non-empty (the mock lecturer and quizzes both key off objectives).
17. Readability lint (warn-level): `lecture.topic`/`content` under the `readability_target` grade band (§8).

**Determinism check** — load the whole file, render every course through `MockLecturerProvider`,
assert a non-empty `LectureReport` and that any `quiz_question` is consistent. This guarantees CI
can exercise 100% of content with no AI key (invariant #3).

Validator output mirrors `check_memory.py`: exit 1 with a precise `course-key: rule` list. A
companion **test** (`tests/test_curriculum.py`) loads the shipped file and asserts the validator
passes — so the gate protects the live data, not just authoring drafts. (Add-a-test invariant.)

---

## 5. Versioning (⬜ proposed convention)

Content is data, so versioning is data-versioning, not code-versioning:

- **Per-course `content_version`** (int, bump on any substantive change to lecture/quiz/objectives).
  Lets the client cache lectures and lets QA diff "what changed."
- **File-level `schema_version`** at the top of `curriculum.yaml` (NEW top key). The validator pins
  to a known `schema_version`; bumping it is the explicit, reviewed moment a new schema key becomes legal.
- **`status` lifecycle**: `draft → in_review → published → deprecated`. Deprecated courses stay in
  the file (so existing enrollments/transcripts don't dangle — `CourseEnrollment` rows reference
  `course_key`) but are hidden from the catalog and not enrollable. **Never delete a course key** that
  any player may have completed; deprecate instead (DB-authoritative, transcripts must resolve).
- **Localization pinning**: each locale file carries the `content_version` it was translated from, so
  the validator can flag stale translations (§8).
- Git is the audit log; the review gate's `reviewed_by` + the PR is the sign-off record.

---

## 6. Stage 4 — Content QA & review gates (⬜ proposed flow)

Four gates between a draft and `published`. Each gate is a checklist, not a vibe:

| Gate | Owner | Passes when |
|------|-------|-------------|
| **G1 Schema/lint** | `curriculum-validator` (automated, CI) | All §4 rules green; renders under mock. |
| **G2 Factual review** | Science reviewer (A01/A02/A03 or SME) | Every objective + quiz answer traces to a research-pack citation with `confidence: high`; contested claims flagged in-lecture, not asserted. |
| **G3 Pedagogy/balance** | Curriculum lead (A00) | `level_req`/`prereqs`/`duration_hours`/`tuition` fit the progression curve; perks within economy budget; quiz `difficulty` ladder sane. |
| **G4 Sign-off** | A00 sets `reviewed_by`, flips `status: published` | G1-G3 green; `content_version` bumped. |

**AI-assisted drafting is allowed but never auto-published.** A draft lecture body / quiz items may
be generated (by the real `ClaudeLecturerProvider`, offline) to *seed* authoring, but G2 (human
factual review) is mandatory — AI can hallucinate VPD numbers. The reviewer edits the YAML; the AI
output is a starting point, not the shipped artifact.

> **PRODUCT DECISION (owner taste, flagged not decided):** Is a quiz a **hard gate** on
> `complete_course` (must pass quiz AND practical AND time) or **advisory** (score recorded, doesn't
> block)? `gate: advisory|required` in the schema supports both per-course. Recommendation: ship
> `advisory` first (lower friction, no economy shock), promote select courses to `required` once the
> quiz banks are proven. This is a faucet/sink-adjacent difficulty knob, so it's owner-scoped.

---

## 7. Lecturer & quiz consumption (🔨 lecture exists; quiz is the new contract for UNI-A09)

**Lecture (today, ✅):** `LecturerService.teach()` builds a context dict from `course.lecture`
(`name`, `department`, `topic`, `objectives`, `level`, optional `student_plant`) and asks the
provider for a `LectureReport` (`ai/provider.py` lines 73-100). The mock builds it deterministically.
This pipeline feeds richer context **additively** — the NEW `key_terms`/`citations` keys flow into the
context dict so the real professor can cite sources, while the mock ignores unknown keys (back-compat).

**Quiz (NEW — the A09 consumption contract):**
- The quiz **bank is authored data** (§3); grading is **server-side and deterministic** (DB-authoritative,
  invariant #2). The AI never grades — it may *render/explain* an item, but the `answer` key in YAML
  is the truth. This keeps quizzes CI-safe (no AI needed to grade).
- Proposed service surface (data-driven, no engine change):
  `UniversityService.start_quiz(course_key)` → draws `quiz.draw` items (server picks indices, withholds
  answers from the payload), `submit_quiz(course_key, answers[])` → scores against the bank, compares to
  `pass_threshold`, records the attempt, and — if `gate: required` — feeds the completion check in
  `complete_course` alongside the existing time+practical gates.
- The AI lecturer (UNI-A09) consumes the quiz only for **presentation** (rephrasing a prompt at the
  requested reading `level`, generating an `explain` walkthrough). The authoritative `answer`/`explain`
  remain in data so the experience degrades gracefully to the mock.
- `LectureReport.quiz_question` (already in the schema) becomes a *teaser* drawn from the bank rather
  than an AI-invented question — tightening the loop between authored quiz and lecture.

**Servability filter:** the service must only surface `status: published` (non-deprecated) courses in
`catalog()`/`transcript()`. Today it surfaces all courses; this spec adds a `status` filter as a small,
back-compatible service change (default `published` when key absent, so the current file is unaffected).

---

## 8. Localization & readability (⬜ proposed layer)

Authored content is English source-of-truth. Localization is an **overlay**, never a fork of structure:

- **Structure stays in `curriculum.yaml`** (keys, perks, practicals, quiz answer indices — language-neutral).
- **Translatable strings** (`name`, `lecture.topic`, `objectives`, `quiz.bank[].prompt`/`choices`/`explain`)
  are extracted by key path into per-locale overlay files: `data/curriculum.<locale>.yaml`
  (e.g. `curriculum.es.yaml`), each pinned to the source `content_version`.
- The service loads the base file, then deep-merges the active-locale overlay (locale chosen by config,
  mirroring the swappable-provider pattern). Missing translation = fall back to English (graceful).
- **Readability:** each lecture carries `readability_target` (e.g. `grade-10`). The validator warns when
  source prose exceeds the band (Flesch-Kincaid, stdlib-computable). The real professor is *instructed*
  via the level context to hit the band; the mock is already plain.
- **Localization QA gate:** a translated overlay must (a) cover every translatable key for its courses,
  (b) match the pinned `content_version`, (c) preserve `answer` indices and `choices` order (the
  validator cross-checks counts so a reordered translation can't silently mis-key a quiz).

This keeps localization data-driven and version-safe: add a department in 3 languages = 1 base entry + 2
overlay entries, zero code.

---

## 9. Scaling to many departments without code changes (✅ schema supports / ⬜ tooling needed)

The data-driven invariant is already largely honored — adding a department is `departments:` +
`courses:` + `degrees:` rows. To make that *safe at scale*, this pipeline adds the tooling, not new code paths:

1. **Closed vocabularies are the only coupling to code:** `practical.type` (8 values) and `perks` keys
   (`_EFFECT_KEYS`). The validator enforces both, so a new department can never silently introduce an
   unhandled practical or a no-op perk. A genuinely new practical type or effect key is the *only* thing
   that escalates from "author content" to "ship code" — and the validator's hard-fail makes that boundary explicit.
2. **Per-department research-pack intake (§2)** means a new department is a batch of research packs → authored
   fragments → validated → reviewed, an assembly line repeatable by any author (human or AI-assisted).
3. **CI lint gate (`make lint`)** guarantees the file is always shippable; a broken contribution fails the
   build, not production.
4. **Degree tiers extend by data:** the planned Doctorate capstone (06-university.md §51) is a new
   `degrees:` row with a `tier: doctorate` and `required_courses`, plus (optionally) a `balance.yaml`
   `university:` knob for any new XP/economy value — tuning surface, not code.

**Required new tooling (proposals, all stdlib/PyYAML, CI-friendly):**
- `scripts/check_curriculum.py` — the §4 validator. (⬜)
- `tests/test_curriculum.py` — asserts the shipped file passes the validator + renders under the mock. (⬜)
- A `make lint` / CI hook wiring the validator in (mirror how `check_memory.py` is wired). (⬜)
- (Optional) a `scripts/author_course.py` scaffolder that turns a research-pack (§2) into a draft course
  stub with `status: draft`, ready for human authoring. (⬜)

---

## 10. Cross-agent dependencies

- **UNI-A01 / A02 / A03 (research):** must emit the §2 **research-pack** format (objectives + citations +
  quiz seeds + confidence). That is the intake contract this pipeline depends on.
- **UNI-A09 (AI lecturer):** consumes the §7 lecture+quiz contract; must treat authored `answer`/`explain`
  as truth and only present/rephrase. Coordinate the quiz-presentation context keys.
- **UNI-A00 (lead):** owns G3/G4 review gates and the §6 product decision (advisory vs. required quizzes).
- **Economy/balance owners:** the `university:` block in `balance.yaml` is where any new XP/tuition knobs land
  (e.g. `quiz_xp`); perks must stay within budget and never add a GROW faucet.
- **Whoever owns `university_service.py`:** the two small, back-compatible service changes this spec implies —
  a `status: published` servability filter, and (if quizzes ship `required`) the quiz gate in
  `complete_course` — plus loading optional locale overlays.

---

## 11. Honest status summary

| Capability | Status |
|---|---|
| Course/degree/department schema (base) | ✅ shipped (`curriculum.yaml`) |
| Lecture authoring + AI/mock rendering | ✅ shipped (`lecturer_service.py`, `ai/lecturer_mock.py`) |
| Economic knobs data-driven | ✅ (`balance.yaml` `university:`) |
| Research-pack intake format | ⬜ proposed (§2) |
| Extended schema: provenance/version/status | 🔨 additive extension of live schema (§3) |
| Quiz banks + server-side grading | ⬜ proposed (§3, §7); planned in 06-university.md §53 |
| Curriculum validator + CI lint | ⬜ proposed (§4, §9) |
| Versioning convention | ⬜ proposed (§5) |
| Review/QA gates (G1-G4) | ⬜ proposed (§6) |
| Localization/readability overlay | ⬜ proposed (§8) |
| Multi-department scale (data-only) | ✅ schema supports / ⬜ tooling to make it safe |
