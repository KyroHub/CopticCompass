"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useActionState } from "react";

import { submitExercise } from "@/actions/exercises";
import { AuthGateNotice } from "@/components/AuthGateNotice";
import { buttonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { SkeletonBlock } from "@/components/SkeletonBlock";
import { StatusNotice } from "@/components/StatusNotice";
import { getDashboardPath } from "@/lib/locale";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { loadBrowserUser } from "@/lib/supabase/clientAuth";
import type { Language } from "@/types/i18n";

import type { User } from "@supabase/supabase-js";

type ExerciseFormQuestion = {
  id: string;
  prompt: string;
  minLength?: number;
  maxLength?: number;
};

function createSubmissionIntentId(
  userId: string,
  lessonSlug: string,
  exerciseId: string,
) {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${userId}:${exerciseId}:${lessonSlug}:${Date.now().toString(36)}:${Math.random()
      .toString(36)
      .slice(2, 12)}`
  );
}

export function ExerciseForm({
  lessonSlug,
  exerciseId,
  language,
  questions,
}: {
  lessonSlug: string;
  exerciseId: string;
  language: Language;
  questions: ExerciseFormQuestion[];
}) {
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const authAvailable = hasSupabaseEnv();
  const [loading, setLoading] = useState(authAvailable);

  const [state, formAction, isPending] = useActionState(submitExercise, null);
  const [submissionIntentId, setSubmissionIntentId] = useState<string | null>(
    null,
  );
  const userId = user?.id ?? null;
  let submitLabel = t("exercise.submit");

  if (isPending) {
    submitLabel = t("exercise.submitting");
  } else if (!submissionIntentId) {
    submitLabel = t("exercise.preparingSubmission");
  }

  useEffect(() => {
    if (!authAvailable) {
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      return;
    }

    let isMounted = true;

    void loadBrowserUser(supabase)
      .then((nextUser) => {
        if (!isMounted) {
          return;
        }

        setUser(nextUser);
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setUser(null);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [authAvailable]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      if (!userId) {
        setSubmissionIntentId(null);
        return;
      }

      setSubmissionIntentId((current) => {
        if (current) {
          return current;
        }

        return createSubmissionIntentId(userId, lessonSlug, exerciseId);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [exerciseId, lessonSlug, userId]);

  if (loading) {
    return <SkeletonBlock className="mt-6 h-20" />;
  }

  if (!authAvailable) {
    return (
      <StatusNotice tone="default" size="comfortable" className="mt-6">
        <p className="mb-4">{t("exercise.authUnavailable")}</p>
      </StatusNotice>
    );
  }

  if (!user) {
    return (
      <AuthGateNotice
        actionClassName="px-6"
        actionLabel={t("exercise.loginCta")}
        className="mt-6"
        size="comfortable"
        tone="info"
      >
        {t("exercise.loginPrompt")}
      </AuthGateNotice>
    );
  }

  if (state?.success) {
    return (
      <StatusNotice
        tone="success"
        size="comfortable"
        className="mt-6"
        title={t("exercise.submittedTitle")}
        actions={
          <Link
            href={getDashboardPath(language)}
            className={buttonClassName({
              className: "px-6",
              variant: "primary",
            })}
          >
            {t("exercise.viewDashboard")}
          </Link>
        }
      >
        <p className="font-sans">{t("exercise.submittedBody")}</p>
      </StatusNotice>
    );
  }

  return (
    <form action={formAction} className="mt-6 space-y-8">
      <input type="hidden" name="lessonSlug" value={lessonSlug} />
      <input type="hidden" name="exerciseId" value={exerciseId} />
      <input type="hidden" name="exerciseLanguage" value={language} />
      <input
        type="hidden"
        name="submissionIntentId"
        value={submissionIntentId ?? ""}
      />
      {questions.map((question, idx) => (
        <div
          key={question.id}
          className="space-y-3 rounded-lg border border-line bg-elevated/70 p-5"
        >
          <label className="block text-lg font-medium leading-8 text-ink">
            <span className="mr-2 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-coptic-soft px-2 text-sm font-semibold tabular-nums text-coptic">
              {idx + 1}
            </span>
            {question.prompt}
          </label>
          <input
            type="text"
            name={`answer_${question.id}`}
            className="input-base h-auto py-4 px-5 font-coptic text-xl"
            placeholder={t("exercise.answerPlaceholder")}
            autoComplete="off"
            minLength={question.minLength}
            maxLength={question.maxLength}
            required
          />
        </div>
      ))}
      <div className="pt-4">
        <button
          type="submit"
          disabled={isPending || !submissionIntentId}
          className={buttonClassName({ className: "w-full px-8 sm:w-auto" })}
        >
          {submitLabel}
          <ArrowRight size={20} />
        </button>
      </div>

      {state?.error && (
        <StatusNotice tone="error" className="mt-4">
          {state.error}
        </StatusNotice>
      )}
    </form>
  );
}
