"""
Deterministic offline quiz provider — the CI/no-key default.

Builds five real-looking multiple-choice questions from the course objectives
with no network or randomness. The questions are intentionally simplistic but
structurally correct so tests can exercise the full quiz flow without an API key.
"""

from .provider import QuizProvider, QuizReport, QuizQuestion


class MockQuizProvider(QuizProvider):
    def name(self) -> str:
        return "mock"

    def generate_quiz(self, context: dict) -> QuizReport:
        course = context.get("course", "GrowPod University")
        course_key = context.get("course_key", "")
        objectives = list(context.get("objectives") or [])
        topic = context.get("topic") or f"Foundations of {course}"

        # Build one question per objective (up to 5), pad with a generic one.
        questions = []
        for i, obj in enumerate(objectives[:5]):
            short = obj.rstrip(".").split(".")[0][:80]
            questions.append(
                QuizQuestion(
                    question=f"Which of the following best describes: '{short}'?",
                    options=[
                        f"Apply {short} to optimize plant outcomes.",
                        "This principle does not apply to cannabis cultivation.",
                        "Only relevant in outdoor grows with direct sunlight.",
                        "Requires expensive lab equipment not available to growers.",
                    ],
                    correct_idx=0,
                    explanation=f"'{short}' is a core concept in {course} that directly improves plant outcomes.",
                )
            )

        # Pad to exactly 5 if fewer objectives.
        while len(questions) < 5:
            idx = len(questions)
            questions.append(
                QuizQuestion(
                    question=f"In the context of {course}, what does the following topic address? '{topic[:60]}'",
                    options=[
                        "The environmental and biological interactions that drive plant health.",
                        "Off-chain token settlement for harvest payouts.",
                        "Decorative grow-room aesthetics unrelated to yield.",
                        "Soil pH levels in hydroponic systems only.",
                    ],
                    correct_idx=0,
                    explanation=(
                        f"{course} grounds all concepts in plant biology "
                        "and practical grow outcomes, not aesthetics or token mechanics."
                    ),
                )
            )

        return QuizReport(
            course_key=course_key,
            provider=self.name(),
            questions=questions[:5],
        )
