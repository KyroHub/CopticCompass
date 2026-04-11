"use server";

import { revalidatePath } from "next/cache";

import {
  getGrammarExerciseDocumentById,
  getGrammarLessonDocumentBySlug,
} from "@/content/grammar/registry";
import type { SubmissionInsert } from "@/features/submissions/types";
import { formatLessonSlug } from "@/features/submissions/utils";
import { queueLoggedOwnerAlertEmail } from "@/lib/notifications/events";
import {
  consumeRateLimit,
  getUserRateLimitIdentifier,
  hasAvailableRateLimitProtection,
} from "@/lib/rateLimit";
import {
  type ScalabilityMetadata,
  withScalabilityTimer,
} from "@/lib/server/observability";
import { revalidateDashboardPaths } from "@/lib/server/revalidation";
import { getAuthenticatedServerContext } from "@/lib/supabase/auth";
import { hasSupabaseRuntimeEnv } from "@/lib/supabase/config";
import { isMissingSupabaseTableError } from "@/lib/supabase/errors";
import {
  getFormString,
  hasLengthInRange,
  normalizeMultiline,
  normalizeWhitespace,
} from "@/lib/validation";
import type { Language } from "@/types/i18n";

type ExerciseActionState = {
  success?: boolean;
  error?: string;
} | null;

const SUBMISSION_DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

function isExerciseLanguage(value: string): value is Language {
  return value === "en" || value === "nl";
}

type GrammarExerciseDocument = NonNullable<
  ReturnType<typeof getGrammarExerciseDocumentById>
>;
type GrammarLessonDocument = NonNullable<
  ReturnType<typeof getGrammarLessonDocumentBySlug>
>;
type ExerciseSupabase = NonNullable<
  Awaited<ReturnType<typeof getAuthenticatedServerContext>>
>["supabase"];
type SerializedExerciseAnswers = NonNullable<SubmissionInsert["answers"]>;
type ValidatedExerciseSubmission = {
  answers: Array<{
    answer: string;
    answerSchema: GrammarExerciseDocument["items"][number]["answerSchema"];
    prompt: string;
    questionId: string;
  }>;
  exerciseDefinition: GrammarExerciseDocument;
  exerciseId: string;
  exerciseLanguage: Language;
  lessonDefinition: GrammarLessonDocument;
  lessonSlug: string;
  normalizedSubmittedText: string;
  serializedAnswers: SerializedExerciseAnswers;
  submissionIntentId: string;
};
type ExerciseSubmissionContext = ValidatedExerciseSubmission & {
  scalabilityMetadata: ScalabilityMetadata;
  supabase: ExerciseSupabase;
  user: {
    email?: string | null;
    id: string;
  };
};

function extractAndValidateExerciseAnswers(
  formData: FormData,
  exerciseDefinition: GrammarExerciseDocument,
  exerciseLanguage: Language,
): { error: string } | { answers: ValidatedExerciseSubmission["answers"] } {
  const expectedAnswerKeys = new Set(
    exerciseDefinition.items.map((question) => `answer_${question.id}`),
  );
  const providedAnswerKeys = new Set(
    Array.from(formData.keys()).filter((key) => key.startsWith("answer_")),
  );

  if (
    providedAnswerKeys.size !== expectedAnswerKeys.size ||
    Array.from(providedAnswerKeys).some((key) => !expectedAnswerKeys.has(key))
  ) {
    return {
      error: "Exercise answers were incomplete or malformed.",
    };
  }

  const answers = exerciseDefinition.items.map((question) => {
    const answer = normalizeMultiline(
      getFormString(formData, `answer_${question.id}`),
    );
    return {
      answerSchema: question.answerSchema,
      prompt: question.prompt[exerciseLanguage],
      questionId: question.id,
      answer,
    };
  });

  if (
    answers.some(
      ({ answer, answerSchema }) =>
        !hasLengthInRange(answer, {
          min: answerSchema?.minLength ?? 1,
          max: answerSchema?.maxLength ?? 500,
        }),
    )
  ) {
    return {
      error: "Each answer must be between 1 and 500 characters.",
    };
  }

  return { answers };
}

/**
 * Loads the referenced lesson and exercise definitions, verifies the submitted
 * answer keys, and normalizes the payload into the shape stored in Supabase.
 */
