"use server";

import { getValidatedAdminContext } from "@/actions/admin/shared";
import { wakeNotificationEmailWorker } from "@/lib/notifications/worker";
import { revalidateAdminPaths } from "@/lib/server/revalidation";
import { getFormString, normalizeWhitespace } from "@/lib/validation";

import type { RetryNotificationEmailJobState } from "./states";

type RetryNotificationEmailJobRow = {
  event_id: string;
  job_id: string;
  job_status: string;
};

const RETRY_NOTIFICATION_COPY = {
  invalidJob: "Choose a failed notification job to retry.",
  invalidReason: "Add a retry reason with at least 8 characters.",
  queued: "Notification retry queued.",
  unavailable: "Notification retry is unavailable right now.",
} as const;

function getRetryNotificationEmailJobInput(formData: FormData):
  | {
      error: RetryNotificationEmailJobState;
    }
  | {
      jobId: string;
      reason: string;
    } {
  const jobId = normalizeWhitespace(getFormString(formData, "job_id"));
  const reason = normalizeWhitespace(getFormString(formData, "reason"));

  if (!jobId) {
    return {
      error: {
        message: RETRY_NOTIFICATION_COPY.invalidJob,
        success: false,
      },
    };
  }

  if (reason.length < 8) {
    return {
      error: {
        message: RETRY_NOTIFICATION_COPY.invalidReason,
        success: false,
      },
    };
  }

  return { jobId, reason };
}

async function wakeRetriedNotificationWorker(
  retryResult: RetryNotificationEmailJobRow,
) {
  const invocation = await wakeNotificationEmailWorker({
    jobId: retryResult.job_id,
  });

  if (!invocation.success) {
    console.error("Failed to wake notification email worker after retry.", {
      error: invocation.error,
      eventId: retryResult.event_id,
      jobId: retryResult.job_id,
      status: invocation.status,
    });
  }

  return invocation.success;
}

/**
 * Queues a failed or dead-letter notification email job for one audited manual
 * retry, then wakes the worker. Cron can still recover it if invocation fails.
 */
export async function retryNotificationEmailJob(
  _prevState: RetryNotificationEmailJobState | null,
  formData: FormData,
): Promise<RetryNotificationEmailJobState> {
  const adminContext = await getValidatedAdminContext();
  if (!adminContext) {
    return {
      message: RETRY_NOTIFICATION_COPY.unavailable,
      success: false,
    };
  }

  const input = getRetryNotificationEmailJobInput(formData);
  if ("error" in input) {
    return input.error;
  }

  const { data, error } = await adminContext.supabase.rpc(
    "retry_notification_email_job",
    {
      p_job_id: input.jobId,
      p_reason: input.reason,
    },
  );

  if (error) {
    console.error("Failed to queue notification email job retry.", {
      code: error.code,
      jobId: input.jobId,
      message: error.message,
    });
    return {
      message: error.message || RETRY_NOTIFICATION_COPY.unavailable,
      success: false,
    };
  }

  const retryResult = (data?.[0] ??
    null) as RetryNotificationEmailJobRow | null;
  if (!retryResult?.job_id) {
    return {
      message: RETRY_NOTIFICATION_COPY.unavailable,
      success: false,
    };
  }

  const workerWakeSucceeded = await wakeRetriedNotificationWorker(retryResult);

  revalidateAdminPaths();
  return {
    message: workerWakeSucceeded
      ? RETRY_NOTIFICATION_COPY.queued
      : `${RETRY_NOTIFICATION_COPY.queued} The scheduled worker can still pick it up.`,
    success: true,
  };
}
