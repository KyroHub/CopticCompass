import type {
  AdminSubmission,
  SubmissionRow,
} from "@/features/submissions/types";
import type { AppSupabaseClient, QueryResult } from "@/lib/supabase/queryTypes";

const ADMIN_SUBMISSION_HISTORY_LIMIT = 50;

type SubmissionsStatus = "pending" | "reviewed";

type SubmissionsQueryError = {
  code?: string;
  message?: string;
} | null;

function hasMeaningfulErrorMessage(error: SubmissionsQueryError) {
  return Boolean(error?.message && error.message.trim().length > 0);
}

function shouldRetryWithoutDeletedAt(error: SubmissionsQueryError) {
  if (!error) {
    return false;
  }

  if (!hasMeaningfulErrorMessage(error)) {
    return true;
  }

  const normalizedMessage = error.message!.toLowerCase();
  return error.code === "42703" || normalizedMessage.includes("deleted_at");
}

function buildStatusQuery(
  supabase: AppSupabaseClient,
  status: SubmissionsStatus,
  limit?: number,
) {
  const baseQuery = supabase
    .from("submissions")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });

  return typeof limit === "number" ? baseQuery.limit(limit) : baseQuery;
}

async function loadAdminSubmissionsByStatus(
  supabase: AppSupabaseClient,
  status: SubmissionsStatus,
  limit?: number,
) {
  const filteredResult = await buildStatusQuery(supabase, status, limit).is(
    "deleted_at",
    null,
  );

  if (!shouldRetryWithoutDeletedAt(filteredResult.error)) {
    return filteredResult;
  }

  return buildStatusQuery(supabase, status, limit);
}

function buildSubmissionsLoadError(
  pendingError: SubmissionsQueryError,
  historyError: SubmissionsQueryError,
) {
  if (pendingError && hasMeaningfulErrorMessage(pendingError)) {
    return { message: pendingError.message!.trim() };
  }

  if (historyError && hasMeaningfulErrorMessage(historyError)) {
    return { message: historyError.message!.trim() };
  }

  return {
    message:
      "Could not load submissions. Ensure migrations are applied and retry.",
  };
}

/**
 * Loads the current user's non-deleted submissions in reverse chronological
 * order for dashboard and lesson-history views.
 */
export async function getUserSubmissions(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<SubmissionRow[]> {
  const { data } = await supabase
    .from("submissions")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return data ?? [];
}

/**
 * Loads all pending submissions plus a capped recent reviewed history window,
 * then enriches the result with the submitting profile email.
 */
export async function getAdminSubmissions(
  supabase: AppSupabaseClient,
): Promise<QueryResult<AdminSubmission[]>> {
  const [pendingSubmissionsResult, historySubmissionsResult] =
    await Promise.all([
      loadAdminSubmissionsByStatus(supabase, "pending"),
      loadAdminSubmissionsByStatus(
        supabase,
        "reviewed",
        ADMIN_SUBMISSION_HISTORY_LIMIT,
      ),
    ]);

  if (
    pendingSubmissionsResult.error ||
    !pendingSubmissionsResult.data ||
    historySubmissionsResult.error ||
    !historySubmissionsResult.data
  ) {
    return {
      data: null,
      error: buildSubmissionsLoadError(
        pendingSubmissionsResult.error,
        historySubmissionsResult.error,
      ),
    };
  }

  const submissions = [
    ...pendingSubmissionsResult.data,
    ...historySubmissionsResult.data,
  ];

  if (submissions.length === 0) {
    return {
      data: [],
      error: null,
    };
  }

  const profileIds = Array.from(
    new Set(submissions.map((submission) => submission.user_id)),
  );

  const profilesResult = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", profileIds);

  if (profilesResult.error) {
    return {
      data: null,
      error: { message: profilesResult.error.message },
    };
  }

  const emailsByProfileId = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile.email]),
  );

  return {
    data: submissions.map((submission) => ({
      ...submission,
      studentEmail: emailsByProfileId.get(submission.user_id) ?? null,
    })),
    error: null,
  };
}