function parseExerciseSubmission(
  formData: FormData,
): { error: string } | { values: ValidatedExerciseSubmission } {
  const lessonSlug = normalizeWhitespace(getFormString(formData, "lessonSlug"));
  const exerciseId = normalizeWhitespace(getFormString(formData, "exerciseId"));
  const exerciseLanguage = normalizeWhitespace(
    getFormString(formData, "exerciseLanguage"),
  );
  const submissionIntentId = normalizeWhitespace(
    getFormString(formData, "submissionIntentId"),
  );
  const lessonDefinition = getGrammarLessonDocumentBySlug(lessonSlug);
  const exerciseDefinition = getGrammarExerciseDocumentById(exerciseId);

  if (
    !lessonDefinition ||
    !exerciseDefinition ||
    exerciseDefinition.lessonId !== lessonDefinition.id ||
    !isExerciseLanguage(exerciseLanguage) ||
    !hasLengthInRange(submissionIntentId, { min: 16, max: 200 })
  ) {
    return { error: "Invalid exercise submission." };
  }

  const answerResult = extractAndValidateExerciseAnswers(
    formData,
    exerciseDefinition,
    exerciseLanguage,
  );

  if ("error" in answerResult) {
    return { error: answerResult.error };
  }

  const { answers } = answerResult;

  const normalizedSubmittedText = answers
    .map(({ prompt, answer }) => `Question: ${prompt}\nAnswer: ${answer}`)
    .join("\n\n")
    .trim();
  const serializedAnswers = answers.map(
    ({ answer, answerSchema, prompt, questionId }) => ({
      answer,
      answer_schema: answerSchema ?? null,
      prompt,
      question_id: questionId,
    }),
  );

  return {
    values: {
      answers,
      exerciseDefinition,
      exerciseId,
      exerciseLanguage,
      lessonDefinition,
      lessonSlug,
      normalizedSubmittedText,
      serializedAnswers,
      submissionIntentId,
    },
  };
}

function revalidateExercisePaths(lessonSlug: string) {
  revalidateDashboardPaths();
  revalidatePath(`/grammar/${lessonSlug}`);
}

/**
 * Maps Supabase insert failures to the user-facing exercise states we support.
 * Duplicate rows are treated as a successful retry because the submission is
 * already recorded and the relevant lesson/dashboard paths are revalidated.
 */
function handleExerciseSubmissionError(options: {
  error: {
    code?: string | null;
    details?: string | null;
    hint?: string | null;
    message: string;
  };
  exerciseId: string;
  lessonSlug: string;
  userId: string;
}): ExerciseActionState {
  console.error("Error submitting exercise:", {
    code: options.error.code,
    message: options.error.message,
    details: options.error.details,
    hint: options.error.hint,
    exerciseId: options.exerciseId,
    lessonSlug: options.lessonSlug,
    userId: options.userId,
  });

  if (isMissingSupabaseTableError(options.error)) {
    return {
      success: false,
      error:
        "Exercise submissions are not configured yet. Please contact the administrator.",
    };
  }

  if (options.error.code === "42501") {
    return {
      success: false,
      error: "Your account does not have permission to submit exercises yet.",
    };
  }

  if (options.error.code === "23505") {
    revalidateExercisePaths(options.lessonSlug);
    return { success: true };
  }

  return {
    success: false,
    error: "Failed to submit exercise. Please try again.",
  };
}

/**
 * Detects recent identical submissions from the same user so accidental
 * double-submits can be acknowledged without creating duplicate records.
 */
async function hasRecentDuplicateExerciseSubmission(options: {
  exerciseId: string;
  lessonSlug: string;
  normalizedSubmittedText: string;
  supabase: ExerciseSupabase;
  userId: string;
}) {
  const duplicateThreshold = new Date(
    Date.now() - SUBMISSION_DUPLICATE_WINDOW_MS,
  ).toISOString();
  const { data: recentDuplicate, error: duplicateLookupError } =
    await options.supabase
      .from("submissions")
      .select("id")
      .eq("user_id", options.userId)
      .eq("lesson_slug", options.lessonSlug)
      .eq("exercise_id", options.exerciseId)
      .eq("submitted_text", options.normalizedSubmittedText)
      .gte("created_at", duplicateThreshold)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (duplicateLookupError) {
    console.error("Error checking for duplicate exercise submission:", {
      code: duplicateLookupError.code,
      message: duplicateLookupError.message,
      details: duplicateLookupError.details,
      hint: duplicateLookupError.hint,
      exerciseId: options.exerciseId,
      lessonSlug: options.lessonSlug,
      userId: options.userId,
    });
    return false;
  }

  if (recentDuplicate) {
    revalidateExercisePaths(options.lessonSlug);
    return true;
  }

  return false;
}

/**
 * Sends a best-effort owner alert after the submission row exists, keeping the
 * primary exercise flow successful even when the alert email cannot be sent.
 */
