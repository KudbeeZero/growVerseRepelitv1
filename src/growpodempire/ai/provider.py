"""
Advisor provider interface + the structured report schema.

`AdvisorReport` is a Pydantic model so the real provider can use the Anthropic
SDK's structured-output parsing (`messages.parse`) to get a validated object
back, and the API layer can serialize it directly. The action vocabulary is
constrained to the game's real care actions so suggestions map onto endpoints
the player (or, later, an agentic auto-care loop) can actually call.
"""

from abc import ABC, abstractmethod
from typing import List, Literal

from pydantic import BaseModel, Field


class AdvisorError(Exception):
    """Any failure producing an advisor report (e.g. the AI backend errored)."""


# The care actions the advisor may recommend. These line up 1:1 with the
# SimulationService care methods / API routes (water, feed, treat-pests,
# treat-disease) plus a few non-action recommendations.
CareAction = Literal[
    "water",
    "feed",
    "treat_pests",
    "treat_disease",
    "adjust_environment",
    "harvest",
    "wait",
]

Severity = Literal["healthy", "minor", "serious", "critical"]


class CareSuggestion(BaseModel):
    action: CareAction = Field(description="The recommended care action.")
    urgency: Literal["now", "soon", "optional"] = Field(
        description="How time-sensitive this action is."
    )
    reason: str = Field(description="Why this action helps, grounded in the plant's state.")


class AdvisorReport(BaseModel):
    """A Master Grower's read on a single plant."""

    summary: str = Field(description="One or two sentences a player can act on.")
    severity: Severity = Field(description="Overall health assessment.")
    diagnosis: str = Field(description="What's going on with the plant and why.")
    suggestions: List[CareSuggestion] = Field(
        default_factory=list, description="Ordered, concrete next actions."
    )


class AdvisorProvider(ABC):
    """Turns a plant's live state into an AdvisorReport."""

    @abstractmethod
    def name(self) -> str:
        """Identifier for the backend (e.g. 'mock', 'claude:claude-opus-4-8')."""

    @abstractmethod
    def diagnose(self, context: dict) -> AdvisorReport:
        """Produce a report from a plant-state context dict.

        `context` is built by AdvisorService and contains the plant's stage,
        height, health, water/nutrient/pest/disease levels, condition_flags,
        a genome summary, the pod environment, and recent events.
        """


class LectureReport(BaseModel):
    """A GrowPod University lecture delivered by the Professor (Master Grower)."""

    title: str = Field(description="Lecture title.")
    summary: str = Field(description="One-paragraph overview for the course outline.")
    content: str = Field(description="The full lecture prose (several paragraphs).")
    key_takeaways: List[str] = Field(
        default_factory=list, description="3-5 actionable takeaways."
    )
    quiz_question: str = Field(
        default="", description="A single comprehension-check question (may be empty)."
    )


class LecturerProvider(ABC):
    """Generates educational lecture content for a course topic."""

    @abstractmethod
    def name(self) -> str:
        """Backend identifier (e.g. 'mock', 'claude:...')."""

    @abstractmethod
    def lecture(self, context: dict) -> LectureReport:
        """Produce a LectureReport from a course/topic context dict.

        `context` (built by LecturerService) carries the course name, lecture
        topic + objectives, requested level, and optional live game-state.
        """


class QuizQuestion(BaseModel):
    """One multiple-choice question in a course quiz."""

    question: str = Field(description="The question text.")
    options: List[str] = Field(
        description="Exactly four answer options (A, B, C, D).",
        min_length=4,
        max_length=4,
    )
    correct_idx: int = Field(
        description="0-based index of the correct option (0–3).", ge=0, le=3
    )
    explanation: str = Field(
        description="One sentence explaining why the correct answer is right."
    )


class QuizReport(BaseModel):
    """Five-question multiple-choice quiz for a course."""

    course_key: str = Field(default="", description="The course this quiz belongs to.")
    provider: str = Field(default="", description="Backend that generated the quiz.")
    questions: List[QuizQuestion] = Field(
        default_factory=list,
        description="Exactly 5 questions covering the course objectives.",
        min_length=5,
        max_length=5,
    )


class QuizProvider(ABC):
    """Generates a multiple-choice quiz for a course lecture."""

    @abstractmethod
    def name(self) -> str:
        """Backend identifier (e.g. 'mock', 'claude:...')."""

    @abstractmethod
    def generate_quiz(self, context: dict) -> QuizReport:
        """Produce a QuizReport from a course context dict.

        `context` carries course name, department, topic, objectives, and level.
        Returns exactly 5 QuizQuestions with 4 options each.
        """
