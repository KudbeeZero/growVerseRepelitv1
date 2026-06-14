# UNI-A09 — GrowPod University: AI Tutor Systems
**Directive ID:** UNI-001 · **Lead Agent:** UNI-A00 · **Worker Agent:** UNI-A09
**Asked:** Design the AI tutor/professor system beyond today's one-shot lecture — pedagogy & persona, KB-grounded lectures, quiz generation + deterministic grading, adaptive/Socratic tutoring, feedback on the player's real grow, hallucination/safety guardrails, structured outputs, the Mock-vs-real split, and SpendGuard cost control.
**Done:** A full AI-tutor design that **extends** the shipped `LecturerProvider` stack (one-shot lecture) into a multi-capability faculty system. Every capability has a deterministic mock path so CI never needs a live key; quizzes are authored-in-data and graded deterministically; the real provider is Claude (Opus 4.8 default) behind the existing ABC seam.
**Risks:**
- Adaptive/Socratic Q&A is a *generative* surface (free-form student input) — the biggest hallucination/safety exposure; mock path must be a real fallback, not a stub.
- Quiz *generation* by Claude vs quiz *authoring* in `curriculum.yaml`: grading must stay deterministic regardless of who wrote the question (DB authoritative).
- SpendGuard for tutoring is a new faucet of cost (not GROW) — per-player/day token budgets needed or a Q&A loop can run unbounded.
- Persona depth must not let "voice" override "real science" — the honesty invariant (`04-honesty-and-trust.md`) outranks flavor.
**Needs You:** nothing — research only; build sequencing is a Lead/BACKLOG call.
**Next:** Hand to UNI-A00 to slot into `docs/memory/design/06-university.md §Where it's going ⬜` and `BACKLOG.md`. Depends on UNI-A02 (science KB) and UNI-A08 (content pipeline) — see cross-agent deps at the end.

---

## 0. Scope & what already exists (don't rebuild)

The university already ships an **AI Professor** as a *one-shot lecturer*. This design **extends**, it does not duplicate. Verified repo state:

| Piece | Path | State |
|---|---|---|
| Provider ABC + report schema | `src/growpodempire/ai/provider.py` (`LecturerProvider`, `LectureReport`) | ✅ shipped |
| Deterministic mock | `src/growpodempire/ai/lecturer_mock.py` (`MockLecturerProvider`) | ✅ shipped |
| Real Claude provider | `src/growpodempire/ai/lecturer_claude.py` (`ClaudeLecturerProvider`) | ✅ shipped |
| Factory / selection | `src/growpodempire/ai/factory.py` (`get_lecturer_provider`, `shared_lecturer`, `reset_shared_lecturer`) | ✅ shipped |
| Service | `src/growpodempire/services/lecturer_service.py` (`LecturerService.teach`) | ✅ shipped |
| Curriculum data | `src/growpodempire/data/curriculum.yaml` (departments, courses, `lecture`, `practical`, `perks`) | ✅ shipped |
| Strain KB | `src/growpodempire/data/strain_knowledge.yaml` | ✅ shipped (UNI-A02 owns deepening it) |
| SpendGuard precedent | `src/growpodempire/services/autocare_service.py` (`_SpendGuard`), `src/growpodempire/ai/autocare.py` (`AutoCareBudget`) | ✅ shipped |
| FTUE scripted-advisor precedent | `src/growpodempire/ai/ftue_coach.py` (`FTUECoachProvider`) | ✅ shipped |

Key facts the existing code establishes (these are the **conventions to follow**, per `CLAUDE.md`):
- The real provider uses the Anthropic SDK with **structured outputs** (`messages.parse(..., output_format=LectureReport)`) and `thinking={"type":"adaptive"}`, model default `claude-opus-4-8` (`ai/lecturer_claude.py:30,48-57`). `anthropic` is imported **lazily** so the mock path needs no dependency or key.
- The factory returns the mock when `settings.use_mock_ai or not settings.anthropic_api_key` (`ai/factory.py:50-52`) — **CI is mock by construction**, matching `config.py:110-112`.
- Lecture context today is `{course, department, topic, objectives, level, student_plant?}` (`lecturer_service.py:44-61`).
- `LectureReport` already carries a `quiz_question: str` field (`provider.py:82`) but there is **no grading** — the planned "knowledge quizzes (authored in curriculum data, deterministically graded)" is explicitly ⬜ in `06-university.md:53`.

