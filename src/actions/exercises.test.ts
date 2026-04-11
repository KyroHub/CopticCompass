import { beforeEach, describe, expect, it, vi } from "vitest";

type ExercisesModuleContext = {
  duplicateLookupMaybeSingleMock: ReturnType<typeof vi.fn>;
  consumeRateLimitMock: ReturnType<typeof vi.fn>;
  getAuthenticatedServerContextMock: ReturnType<typeof vi.fn>;
  insertMock: ReturnType<typeof vi.fn>;
  insertSingleMock: ReturnType<typeof vi.fn>;
  queueLoggedOwnerAlertEmailMock: ReturnType<typeof vi.fn>;
  revalidatePathMock: ReturnType<typeof vi.fn>;
  submitExercise: typeof import("./exercises").submitExercise;
};

function createExerciseFormData(overrides?: {
  answers?: Record<string, string>;
  exerciseLanguage?: string;
  exerciseId?: string;
  extraAnswerKey?: string;
  lessonSlug?: string;
  submissionIntentId?: string;
}) {
  const formData = new FormData();
  formData.set("lessonSlug", overrides?.lessonSlug ?? "lesson-1");
  formData.set(
    "exerciseId",
    overrides?.exerciseId ?? "grammar.exercise.lesson01.001",
  );
  formData.set("exerciseLanguage", overrides?.exerciseLanguage ?? "en");
  formData.set(
    "submissionIntentId",
    overrides?.submissionIntentId ?? "intent_grammar_exercise_submission_123",
  );

  for (let i = 1; i <= 10; i += 1) {
    formData.set(
      `answer_q${i}`,
      overrides?.answers?.[`q${i}`] ?? `Answer ${i}`,
    );
  }

  if (overrides?.extraAnswerKey) {
    formData.set(overrides.extraAnswerKey, "Unexpected");
  }

  return formData;
}

async function loadExercisesModule(options?: {
  duplicateLookupError?: {
    code?: string;
    details?: string | null;
    hint?: string | null;
    message?: string;
  } | null;
  hasEnv?: boolean;
  hasRateLimitProtection?: boolean;
  insertError?: {
    code?: string;
    details?: string | null;
    hint?: string | null;
    message?: string;
  } | null;
  rateLimitOk?: boolean;
  recentDuplicate?: boolean;
  sendOwnerAlertResult?:
    | { error: string; success: false }
    | { eventId: string; jobId: string; success: true };
  user?: { email?: string | null; id: string } | null;
}) {
  vi.resetModules();

  const revalidatePathMock = vi.fn();
  const consumeRateLimitMock = vi.fn().mockResolvedValue({
    ok: options?.rateLimitOk ?? true,
    remaining: 1,
    resetAt: Date.now() + 60_000,
    retryAfterMs: 60_000,
  });
  const insertSingleMock = vi.fn().mockResolvedValue({
    data: { id: "submission_123" },
    error: options?.insertError ?? null,
  });
  const insertMock = vi.fn(() => ({
    select: vi.fn(() => ({
      single: insertSingleMock,
    })),
  }));
  const duplicateLookupMaybeSingleMock = vi.fn().mockResolvedValue({
    data: options?.recentDuplicate ? { id: "submission_existing" } : null,
    error: options?.duplicateLookupError ?? null,
  });
  const duplicateLookupQuery = {
    eq: vi.fn(() => duplicateLookupQuery),
    gte: vi.fn(() => duplicateLookupQuery),
    limit: vi.fn(() => duplicateLookupQuery),
    maybeSingle: duplicateLookupMaybeSingleMock,
    order: vi.fn(() => duplicateLookupQuery),
  };
  const getAuthenticatedServerContextMock = vi.fn().mockResolvedValue(
    options?.user === null
      ? null
      : {
          supabase: {
            from: vi.fn(() => ({
              select: vi.fn(() => duplicateLookupQuery),
              insert: insertMock,
            })),
          },
          user: options?.user ?? {
            email: "student@example.com",
            id: "user_123",
          },
        },
  );
  const queueLoggedOwnerAlertEmailMock = vi.fn().mockResolvedValue(
    options?.sendOwnerAlertResult ?? {
      eventId: "event_123",
      jobId: "job_123",
      success: true,
    },
  );

  vi.doMock("next/cache", () => ({
    revalidatePath: revalidatePathMock,
  }));
  vi.doMock("@/lib/rateLimit", () => ({
    consumeRateLimit: consumeRateLimitMock,
    getUserRateLimitIdentifier: vi.fn(() => "user-rate-limit-id"),
    hasAvailableRateLimitProtection: vi.fn(
      () => options?.hasRateLimitProtection ?? true,
    ),
  }));
  vi.doMock("@/lib/supabase/auth", () => ({
    getAuthenticatedServerContext: getAuthenticatedServerContextMock,
  }));
  vi.doMock("@/lib/supabase/config", () => ({
    hasSupabaseRuntimeEnv: vi.fn(() => options?.hasEnv ?? true),
  }));
  vi.doMock("@/lib/notifications/events", () => ({
    queueLoggedOwnerAlertEmail: queueLoggedOwnerAlertEmailMock,
  }));

  const mod = await import("./exercises");

  return {
    ...mod,
    duplicateLookupMaybeSingleMock,
    consumeRateLimitMock,
    getAuthenticatedServerContextMock,
    insertMock,
    insertSingleMock,
    queueLoggedOwnerAlertEmailMock,
    revalidatePathMock,
  } satisfies ExercisesModuleContext;
}

