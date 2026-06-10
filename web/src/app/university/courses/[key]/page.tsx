"use client";

import { use, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingBlock } from "@/components/ui/Spinner";
import { ErrorState, EmptyState } from "@/components/ui/States";
import { Stat } from "@/components/ui/Metric";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useTranscript, usePlantsList } from "@/hooks/queries";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { queryKeys } from "@/lib/queryKeys";
import { grow, hours, titleCase } from "@/lib/format";
import type { QuizPending, QuizSubmitResult } from "@/lib/types";

const LEVELS = ["beginner", "intermediate", "advanced"] as const;

function CourseInner({ courseKey }: { courseKey: string }) {
  const { playerId } = useSession();
  const transcript = useTranscript();

  const inv = [
    queryKeys.transcript(playerId ?? ""),
    queryKeys.wallet(playerId ?? ""),
    queryKeys.player(playerId ?? ""),
  ];
  const enroll = useApiMutation(() => api.university.enroll(playerId!, courseKey), {
    invalidate: inv,
    successMessage: "Enrolled",
  });
  const complete = useApiMutation(() => api.university.complete(playerId!, courseKey), {
    invalidate: inv,
    successMessage: "Course completed!",
  });

  if (transcript.isLoading) return <LoadingBlock />;
  if (transcript.isError || !transcript.data)
    return <ErrorState error={transcript.error} onRetry={() => transcript.refetch()} />;

  const course = transcript.data.courses.find((c) => c.key === courseKey);
  if (!course)
    return (
      <EmptyState icon="❓" title="Unknown course" hint="This course isn't in the catalog." />
    );

  const dept =
    transcript.data.departments?.[course.department ?? ""] ?? course.department ?? "";
  const studyLeft = course.progress?.study_hours_remaining ?? 0;
  const practicalMet = course.progress?.practical_met ?? false;
  const canComplete = course.status === "enrolled" && studyLeft <= 0 && practicalMet;

  return (
    <div className="space-y-5">
      <Link href="/university" className="text-sm text-grow-300 hover:underline">
        ← Back to Catalog
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="instrument-label mb-1">{dept}</div>
          <h1 className="text-2xl font-bold text-gray-50">{course.name}</h1>
        </div>
        <Badge className="border-ink-600 bg-ink-700 text-gray-300">
          {titleCase(course.status)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Coursework" />
          <div className="space-y-1">
            <Stat label="Level required" value={course.level_req} />
            <Stat label="Tuition" value={grow(course.tuition)} />
            <Stat label="Study time" value={hours(course.duration_hours)} />
            <Stat label="Credits" value={course.credits ?? "—"} />
            {course.prereqs.length > 0 && (
              <Stat label="Prereqs" value={course.prereqs.join(", ")} />
            )}
          </div>

          <div className="mt-4 space-y-3">
            {course.status === "available" && (
              <Button
                className="w-full"
                loading={enroll.isPending}
                onClick={() => enroll.mutate()}
              >
                Enroll · {grow(course.tuition)}
              </Button>
            )}

            {course.status === "enrolled" && (
              <div className="space-y-2 rounded-lg border border-ink-700 bg-ink-900/50 p-3 text-sm">
                <div className="instrument-label">PROGRESS</div>
                <Stat
                  label="Study"
                  value={studyLeft > 0 ? `${hours(studyLeft)} left` : "✓ complete"}
                />
                <Stat
                  label="Practical"
                  value={practicalMet ? "✓ met" : course.progress?.practical ?? "in progress"}
                />
                <Button
                  className="mt-1 w-full"
                  loading={complete.isPending}
                  disabled={!canComplete}
                  onClick={() => complete.mutate()}
                >
                  {canComplete ? "Complete course" : "Requirements not met"}
                </Button>
              </div>
            )}

            {course.status === "completed" && (
              <Badge className="border-grow-600 bg-grow-900/60 text-grow-200">
                ✓ Completed
              </Badge>
            )}
            {course.status === "locked" && (
              <p className="text-xs text-gray-500">
                Locked — meet the level requirement and prerequisites first.
              </p>
            )}
          </div>

          {course.perks && Object.keys(course.perks).length > 0 && (
            <div className="mt-4">
              <div className="instrument-label mb-1">PERKS ON COMPLETION</div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(course.perks).map(([k, v]) => (
                  <span
                    key={k}
                    className="rounded-full border border-grow-700 bg-grow-900/40 px-2 py-0.5 text-xs text-grow-200"
                  >
                    {titleCase(k)}: {String(v)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <LectureReader courseKey={courseKey} topic={course.lecture_topic} />
        </div>
      </div>
    </div>
  );
}

// Browser-native TTS — no API key, no backend needed.
function useTTS() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95;
    utt.onstart = () => setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    utteranceRef.current = utt;
    window.speechSynthesis.speak(utt);
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  return { speak, stop, speaking };
}

function LectureReader({
  courseKey,
  topic,
}: {
  courseKey: string;
  topic: string | null;
}) {
  const { playerId } = useSession();
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("beginner");
  const [plantId, setPlantId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const plants = usePlantsList();
  const tts = useTTS();

  const lecture = useQuery({
    queryKey: [...queryKeys.lecture(playerId ?? "", courseKey, level), plantId],
    queryFn: () =>
      api.university.lecture(playerId!, courseKey, {
        level,
        plant_id: plantId || undefined,
      }),
    enabled: open && !!playerId,
    staleTime: 60_000,
  });

  const fullText = lecture.data
    ? [
        lecture.data.title,
        lecture.data.summary,
        lecture.data.content,
        ...(lecture.data.key_takeaways ?? []),
      ].join(". ")
    : "";

  return (
    <>
      <Card>
        <CardHeader
          title="The Professor's lecture"
          subtitle={topic ? `Topic: ${topic}` : "AI-delivered lecture"}
          action={
            lecture.data?.provider ? (
              <Badge className="border-ink-600 bg-ink-700 text-[10px] text-gray-400">
                {lecture.data.provider}
              </Badge>
            ) : undefined
          }
        />

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`rounded-md px-2.5 py-1 text-xs ${
                  level === l
                    ? "bg-grow-700 text-white"
                    : "bg-ink-700 text-gray-300 hover:bg-ink-600"
                }`}
              >
                {titleCase(l)}
              </button>
            ))}
          </div>
          {(plants.data ?? []).length > 0 && (
            <select
              value={plantId}
              onChange={(e) => setPlantId(e.target.value)}
              aria-label="Plant context for lecture"
              className="rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-xs text-gray-200"
            >
              <option value="">No plant context</option>
              {(plants.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  Plant {p.id.slice(0, 6)}… ({titleCase(p.growth_stage)})
                </option>
              ))}
            </select>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setOpen(true);
              lecture.refetch();
            }}
          >
            {lecture.data ? "Re-deliver" : "Attend lecture"}
          </Button>
          {lecture.data && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => (tts.speaking ? tts.stop() : tts.speak(fullText))}
            >
              {tts.speaking ? "⏹ Stop" : "🔊 Listen"}
            </Button>
          )}
        </div>

        {!open && (
          <p className="text-sm text-gray-500">
            Pick a level (and optionally a live plant for a contextual lecture), then attend.
          </p>
        )}
        {open && lecture.isLoading && (
          <LoadingBlock label="The Professor is preparing…" />
        )}
        {open && lecture.isError && (
          <p className="text-sm text-red-300">
            {(lecture.error as Error)?.message ?? "Professor unavailable"}
          </p>
        )}
        {lecture.data && (
          <article className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-50">{lecture.data.title}</h3>
            <p className="text-sm italic text-gray-400">{lecture.data.summary}</p>
            <div className="space-y-2 whitespace-pre-line text-sm leading-relaxed text-gray-300">
              {lecture.data.content}
            </div>
            {lecture.data.key_takeaways.length > 0 && (
              <div className="rounded-lg border border-ink-700 bg-ink-900/50 p-3">
                <div className="instrument-label mb-2">KEY TAKEAWAYS</div>
                <ul className="list-inside list-disc space-y-1 text-sm text-gray-300">
                  {lecture.data.key_takeaways.map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              </div>
            )}
            {lecture.data.quiz_question && (
              <div className="rounded-lg border border-accent-500/40 bg-accent-500/5 p-3 text-sm text-accent-300">
                <span className="instrument-label">COMPREHENSION CHECK</span>
                <p className="mt-1 text-gray-200">{lecture.data.quiz_question}</p>
              </div>
            )}
            <div className="pt-1">
              <Button size="sm" onClick={() => setShowQuiz(true)}>
                Take Quiz
              </Button>
            </div>
          </article>
        )}
      </Card>

      {showQuiz && playerId && (
        <QuizPanel
          playerId={playerId}
          courseKey={courseKey}
          onClose={() => setShowQuiz(false)}
        />
      )}
    </>
  );
}

