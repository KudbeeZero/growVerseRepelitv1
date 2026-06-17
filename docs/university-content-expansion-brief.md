# GrowPod University — Content Expansion Brief & Build Prompt

> A ready-to-run build brief for lifting the **university content expansion** freeze
> (Phase-2 content layer, specced in `docs/memory/design/07-university-phase-2.md`).
> This document captures the plan, the decisions made, and the exact prompt to hand a
> local Claude Code agent so it executes the work end-to-end on a developer machine.

## What's already shipped (reuse, do not rebuild)
- **Curriculum data:** `src/growpodempire/data/curriculum.yaml` — 6 departments, 14 courses,
  5 degrees (Certificate → Associate → Bachelor → Master).
- **AI Professor (real):** `src/growpodempire/ai/lecturer_claude.py` (`_SYSTEM_PROMPT`,
  `ClaudeLecturerProvider.lecture()`).
- **CI-safe mock:** `src/growpodempire/ai/lecturer_mock.py` (deterministic, no key).
- **Context assembly:** `src/growpodempire/services/lecturer_service.py` — `teach()` builds the
  `context` dict both providers receive.
- **Provider selection:** `src/growpodempire/ai/factory.py` — `get_lecturer_provider` returns
  the mock when `use_mock_ai` or no `anthropic_api_key`. **Never require a live key in CI.**
- **Web UI:** catalog · course detail + lecture reader · transcript under `web/src/app/university/`.

## The gap
A course today is: enroll → wait real hours → meet a practical → get one AI lecture paragraph.
There is no lesson body, no modules, no quizzes, no narration, no named faculty, and only the
original 6 departments. Phase-2 closes that gap (modules, knowledge checks, faculty personas,
source-grounded lectures, audio scaffold, 3 new departments + a Doctorate tier).

## Decisions locked
- **Source PDFs (Cervantes eBook, MIT OCW, Grodan, Grow Bible, Bud Grower): gitignored, owner
  drops them in.** Nothing copyrighted ever enters git. The pipeline is wired and tested even
  before any PDF exists; it degrades to valid-empty output until the owner adds sources.
