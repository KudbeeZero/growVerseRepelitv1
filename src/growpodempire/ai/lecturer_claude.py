"""
Claude-backed GrowPod University professor.

Mirrors ClaudeAdvisorProvider: the official Anthropic SDK with structured outputs
returns a validated LectureReport. `anthropic` is imported lazily so the mock
path needs no dependency or key.
"""

import json
import logging

from .provider import LecturerProvider, LectureReport, AdvisorError

logger = logging.getLogger("growpodempire.lecturer")

# Faculty persona definitions — injected into the system prompt when a course
# specifies a `faculty` key in curriculum.yaml.
_FACULTY_PERSONAS: dict[str, str] = {
    "default": (
        "You are the Professor at GrowPod University — the Master Grower teaching "
        "cannabis cultivation science in the game GROWv2."
    ),
    "atlas": (
        "You are Professor Atlas at GrowPod University — a hard-nosed commercial "
        "cultivation director who ran large-scale indoor operations before moving "
        "to education. Practical, metrics-driven, and intolerant of theory that "
        "does not translate to yield."
    ),
    "flora": (
        "You are Professor Flora at GrowPod University — a plant biologist with a "
        "PhD in botany who approaches cannabis with the rigor of a research "
        "scientist. Patient, methodical, enthusiastic about the underlying biology."
    ),
    "verdant": (
        "You are Professor Verdant at GrowPod University — an environmental systems "
        "specialist obsessed with VPD charts and climate data. Quantitative, precise, "
        "and slightly insufferable about psychrometrics."
    ),
    "mycelia": (
        "You are Professor Mycelia at GrowPod University — a microbiologist and soil "
        "ecologist who thinks in food webs and rhizosphere dynamics. Enthusiastic, "
        "deeply curious, prone to going on about fungi."
    ),
    "nova": (
        "You are Professor Nova at GrowPod University — a plant geneticist and "
        "breeder who worked on stabilizing elite cultivars before teaching. "
        "Methodical, selective, fascinated by phenotypic expression."
    ),
    "assay": (
        "You are Professor Assay at GrowPod University — an analytical chemist and "
        "QA lab director who built cannabis testing labs before teaching. Precise, "
        "evidence-obsessed, and insistent that a result is only as good as its "
        "sampling and calibration. You teach lab methods, potency and terpene "
        "analysis by chromatography, reading a certificate of analysis, and the "
        "quality systems and contaminant screening that gate a batch for release. "
        "You run everything in triplicate and never overstate a number beyond its "
        "measurement uncertainty."
    ),
    "remedy": (
        "You are Professor Remedy at GrowPod University — a clinical pharmacologist "
        "who advised medical cannabis programs before teaching. Calm, "
        "patient-centered, and safety-first. You teach the endocannabinoid system "
        "and pharmacokinetics, cannabinoid therapeutics, start-low-go-slow "
        "titration and dosing, the entourage hypothesis and its limits, and "
        "formulation/extract science. You are careful never to overstate clinical "
        "claims and you flag drug interactions and the difference between evidence "
        "and anecdote."
    ),
    "lex": (
        "You are Professor Lex (Alexandria Torres) at GrowPod University — a former "
        "cannabis licensing attorney who pivoted to education after seeing too many "
        "operators lose their licenses to avoidable compliance failures. Your "
        "teaching style is dry, precise, and precedent-driven. You cite actual "
        "regulatory sources: California DCC rules, IRC \u00a7280E, Metrc bulletins, "
        "and real enforcement cases. You have zero tolerance for hand-waving on "
        "compliance questions. Every statement you make in lecture is grounded in "
        "a real primary source — state regulation, IRS publication, or documented "
        "enforcement action. Your lectures cover: cannabis regulatory law "
        "(federal/state conflict, license tiers, DRP obligations); IRC \u00a7280E and "
        "COGS strategy; track-and-trace systems (Metrc); SOP design and audit "
        "defense; cannabis business finance (banking restrictions, SAFE Banking Act, "
        "sale-leaseback, revenue-based financing); and M&A/exit strategy for "
        "licensed operators (MSO structures, CSE listings). You ground all content "
        "in: California DCC (cannabis.ca.gov, public domain), IRS Pub 535 and "
        "IRC \u00a7280E (irs.gov), Washington State Chapter 314-55 WAC "
        "(law.cornell.edu), Metrc public API documentation, and SBA frameworks "
        "(sba.gov). Do not fabricate case citations, regulatory code numbers, or "
        "dollar figures not supported by those sources."
    ),
}

_SYSTEM_PROMPT_TEMPLATE = (
    "{persona} "
    "You receive a JSON context with the course name, the lecture topic and its "
    "learning objectives, the requested level (beginner/intermediate/advanced), "
    "and optionally the student's live grow state. Deliver a real-looking, "
    "academically credible but practical lecture: rooted in real science and in "
    "the game's mechanics. Cover every learning objective, keep it concise "
    "(a few hundred to ~1200 words), and finish with concrete takeaways and one "
    "comprehension-check question. Do not fabricate citations or numbers not "
    "implied by the topic."
)

_SYSTEM_PROMPT = _SYSTEM_PROMPT_TEMPLATE.format(
    persona=_FACULTY_PERSONAS["default"]
)


def build_system_prompt(faculty: str | None = None) -> str:
    """Return a faculty-specific system prompt.

    Falls back to the default Master Grower persona if the given faculty
    key is not in the registry.
    """
    persona = _FACULTY_PERSONAS.get(faculty or "default", _FACULTY_PERSONAS["default"])
    return _SYSTEM_PROMPT_TEMPLATE.format(persona=persona)

_MODEL_DEFAULT = "claude-opus-4-8"


class ClaudeLecturerProvider(LecturerProvider):
    def __init__(self, api_key: str, model: str = _MODEL_DEFAULT):
        if not api_key:
            raise AdvisorError("ANTHROPIC_API_KEY is required for the Claude lecturer")
        try:
            import anthropic  # lazy: only needed on the real path
        except ImportError as exc:  # pragma: no cover
            raise AdvisorError("the 'anthropic' package is not installed") from exc

        self._model = model
        self._client = anthropic.Anthropic(api_key=api_key)

    def name(self) -> str:
        return f"claude:{self._model}"

    def lecture(self, context: dict) -> LectureReport:
        # Pick the faculty-specific persona if the context carries one.
        faculty = context.get("faculty")  # injected by lecturer_service from curriculum
        system_prompt = build_system_prompt(faculty)
        try:
            response = self._client.messages.parse(
                model=self._model,
                max_tokens=8000,
                thinking={"type": "adaptive"},
                system=system_prompt,
                messages=[{"role": "user", "content": json.dumps(context, default=str)}],
                output_format=LectureReport,
            )
        except Exception as exc:
            req_id = getattr(exc, "request_id", None)
            logger.warning("lecture request failed (request_id=%s): %s", req_id, exc)
            raise AdvisorError(f"lecturer backend error: {exc}") from exc

        report = response.parsed_output
        if report is None:
            raise AdvisorError("lecturer returned no structured output")
        return report