function QuizPanel({
  playerId,
  courseKey,
  onClose,
}: {
  playerId: string;
  courseKey: string;
  onClose: () => void;
}) {
  const [quiz, setQuiz] = useState<QuizPending | null>(null);
  const [answers, setAnswers] = useState<number[]>(Array(5).fill(-1));
  const [result, setResult] = useState<QuizSubmitResult | null>(null);

  const generate = useApiMutation(() => api.university.generateQuiz(playerId, courseKey), {
    onSuccess: (data) => {
      setQuiz(data);
      setAnswers(Array(5).fill(-1));
      setResult(null);
    },
  });

  const submitMut = useApiMutation(
    () => api.university.submitQuiz(playerId, courseKey, quiz!.id, answers),
    { onSuccess: (data) => setResult(data) },
  );

  const allAnswered = answers.every((a) => a >= 0);

  // Initial state — offer to generate
  if (!quiz && !generate.isPending) {
    return (
      <Card>
        <CardHeader
          title="Take the Quiz"
          subtitle="5 multiple-choice questions graded in real time"
        />
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            Test your knowledge of this course. Answer 3 of 5 correctly to pass and earn XP.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => generate.mutate()} loading={generate.isPending}>
              Generate Quiz
            </Button>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Maybe later
            </Button>
          </div>
          {generate.error && (
            <p className="text-xs text-red-400">
              {(generate.error as Error)?.message ?? "Quiz generation failed"}
            </p>
          )}
        </div>
      </Card>
    );
  }

  if (generate.isPending) {
    return (
      <Card>
        <LoadingBlock label="The Professor is writing your quiz…" />
      </Card>
    );
  }

  // Results view
  if (result && quiz) {
    const pct = Math.round(result.score);
    return (
      <Card>
        <CardHeader
          title={result.passed ? "Quiz Passed!" : "Quiz Complete"}
          subtitle={`${result.correct_count} / ${result.total} correct · ${pct}%`}
          action={
            result.passed ? (
              <Badge className="border-grow-600 bg-grow-900/60 text-grow-200">
                +{result.xp_earned} XP
              </Badge>
            ) : (
              <Badge className="border-red-700 bg-red-900/30 text-red-300">
                {pct}% — need 60%
              </Badge>
            )
          }
        />
        <div className="space-y-3">
          {result.results.map((r, i) => (
            <div
              key={i}
              className={`rounded-lg border p-3 text-sm ${
                r.correct
                  ? "border-grow-700 bg-grow-900/30"
                  : "border-red-700/60 bg-red-900/20"
              }`}
            >
              <p className="font-medium text-gray-200">
                {i + 1}. {r.question}
              </p>
              <p className="mt-1 text-gray-400">
                Your answer:{" "}
                <span className={r.correct ? "text-grow-300" : "text-red-300"}>
                  {quiz.questions[i]?.options[r.chosen_idx]}
                </span>
              </p>
              {!r.correct && (
                <p className="text-gray-400">
                  Correct:{" "}
                  <span className="text-grow-300">
                    {quiz.questions[i]?.options[r.correct_idx]}
                  </span>
                </p>
              )}
              <p className="mt-1 italic text-gray-500">{r.explanation}</p>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setQuiz(null);
                setResult(null);
                setAnswers(Array(5).fill(-1));
              }}
            >
              Retake Quiz
            </Button>
            <Button size="sm" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Active quiz — answer questions
  if (quiz) {
    return (
      <Card>
        <CardHeader title="Course Quiz" subtitle={`${quiz.questions.length} questions`} />
        <div className="space-y-5">
          {quiz.questions.map((q, qi) => (
            <div key={qi} className="space-y-2">
              <p className="text-sm font-medium text-gray-200">
                {qi + 1}. {q.question}
              </p>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => {
                      const next = [...answers];
                      next[qi] = oi;
                      setAnswers(next);
                    }}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      answers[qi] === oi
                        ? "border-grow-500 bg-grow-900/50 text-grow-200"
                        : "border-ink-600 bg-ink-800 text-gray-300 hover:border-ink-500 hover:bg-ink-700"
                    }`}
                  >
                    <span className="mr-2 font-medium text-gray-500">
                      {String.fromCharCode(65 + oi)}.
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              loading={submitMut.isPending}
              disabled={!allAnswered || submitMut.isPending}
              onClick={() => submitMut.mutate()}
            >
              Submit Quiz
            </Button>
            <Button size="sm" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
          {!allAnswered && (
            <p className="text-xs text-gray-500">Answer all 5 questions to submit.</p>
          )}
        </div>
      </Card>
    );
  }

  return null;
}

export default function CoursePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = use(params);
  return (
    <RequireAuth>
      <CourseInner courseKey={key} />
    </RequireAuth>
  );
}
