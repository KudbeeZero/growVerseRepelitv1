"""
Claude-backed GrowPod University quiz generator.

Mirrors ClaudeLecturerProvider: structured outputs return a validated QuizReport
with exactly 5 multiple-choice questions grounded in the course objectives and
real horticultural science.
"""

import json
import logging

from .provider import QuizProvider, QuizReport, AdvisorError

logger = logging.getLogger("growpodempire.quiz")

_SYSTEM_PROMPT = (
    "You are the Professor at GrowPod University — the Master Grower generating "
    "a five-question multiple-choice quiz for a cannabis cultivation science course "
    "in the game GROWv2. You receive a JSON context with the course name, the "
    "lecture topic and its learning objectives, and the requested level. "
    "Generate EXACTLY 5 questions, each with EXACTLY 4 answer options and one "
    "correct answer (correct_idx 0–3). Questions must be grounded in real "
    "horticultural science and the game's mechanics. One correct answer should be "
    "clearly right; the three distractors should be plausible but wrong. Include a "
    "one-sentence explanation for each correct answer. Do NOT fabricate citations."
)

_MODEL_DEFAULT = "claude-opus-4-8"


class ClaudeQuizProvider(QuizProvider):
    def __init__(self, api_key: str, model: str = _MODEL_DEFAULT):
        if not api_key:
            raise AdvisorError("ANTHROPIC_API_KEY is required for the Claude quiz provider")
        try:
            import anthropic
        except ImportError as exc:  # pragma: no cover
            raise AdvisorError("the 'anthropic' package is not installed") from exc

        self._model = model
        self._client = anthropic.Anthropic(api_key=api_key)

    def name(self) -> str:
        return f"claude:{self._model}"

    def generate_quiz(self, context: dict) -> QuizReport:
        try:
            response = self._client.messages.parse(
                model=self._model,
                max_tokens=4000,
                thinking={"type": "adaptive"},
                system=_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": json.dumps(context, default=str)}],
                output_format=QuizReport,
            )
        except Exception as exc:
            req_id = getattr(exc, "request_id", None)
            logger.warning("quiz generation failed (request_id=%s): %s", req_id, exc)
            raise AdvisorError(f"quiz backend error: {exc}") from exc

        report = response.parsed_output
        if report is None:
            raise AdvisorError("quiz provider returned no structured output")
        return report