describe("exercise submission action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a friendly error when Supabase auth is unavailable", async () => {
    const { getAuthenticatedServerContextMock, submitExercise } =
      await loadExercisesModule({
        hasEnv: false,
      });

    await expect(
      submitExercise(null, createExerciseFormData()),
    ).resolves.toEqual({
      success: false,
      error: "Exercise submission is temporarily unavailable.",
    });

    expect(getAuthenticatedServerContextMock).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated exercise submissions", async () => {
    const { submitExercise } = await loadExercisesModule({
      user: null,
    });

    await expect(
      submitExercise(null, createExerciseFormData()),
    ).resolves.toEqual({
      success: false,
      error: "Unauthorized. Please sign in first.",
    });
  });

  it("rejects malformed exercise payloads with unexpected answer keys", async () => {
    const { submitExercise } = await loadExercisesModule();

    await expect(
      submitExercise(
        null,
        createExerciseFormData({
          extraAnswerKey: "answer_q999",
        }),
      ),
    ).resolves.toEqual({
      success: false,
      error: "Exercise answers were incomplete or malformed.",
    });
  });

  it("rejects submissions for unknown canonical exercises", async () => {
    const { submitExercise } = await loadExercisesModule();

    await expect(
      submitExercise(
        null,
        createExerciseFormData({
          exerciseId: "grammar.exercise.unknown",
        }),
      ),
    ).resolves.toEqual({
      success: false,
      error: "Invalid exercise submission.",
    });
  });

  it("rejects submissions whose lesson slug does not match the canonical exercise", async () => {
    const { submitExercise } = await loadExercisesModule();

    await expect(
      submitExercise(
        null,
        createExerciseFormData({
          lessonSlug: "lesson-2",
        }),
      ),
    ).resolves.toEqual({
      success: false,
      error: "Invalid exercise submission.",
    });
  });

  it("rejects submissions without a valid submission intent token", async () => {
    const { submitExercise } = await loadExercisesModule();

    await expect(
      submitExercise(
        null,
        createExerciseFormData({
          submissionIntentId: "short",
        }),
      ),
    ).resolves.toEqual({
      success: false,
      error: "Invalid exercise submission.",
    });
  });

  it("rejects answers that exceed the allowed length", async () => {
    const { submitExercise } = await loadExercisesModule();

    await expect(
      submitExercise(
        null,
        createExerciseFormData({
          answers: {
            q1: "x".repeat(501),
          },
        }),
      ),
    ).resolves.toEqual({
      success: false,
      error: "Each answer must be between 1 and 500 characters.",
    });
  });

  it("returns a rate limit error before writing submissions", async () => {
    const { insertMock, submitExercise } = await loadExercisesModule({
      rateLimitOk: false,
    });

    await expect(
      submitExercise(null, createExerciseFormData()),
    ).resolves.toEqual({
      success: false,
      error:
        "Too many submissions were received for this lesson. Please wait a bit before trying again.",
    });

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns success without inserting when a matching recent submission already exists", async () => {
    const {
      consumeRateLimitMock,
      queueLoggedOwnerAlertEmailMock,
      insertMock,
      revalidatePathMock,
      submitExercise,
    } = await loadExercisesModule({
      recentDuplicate: true,
    });

    await expect(
      submitExercise(null, createExerciseFormData()),
    ).resolves.toEqual({
      success: true,
    });

    expect(consumeRateLimitMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
    expect(queueLoggedOwnerAlertEmailMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/grammar/lesson-1");
  });

  it("fails closed when shared rate limiting is unavailable", async () => {
    const { consumeRateLimitMock, insertMock, submitExercise } =
      await loadExercisesModule({
        hasRateLimitProtection: false,
      });

    await expect(
      submitExercise(null, createExerciseFormData()),
    ).resolves.toEqual({
      success: false,
      error: "Exercise submission is temporarily unavailable.",
    });

    expect(consumeRateLimitMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("stores canonical prompts and submission metadata, then alerts the owner", async () => {
    const {
      queueLoggedOwnerAlertEmailMock,
      insertMock,
      revalidatePathMock,
      submitExercise,
    } = await loadExercisesModule();

    await expect(
      submitExercise(
        null,
        createExerciseFormData({
          answers: {
            q1: "  normalized answer  ",
          },
        }),
      ),
    ).resolves.toEqual({
      success: true,
    });

    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({
        answers: expect.arrayContaining([
          expect.objectContaining({
            answer: "normalized answer",
            prompt: "She is my daughter.",
            question_id: "q1",
          }),
        ]),
        exercise_id: "grammar.exercise.lesson01.001",
        lesson_slug: "lesson-1",
        status: "pending",
        submission_intent_id: "intent_grammar_exercise_submission_123",
        submitted_language: "en",
        submitted_text: expect.stringContaining(
          "Question: She is my daughter.\nAnswer: normalized answer",
        ),
        user_id: "user_123",
      }),
    ]);
    expect(queueLoggedOwnerAlertEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateId: "submission_123",
        aggregateType: "submission",
        eventType: "exercise_submission_received",
        subject: "Coptic Compass exercise submission: lesson 1",
        text: expect.stringContaining("Student: student@example.com"),
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/grammar/lesson-1");
  });

  it("returns success even if the owner alert email fails after the submission is stored", async () => {
    const { insertMock, queueLoggedOwnerAlertEmailMock, submitExercise } =
      await loadExercisesModule({
        sendOwnerAlertResult: {
          success: false,
          error: "Owner inbox unavailable",
        },
      });

    await expect(
      submitExercise(null, createExerciseFormData()),
    ).resolves.toEqual({
      success: true,
    });

    expect(insertMock).toHaveBeenCalledOnce();
    expect(queueLoggedOwnerAlertEmailMock).toHaveBeenCalledOnce();
  });

  it("treats a duplicate submission intent as an already-stored success", async () => {
    const {
      queueLoggedOwnerAlertEmailMock,
      insertMock,
      revalidatePathMock,
      submitExercise,
    } = await loadExercisesModule({
      insertError: {
        code: "23505",
        message: "duplicate key value violates unique constraint",
      },
    });

    await expect(
      submitExercise(null, createExerciseFormData()),
    ).resolves.toEqual({
      success: true,
    });

    expect(insertMock).toHaveBeenCalledOnce();
    expect(queueLoggedOwnerAlertEmailMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/grammar/lesson-1");
  });

  it("returns a permission-specific message when the database denies submission", async () => {
    const { submitExercise } = await loadExercisesModule({
      insertError: {
        code: "42501",
        message: "permission denied",
      },
    });

    await expect(
      submitExercise(null, createExerciseFormData()),
    ).resolves.toEqual({
      success: false,
      error: "Your account does not have permission to submit exercises yet.",
    });
  });
});