- **Licensing caveat (owner's call):** MIT OCW is CC-BY-NC-SA (non-commercial) and the grow
  PDFs are copyrighted. They are used only as **private model grounding** — the Professor
  synthesizes, never reproduces pages. Verbatim redistribution to players is a legal decision
  the owner must make before any of this goes player-facing.
- **CI-safe AI is non-negotiable.** Every new AI path needs a deterministic mock branch.
- **ElevenLabs audio: scaffold only** (a `NarrationProvider` ABC + mock + empty manifest);
  real generation is a deferred follow-up phase.
- **Faculty roster pinned to spec:** Flora, Verdant, Mycelia, Atlas, Nova.

## The build prompt (paste into local Claude Code)

```text
You are working in the GROWv2 repo (package `growpodempire`, Flask backend + Next.js `web/`).
Read CLAUDE.md FIRST and obey its invariants. Work on branch
`claude/university-content-expansion-ki6boh` (create it from the current branch if it doesn't
exist locally). Save everything to disk, commit in logical chunks, and at the end push and
open a DRAFT PR. Run `make test`, `make lint`, and `make check-memory` before every commit;
never commit red.

## Mission
Lift the "university content expansion" freeze and turn each course from "wait + one AI
paragraph" into real, source-grounded content — WITHOUT touching the core grow loop and
WITHOUT breaking the CI-safe (no-API-key) path. This is the Phase-2 content layer specced in
`docs/memory/design/07-university-phase-2.md`. Read that file and
`docs/memory/design/06-university.md` before writing any code.

## Ground truth (already shipped — reuse, do not rebuild)
- Curriculum data: `src/growpodempire/data/curriculum.yaml` (6 depts, 14 courses, 5 degrees).
- AI Professor (real): `src/growpodempire/ai/lecturer_claude.py` — see `_SYSTEM_PROMPT` and
  `ClaudeLecturerProvider.lecture()`.
- CI-safe mock: `src/growpodempire/ai/lecturer_mock.py` (MUST stay deterministic, no key).
- Context assembly: `src/growpodempire/services/lecturer_service.py` — `teach()` builds the
  `context` dict both providers receive.
- Provider selection: `src/growpodempire/ai/factory.py` — `get_lecturer_provider` returns the
  mock when `use_mock_ai` or no `anthropic_api_key`. NEVER require a live key in CI.
- Tests: `tests/test_university.py`. Gates: `make test`, `make lint`, `make check-memory`.

## Hard guardrails (do not violate)
1. ADDITIVE ONLY. Verify by reading `services/university_service.py` and `lecturer_service.py`
   that new YAML keys are ignored safely before adding them. Do NOT change degree/practical
   mechanics, prices, faucets, or sinks.
2. CI MUST stay green with NO API key. Every new code path needs a deterministic mock branch.
3. LICENSING — STOP-AND-FLAG. MIT OCW is CC-BY-NC-SA (NON-commercial); the Jorge Cervantes
   eBook, Grow Bible, Grodan, and Bud Grower PDFs are COPYRIGHTED. This is a commercial game,
   so:
     - Source PDFs and raw extracted text MUST NOT be committed. Create a gitignored folder
       `content_sources/` (append it to `.gitignore`) with a tracked `content_sources/README.md`
       listing each source, its URL, and its license.
     - Generated `course_content.json` (Step 1) holds only SHORT factual chunks used as private
       model grounding — never bulk verbatim text shipped to players.
     - The Professor SYNTHESIZES; it may reference a concept, never reproduce pages.
   If the cleanest implementation would require shipping copyrighted text to users, STOP and
   ask. In your final report, flag to the owner that verbatim redistribution of these sources
   is a legal decision they must make before any of this goes player-facing.

## Step 1 — Source-grounding pipeline (gitignored sources)
- Create gitignored `content_sources/` for the owner to drop PDFs into. Do NOT download PDFs
  yourself; leave a tracked `content_sources/README.md` placeholder describing the expected
  sources and their licenses.
- Write `scripts/build_course_content.py` (match the style of existing `scripts/`): reads
  PDFs/text from `content_sources/`, chunks them into short passages, tags each chunk with the
  relevant course key(s), and writes `src/growpodempire/data/course_content.json` (committed,
  small, short factual excerpts only). Idempotent; runnable via
  `python scripts/build_course_content.py`. Degrade gracefully with NO PDFs present (emit
  valid empty JSON, do not crash); prefer stdlib + plain-text fallback over a heavy new dep.
- Add a small loader returning the top few chunks for a course key, defaulting to `[]` when
  the file is missing.

## Step 2 — Make the Professor smarter (real + mock)
- In `lecturer_service.py` `teach()`: add `faculty` (from the course YAML) and
  `source_excerpts` (top chunks from Step 1) to the `context` dict. Both providers get them.
- In `lecturer_claude.py`: expand `_SYSTEM_PROMPT` to (a) adopt the named faculty persona when
  present and (b) ground the lecture in `source_excerpts` as PRIVATE reference material —
  synthesize, never quote. Keep the existing `LectureReport` structured-output shape.
- In `lecturer_mock.py`: deterministically reflect `faculty` and the presence of excerpts so
  tests assert it without a key.

## Step 3 — Additive curriculum content fields (pure YAML)
For each course in `curriculum.yaml`, add optional keys: `faculty:` (one of Flora, Verdant,
Mycelia, Atlas, Nova — map by department), `intro_video:` (placeholder URL the owner fills
later), `modules:` (list of {title, summary, est_minutes}), `quiz_questions:` (list of
{q, choices, answer_index} with authored deterministic answer keys). Respect the honest-hour
rule (spec §3): est_minutes must be real, not padding.

## Step 4 — Three new departments + Doctorate tier (pure YAML, no code change)
Add the three planned departments from the roadmap — Lab Analytics & QA,
Business/Law/Compliance, Pharmacology/Medical — with a few courses each (same schema: credits,
level_req, duration_hours, tuition, prereqs, lecture{topic,objectives}, practical, perks).
Reuse EXISTING effect keys for perks (no new apply path). Add a `doctorate` degree tier whose
`required_courses` chain through the prior degrees' apex courses. Verify
`university_service.py` handles the new tier generically (read it; don't assume).

## Step 5 — ElevenLabs audio: scaffold only, defer generation
Do NOT call ElevenLabs or commit audio. Per spec §11, scaffold only the CI-safe seam: a
`NarrationProvider` ABC with a deterministic mock backend (mirroring `ai/factory.py`) and a
valid empty `data/audio_manifest.json` documenting the required fields (Course ID, Lesson ID,
Voice ID, Language, Version, File Path + script_hash, duration_sec, checksum, status). Leave
real generation as a follow-up; note this in the PR body.

## Tests (add with every change)
- Chunk loader returns `[]` when `course_content.json` is absent.
- `teach()` puts `faculty` + `source_excerpts` in the context; mock reflects them.
- New YAML validates against the curriculum-shape assertions in `tests/test_university.py`
  (extend them for the new departments/degrees/fields); quiz answer keys are well-formed.
- `build_course_content.py` produces valid JSON with no sources present.

## Done =
`make test` green, `make lint` clean, `make check-memory` clean; sources gitignored; PDFs not
committed; ONE draft PR pushed to `claude/university-content-expansion-ki6boh`. End with the
CLAUDE.md end-of-chat report and the licensing flag from guardrail #3.
```

## How to use, once the work lands
1. Drop the source PDFs into `content_sources/` (gitignored).
2. Run `python scripts/build_course_content.py` to generate `course_content.json`.
3. The Professor immediately starts grounding lectures in those sources.