async function dispatchExerciseSubmissionOwnerAlert(options: {
  answerCount: number;
  exerciseId: string;
  exerciseLanguage: Language;
  lessonSlug: string;
  normalizedSubmittedText: string;
  submissionId: string;
  user: {
    email?: string | null;
    id: string;
  };
}) {
  const ownerAlert = await queueLoggedOwnerAlertEmail({
    aggregateId: options.submissionId,
    aggregateType: "submission",
    eventType: "exercise_submission_received",
    payload: {
      exercise_id: options.exerciseId,
      lesson_slug: options.lessonSlug,
      submitted_language: options.exerciseLanguage,
      user_id: options.user.id,
    },
    subject: `Coptic Compass exercise submission: ${formatLessonSlug(options.lessonSlug)}`,
    text: [
      `Student: ${options.user.email ?? "Unknown email"}`,
      `Lesson: ${options.lessonSlug}`,
      `Exercise: ${options.exerciseId}`,
      `Language: ${options.exerciseLanguage}`,
      `Answer count: ${options.answerCount}`,
      "",
      "Submission:",
      options.normalizedSubmittedText,
    ].join("\n"),
  });

  if (!ownerAlert.success) {
    console.error("Failed to send owner exercise submission alert", {
      error: ownerAlert.error,
      exerciseId: options.exerciseId,
      lessonSlug: options.lessonSlug,
      userId: options.user.id,
    });
  }
}

function summarizeExerciseActionState(state: ExerciseActionState) {
  return {
    success: Boolean(state?.success),
  };
}

async function storeExerciseSubmission(
  context: ExerciseSubmissionContext,
): Promise<ExerciseActionState> {
  const hasRecentDuplicate = await hasRecentDuplicateExerciseSubmission({
    exerciseId: context.exerciseDefinition.id,
    lessonSlug: context.lessonDefinition.slug,
    normalizedSubmittedText: context.normalizedSubmittedText,
    supabase: context.supabase,
    userId: context.user.id,
  });
  if (hasRecentDuplicate) {
    context.scalabilityMetadata.duplicateDetected = true;
    return { success: true };
  }

  if (!hasAvailableRateLimitProtection()) {
    return {
      success: false,
      error: "Exercise submission is temporarily unavailable.",
    };
  }

  const exerciseRateLimit = await consumeRateLimit({
    identifier: getUserRateLimitIdentifier(context.user.id),
    limit: 6,
    namespace: `exercise:${context.exerciseDefinition.id}`,
    windowMs: 60 * 60 * 1000,
  });

  if (!exerciseRateLimit.ok) {
    context.scalabilityMetadata.rateLimited = true;
    return {
      success: false,
      error:
        "Too many submissions were received for this lesson. Please wait a bit before trying again.",
    };
  }

  const submission: SubmissionInsert = {
    answers: context.serializedAnswers,
    exercise_id: context.exerciseDefinition.id,
    user_id: context.user.id,
    lesson_slug: context.lessonDefinition.slug,
    submission_intent_id: context.submissionIntentId,
    submitted_language: context.exerciseLanguage,
    submitted_text: context.normalizedSubmittedText,
    status: "pending",
  };

  const { data: submissionRow, error } = await context.supabase
    .from("submissions")
    .insert([submission])
    .select("id")
    .single();

  if (error) {
    return handleExerciseSubmissionError({
      error,
      exerciseId: context.exerciseId,
      lessonSlug: context.lessonSlug,
      userId: context.user.id,
    });
  }

  revalidateExercisePaths(context.lessonDefinition.slug);

  if (!submissionRow) {
    return { success: true };
  }

  await dispatchExerciseSubmissionOwnerAlert({
    answerCount: context.answers.length,
    exerciseId: context.exerciseId,
    exerciseLanguage: context.exerciseLanguage,
    lessonSlug: context.lessonSlug,
    normalizedSubmittedText: context.normalizedSubmittedText,
    submissionId: submissionRow.id,
    user: context.user,
  });

  return { success: true };
}

/**
 * Validates and stores one authenticated exercise submission, preventing
 * duplicate retries and applying per-exercise rate limiting before insert.
 */
export async function submitExercise(
  _prevState: ExerciseActionState,
  formData: FormData,
): Promise<ExerciseActionState> {
  const scalabilityMetadata: ScalabilityMetadata = {};

  return withScalabilityTimer(
    "action.exercise.submit_exercise",
    async () => {
      if (!hasSupabaseRuntimeEnv()) {
        return {
          success: false,
          error: "Exercise submission is temporarily unavailable.",
        };
      }

      const authContext = await getAuthenticatedServerContext();
      if (!authContext) {
        return { success: false, error: "Unauthorized. Please sign in first." };
      }

      const { supabase, user } = authContext;
      const parseResult = parseExerciseSubmission(formData);
      if ("error" in parseResult) {
        return { success: false, error: parseResult.error };
      }

      const submissionContext = parseResult.values;

      Object.assign(scalabilityMetadata, {
        answerCount: submissionContext.answers.length,
        exerciseId: submissionContext.exerciseId,
        exerciseLanguage: submissionContext.exerciseLanguage,
        lessonSlug: submissionContext.lessonSlug,
      });

      return storeExerciseSubmission({
        ...submissionContext,
        scalabilityMetadata,
        supabase,
        user,
      });
    },
    {
      metadata: scalabilityMetadata,
      summarizeResult: summarizeExerciseActionState,
    },
  );
}
