import { apiFetch } from "./client";
import type {
  UniversityCatalog,
  Transcript,
  Enrollment,
  LectureReport,
  QuizPending,
  QuizSubmitResult,
  QuizCompleted,
} from "@/lib/types";

export const university = {
  catalog: () => apiFetch<UniversityCatalog>(`/university/catalog`),

  transcript: (playerId: string) =>
    apiFetch<Transcript>(`/players/${playerId}/university`, { auth: true }),

  enroll: (playerId: string, courseKey: string) =>
    apiFetch<Enrollment>(`/players/${playerId}/courses/${courseKey}/enroll`, {
      method: "POST",
    }),

  complete: (playerId: string, courseKey: string) =>
    apiFetch<Record<string, unknown>>(
      `/players/${playerId}/courses/${courseKey}/complete`,
      { method: "POST" },
    ),

  claimDegree: (playerId: string, degreeKey: string) =>
    apiFetch<Record<string, unknown>>(
      `/players/${playerId}/degrees/${degreeKey}/claim`,
      { method: "POST" },
    ),

  // AI Professor lecture (GET but player-scoped → needs the key).
  lecture: (
    playerId: string,
    courseKey: string,
    opts: { level?: string; plant_id?: string } = {},
  ) =>
    apiFetch<LectureReport>(`/players/${playerId}/courses/${courseKey}/lecture`, {
      auth: true,
      query: opts,
    }),

  // Quiz endpoints
  generateQuiz: (playerId: string, courseKey: string) =>
    apiFetch<QuizPending>(
      `/players/${playerId}/courses/${courseKey}/quiz/generate`,
      { method: "POST" },
    ),

  submitQuiz: (
    playerId: string,
    courseKey: string,
    quizId: string,
    answers: number[],
  ) =>
    apiFetch<QuizSubmitResult>(
      `/players/${playerId}/courses/${courseKey}/quiz/${quizId}/submit`,
      { method: "POST", body: { answers } },
    ),

  latestQuiz: (playerId: string, courseKey: string) =>
    apiFetch<QuizCompleted>(
      `/players/${playerId}/courses/${courseKey}/quiz/latest`,
      { auth: true },
    ),
};