> Model note: when these capabilities are built, the default is the latest Claude (Opus 4.8, `claude-opus-4-8`) — the same string already wired at `ai/lecturer_claude.py:30`. Adaptive thinking, structured outputs, lazy import, SpendGuard, mock-in-CI all carry forward unchanged.

---

## 1. The five tutor capabilities (the target system)

Today = capability **(1)** only. This design adds **(2)–(5)**.

1. **Lecture** — KB-grounded course lecture. *(shipped)*
2. **Quiz** — generate + **deterministically grade** a comprehension quiz tied to a course. *(⬜, the next build)*
3. **Tutor Q&A** — adaptive/Socratic dialogue: the student asks, the professor answers (or asks back), grounded in the course + KB.
4. **Grow Feedback** — the professor reads the player's *real* plant/grow telemetry and teaches from it ("your VPD ran high in week 3, here's why your yield slipped").
5. **Persona** — named faculty with course-specific voices, layered over (1)–(4) **without** weakening the honesty invariant.

Each gets: an ABC method (or a sibling provider), a `Mock*` deterministic path, a `Claude*` real path, a service method, an API route, and a SpendGuard where it spends tokens. The pattern is **exactly** the lecturer stack — copy its shape.

---

## 2. Pedagogy & persona

### 2.1 Named faculty (data, not code)
Persona is a **tuning surface**, so it lives in data — extend `curriculum.yaml` with a `faculty:` block and a per-course `professor:` key, mirroring how `lecture`/`practical`/`perks` already hang off a course. Example shape (extends, doesn't replace, the shipped course schema):

```yaml
faculty:
  prof_chen:
    name: "Dr. Mara Chen"
    title: "Professor of Cultivation Science"
    department: cultivation
    voice: "rigorous, hands-on, leads from the canopy; cites VPD/DLI by the numbers"
  prof_okafor:
    name: "Dr. Tunde Okafor"
    title: "Professor of Plant Genetics"
    department: genetics
    voice: "Mendelian-precise, loves a Punnett square, careful about lineage-as-lore"
courses:
  cult-201:
    professor: prof_chen   # NEW key; everything else unchanged
    # ...existing: name, department, credits, lecture, practical, perks
```

The `voice` string is injected into the system prompt's persona slot. **Persona is flavor only** — it changes tone, never facts. The honesty rules (§5) are appended *after* the persona block so they always win.

### 2.2 Pedagogical frame
The tutor follows a light, well-understood loop the model can execute:
- **Lecture** → objectives-first, first-principles, ground theory in the student's own plant when `plant_id` is supplied (already done at `lecturer_service.py:52-61`).
- **Check** → quiz (§3) is the deterministic proof of comprehension; the `practical` (already shipped) remains the proof of *application*. Two gates, two different things.
- **Tutor** → Socratic by default for "why" questions (answer with a guiding question + the principle), direct for "how/what" lookups. Difficulty adapts to the requested `level` (beginner/intermediate/advanced — already a context field) and to recent quiz scores (§3.4).
- **Feedback** → personalized from real grow data (§4): the most motivating teaching surface because it's *their* plant.

---

## 3. Quiz generation + deterministic grading

This is the headline new capability and the one with the strongest invariant pressure (**DB is authoritative; grading must be replayable**).

### 3.1 Two quiz sources, one grader
- **Authored quizzes (primary, CI-safe):** questions live in `curriculum.yaml` under the course. Deterministic, versioned, reviewable, free. This is the default and the only path CI exercises.
- **Generated quizzes (real provider, optional):** Claude generates *fresh* questions grounded in the course + KB for replay value. **Generation is the only AI step. Grading is never AI.** A generated quiz is persisted (question + correct answer + rationale) at generation time, then graded by the same deterministic grader as an authored quiz.

Authoring shape (extends the course; `quiz_question: str` on `LectureReport` stays as a teaser, the real bank is structured):

```yaml
courses:
  gen-101:
    quiz:
      pass_threshold: 0.7          # fraction correct to pass
      questions:
        - id: gen101-q1
          type: mcq                # mcq | true_false | numeric
          prompt: "A cross of two heterozygous (Pp) plants yields what genotype ratio?"
          choices: ["1:2:1", "3:1", "1:1", "all Pp"]
          answer_index: 0
          rationale: "Monohybrid cross of Pp × Pp → 1 PP : 2 Pp : 1 pp."
          kb_ref: "02-genetics.md#mendelian"   # provenance for honesty/audit
```

### 3.2 Schemas (Pydantic, mirrors `LectureReport`)
Add to `ai/provider.py`:

```python
QuestionType = Literal["mcq", "true_false", "numeric"]

class QuizQuestion(BaseModel):
    id: str
    type: QuestionType
    prompt: str
    choices: List[str] = Field(default_factory=list)   # mcq only
    answer_index: int | None = None                    # mcq/true_false
    answer_numeric: float | None = None                # numeric
    tolerance: float = 0.0                              # numeric grading band
    rationale: str = Field(description="Why the answer is correct; shown after grading.")
    kb_ref: str = ""                                    # provenance

class Quiz(BaseModel):
    course_key: str
    pass_threshold: float = 0.7
    questions: List[QuizQuestion]

class QuizResult(BaseModel):
    score: float                 # 0..1
    passed: bool
    per_question: List[dict]     # {id, correct: bool, given, expected, rationale}
```

### 3.3 The grader is pure Python (no model in the loop)

```python
def grade_quiz(quiz: Quiz, answers: dict[str, object]) -> QuizResult:
    rows, correct = [], 0
    for q in quiz.questions:
        given = answers.get(q.id)
        if q.type in ("mcq", "true_false"):
            ok = (given == q.answer_index)
        else:  # numeric
            ok = given is not None and abs(float(given) - q.answer_numeric) <= q.tolerance
        correct += int(ok)
        rows.append({"id": q.id, "correct": ok, "given": given,
                     "expected": q.answer_index if q.answer_index is not None else q.answer_numeric,
                     "rationale": q.rationale})
    score = correct / len(quiz.questions)
    return QuizResult(score=score, passed=score >= quiz.pass_threshold, per_question=rows)
```

Properties this guarantees (the reason it's pure):
- **Deterministic & replayable** — same answers → same score, forever. Fits the "deterministic seeded sim / replay-and-verify" trust pledge (`04-honesty-and-trust.md`).
- **CI-safe** — no key, no network, no `anthropic` import. The whole quiz *grading* test suite runs under the mock world.
- **Generation-agnostic** — whether the question came from `curriculum.yaml` or from Claude, grading is identical. A generated `Quiz` is persisted so the grader has the canonical answer key (DB authoritative — the model's output is a *mirror*, exactly like the chain/DB rule).

### 3.4 Where quiz fits the course gate
Quizzes are **additive** to the shipped completion logic, never a replacement. `university_service.complete_course` today requires time-elapsed **AND** practical-met (`06-university.md:24-27`). Option for the Lead: add an optional `quiz_passed` gate per course (data-flagged), so a course can require lecture-comprehension *and* hands-on practical. Recent quiz scores also feed tutor difficulty (§2.2) — store the best score on the enrollment row (DB authoritative).

### 3.5 Generation provider (real path only)
`QuizProvider.generate(context) -> Quiz` with:
- `MockQuizProvider` → returns the **authored** quiz from `curriculum.yaml` verbatim (deterministic; this is the CI path and also the no-key prod fallback).
- `ClaudeQuizProvider` → `messages.parse(..., output_format=Quiz)`, system prompt = "generate N gradeable questions grounded ONLY in the supplied objectives + KB excerpt; every question must have an unambiguous answer and a rationale; do not invent facts." Persist the returned `Quiz` immediately; grade later with the pure grader.

---

## 4. Tutor Q&A + grow-data feedback

### 4.1 Tutor Q&A (capability 3)
`TutorProvider.answer(context) -> TutorReply`. Context = `{course, objectives, level, history[], student_question, kb_excerpt}`. `TutorReply` is structured:

```python
class TutorReply(BaseModel):
    answer: str
    socratic_prompt: str = ""          # a guiding question back to the student (may be empty)
    confidence: Literal["high", "medium", "low"]
    grounded_in: List[str] = Field(default_factory=list)  # KB refs cited
    off_syllabus: bool = False         # flagged if the question left the course's scope
```

- **`MockTutorProvider`** — deterministic, scripted-by-intent, exactly like `FTUECoachProvider` (`ai/ftue_coach.py`) speaks scripted `AdvisorReport`s through the real schema. It keys off the course + a coarse question classifier (keyword match on objectives) and returns a canned-but-real answer plus "for the full discussion, ask during office hours" when it can't match. This is a **real fallback**, not a stub: a no-key prod deployment still answers, just without free-form depth. CI uses it.
- **`ClaudeTutorProvider`** — `messages.parse(..., output_format=TutorReply)`, adaptive thinking. System prompt enforces: answer only from objectives + KB excerpt; if the question is outside scope set `off_syllabus=True` and decline to speculate; state `confidence`; never fabricate numbers/citations (§5).

Multi-turn: `history[]` carries prior turns. Cache the stable prefix (system prompt + course/KB context) and put the volatile `student_question` last — this is the prompt-caching prefix discipline (frozen system prompt, volatile content last) and keeps Q&A cheap across a session.

### 4.2 Grow-data feedback (capability 4)
This is where the tutor reads the **player's real simulation state** — the same telemetry the Master Grower advisor already consumes. The advisor's context builder (`advisor_service` → plant stage, health, water/nutrient/pest/disease, genome summary, environment, recent events) is the proven source; the tutor **reuses it read-only**. The difference is intent: the advisor says *do X now*; the tutor says *here's the principle your plant just demonstrated*.

`GrowFeedbackProvider.review(context) -> GrowLesson`:

```python
class GrowLesson(BaseModel):
    headline: str                      # "Your week-3 VPD ran high"
    what_happened: str                 # grounded in the telemetry numbers
    the_principle: str                 # the teachable science
    next_time: List[str]               # concrete, actionable
    severity: Literal["praise", "minor", "notable"]
```

- **`MockGrowFeedbackProvider`** — deterministic rules over the telemetry (e.g. "if a logged VPD event exceeded band → emit the VPD lesson"). Same spirit as `MockAutoCareProvider`'s rule loop. CI-safe, no key.
- **`ClaudeGrowFeedbackProvider`** — `messages.parse(..., output_format=GrowLesson)`. System prompt: "ground EVERY statement in the numbers provided; do not invent yields, prices, or events not present" — this is the *exact* honesty clause already in the shipped advisor system prompt (`ai/claude.py:30-33`). Reuse it verbatim.

> Invariant: this is **compute-on-read of pure sim state → teach**; no player-economy logic in the engine, all of it in `services/` (`CLAUDE.md`).

---

## 5. Hallucination / safety guardrails (must teach REAL science)

The honesty invariant (`04-honesty-and-trust.md §3` "an honest AI Master Grower") is the controlling constraint. The professor must teach **real horticultural science** and must not fabricate. Layered defenses, strongest first:

1. **Ground in the KB, not the model's memory.** Lectures/quizzes/tutoring receive a **KB excerpt** (from UNI-A02's `strain_knowledge.yaml` + the agronomy reference) in the context, and the system prompt says "answer from the supplied material; do not introduce facts not implied by it." The shipped lecturer prompt already says "Do not fabricate citations or numbers not implied by the topic" (`ai/lecturer_claude.py:26-27`) — generalize that to every capability.
2. **Structured outputs as a schema fence.** Every capability returns a validated Pydantic object (`messages.parse`). The model can't ramble into an un-parseable shape; `confidence`/`grounded_in`/`off_syllabus`/`kb_ref` fields force it to *self-tag* provenance and certainty — the codex's "tags its own advice the way this codex tags capabilities" idea (`04-honesty-and-trust.md:45`), made real per-reply.
3. **Calibrated confidence + admit-uncertainty.** `TutorReply.confidence` and `off_syllabus` are first-class. Low confidence / off-syllabus → the UI shows the hedge instead of a confident-looking wrong answer. This is the trust *product surface*, not just an internal value.
4. **Deterministic grading is fabrication-proof by construction** (§3.3) — the one place a wrong "fact" would most hurt (marking a right answer wrong) has no model in the loop.
5. **The KB caveats travel into the prompt.** `strain_knowledge.yaml` already carries scientific caveats (strain names are weak chemotype IDs; THC figures inflation-biased; lineage is lore not verified genetics — `data/strain_knowledge.yaml` header). The tutor must *teach those caveats*, not paper over them — so the relevant caveat lines are included in the KB excerpt. Teaching the uncertainty honestly is the moat, not a bug.
6. **No safety-sensitive drift.** Persona (§2.1) is appended *before* the honesty block in the system prompt so honesty rules always have the last word; voice can never instruct the model to "be confident" past the evidence.

CI note: none of these guardrails require a live model to *test*. The mocks return correctly-shaped, honestly-tagged objects, so the API/serialization/guardrail-plumbing tests are fully exercised under the mock world.

---

## 6. Provider split, factory, and CI safety

Follow the shipped pattern verbatim (`ai/factory.py`). Each new capability gets a selector that returns the mock unless a key is configured and mock isn't forced:

```python
def get_quiz_provider(settings=None) -> QuizProvider:
    settings = settings or get_settings()
    if settings.use_mock_ai or not settings.anthropic_api_key:
        return MockQuizProvider()
    from .quiz_claude import ClaudeQuizProvider          # lazy import — mock users never need anthropic
    return ClaudeQuizProvider(api_key=settings.anthropic_api_key, model=settings.advisor_model)
# + shared_quiz()/reset_shared_quiz() singletons, same as shared_lecturer()
```

Identical for `get_tutor_provider` / `get_grow_feedback_provider`. Selection rule is the **same one CI relies on today** (`factory.py:50-52`, `config.py:110-112`): no key or `USE_MOCK_AI` → mock. **CI must never require a live key** (`CLAUDE.md`) — this construction guarantees it.

Suggested files (mirrors existing `lecturer_*`):
```
ai/quiz.py            quiz_mock.py / quiz_claude.py     (or fold mock into quiz.py like autocare.py)
ai/tutor.py           tutor_mock.py / tutor_claude.py
ai/grow_feedback.py   ...mock / ...claude
services/tutor_service.py   # quiz/tutor/feedback orchestration + SpendGuard + context build
```
Config: reuse `settings.advisor_model` (already `claude-opus-4-8`, `config.py:111`) — one model knob for the whole AI surface keeps the "versioned against the Claude model line" story (`04-honesty-and-trust.md §co-evolution`) coherent.

---

## 7. Cost / SpendGuard

Lectures and one-shot quizzes are bounded (one call). **Tutor Q&A is the unbounded surface** — a student can ask forever. Port the shipped SpendGuard idea (`services/autocare_service.py:_SpendGuard`, `ai/autocare.py:AutoCareBudget` — caps total spend + action count) from *GROW* to *tokens/calls*:

- **`TutorBudget(max_questions_per_day, max_tokens_per_day)`** per player. The service checks the budget before each Claude call and refuses (gracefully, with a "you've reached today's office-hours limit" message via the mock provider) when exceeded. Server-authoritative — the loop can never spend past the cap, same guarantee the auto-care SpendGuard gives for GROW.
- **Cost ≠ GROW faucet.** Tutoring spends *real money* (API tokens), not in-game GROW, so it does **not** touch the ledger and does **not** affect the faucet/sink balance. But it *is* a real operating cost, so the budget exists to bound it.
- **Cheap-by-design:** prompt-cache the stable course/KB/persona prefix (frozen, cacheable) and send only the volatile question last (§4.1). Quiz *grading* and the mock paths cost $0. A no-key/over-budget player always still gets the deterministic mock — the feature degrades, never breaks.
- **Adaptive effort:** simple "what/how" lookups can run at lower effort; "why"/Socratic at default. (Effort is a per-call tradeoff; note the call and move on — `CLAUDE.md` delegation charter.)

Optional gating idea for the Lead: tie a daily tutor allowance to enrollment/degree tier so heavier AI access is *earned* (fits the "earned-mastery" ethos of `06-university.md`) and caps cost by population.

---

## 8. Consuming UNI-A08 (content pipeline) & UNI-A02 (science KB)

- **UNI-A02 (science KB)** is the **grounding source** for guardrail #1. Whatever structured agronomy/genetics KB A02 produces (deepening `strain_knowledge.yaml` + the agronomy reference) is what the tutor's `kb_excerpt` is built from. The tutor needs A02 to expose KB content **keyed by course/topic** (so the service can fetch the right excerpt per course) and to carry the **scientific caveats** inline (guardrail #5). *Dependency: a topic→KB lookup the tutor service can call.*
- **UNI-A08 (content pipeline)** is the **authoring source** for lectures and authored quizzes. If A08 produces/validates `curriculum.yaml` lecture topics, objectives, and the new `quiz:`/`faculty:`/`professor:` blocks, the tutor consumes them directly (the service already loads `curriculum.yaml` via `university_service.load_curriculum`). The tutor design's data shapes (§2.1, §3.1) are the **contract** A08 should emit. *Dependency: A08's pipeline must output the `quiz`/`faculty` schema this doc defines (or hand A00 a reconciled schema).*

Neither dependency blocks the **deterministic** half of this system: authored quizzes + mock providers can ship against today's `curriculum.yaml` and `strain_knowledge.yaml`. The A02/A08 outputs *upgrade* depth, they don't gate CI.

---

## 9. API surface (extends the shipped university routes)

Public reads stay public, mutations stay API-key'd + rate-limited (`CLAUDE.md`). Mirrors the shipped `GET .../courses/<key>/lecture`:

```
GET  /university/courses/<key>/quiz                 # fetch quiz (authored, or generate if real provider on)
POST /players/<id>/courses/<key>/quiz/submit        # body: answers{}; deterministic grade → QuizResult  (authed)
POST /players/<id>/courses/<key>/tutor              # body: question, history → TutorReply               (authed, SpendGuard)
GET  /players/<id>/plants/<plant_id>/grow-feedback  # GrowLesson from real telemetry                      (authed, SpendGuard)
GET  /university/faculty                             # named faculty roster (public)
```

`quiz/submit` is the load-bearing one: it grades **server-side** with the pure grader (§3.3) and writes the score to the DB (authoritative). The client never grades.

---

## 10. Build sequencing (suggested — Lead/BACKLOG decides)

1. **Quiz authoring + deterministic grading** (`Quiz`/`QuizResult` schemas, `grade_quiz`, `curriculum.yaml` `quiz:` blocks, submit route, score persistence). All mock/pure — no key, ships against today's data. Highest value, lowest risk, directly closes a ⬜ in `06-university.md:53`.
2. **Named faculty / persona** (`faculty:` + `professor:` data, persona slot in the lecturer system prompt). Pure data + a prompt tweak; closes another ⬜ (`06-university.md:55`).
3. **Tutor Q&A** (`TutorProvider` + mock + Claude, SpendGuard, route). The generative surface — most guardrail care.
4. **Grow feedback** (`GrowFeedbackProvider`, reusing the advisor context builder).
5. **Generated quizzes** (`ClaudeQuizProvider`) — last, because authored quizzes already deliver the gameplay; generation is replay-value polish.

Every step: deterministic mock first (CI green), Claude provider behind the same ABC, a test per capability (schema/grader/guardrail-plumbing under the mock world), and a one-line note for any small tradeoff taken.

---

## 11. Invariants honored (checklist)
- **CI-safe AI** — mock when no key / `USE_MOCK_AI`; every capability has a deterministic mock; no live key in CI. *(`factory.py` pattern; `CLAUDE.md`)*
- **DB authoritative** — quiz answer keys + scores persisted; the model's quiz generation is a *mirror*, grading is pure. *(`CLAUDE.md`)*
- **Deterministic & replayable** — `grade_quiz` is referentially transparent; same answers → same score. *(`04-honesty-and-trust.md` trust pledge)*
- **Pure engine / layered services** — grow-feedback reads pure sim state; all tutor/economy logic lives in `services/`. *(`CLAUDE.md`)*
- **Money discipline untouched** — tutoring spends API tokens, not GROW; no ledger entries, no faucet/sink impact. *(`CLAUDE.md`)*
- **Honesty as a feature** — KB-grounding + structured self-tagged confidence + admit-uncertainty + teach-the-caveats. *(`04-honesty-and-trust.md §3`)*
- **Providers behind ABCs** — Claude is one swappable provider (Opus 4.8 default), selectable by config. *(`CLAUDE.md`)*

## Cross-links
- Extends: `docs/memory/design/06-university.md §Where it's going ⬜` (quizzes, persona depth).
- Honesty contract: `docs/memory/design/04-honesty-and-trust.md §3`, §"co-evolution with the model line".
- Code seams to copy: `ai/provider.py`, `ai/lecturer_claude.py`, `ai/factory.py`, `ai/ftue_coach.py`, `services/autocare_service.py` (SpendGuard), `services/lecturer_service.py`.
- Sibling research: `docs/research/university/UNI-A01-curriculum-architecture.md`, `UNI-A06-monetization-backlog.md`.
