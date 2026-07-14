import "server-only";
import { getNotificationWorkerBearerToken } from "@/lib/notifications/config";
import { assertServerOnly } from "@/lib/server/assertServerOnly";
import {
  invokeSupabaseEdgeFunction,
  type InvokeSupabaseEdgeFunctionResult,
} from "@/lib/supabase/functions";
import type { Json } from "@/types/supabase";

const PROCESS_NOTIFICATION_EMAIL_FUNCTION = "process-notification-email";

type WakeNotificationEmailWorkerPayload = {
  jobId?: string;
  limit?: number;
};

type WakeNotificationEmailWorkerResult = InvokeSupabaseEdgeFunctionResult<{
  jobId?: string;
  limit: number;
  queued: boolean;
  success: boolean;
}>;

/**
 * Wakes the queued notification email worker with its dedicated auth token.
 * Returning a non-throwing envelope keeps durable job creation independent from
 * low-latency worker wake-up.
 */
export async function wakeNotificationEmailWorker(
  payload: WakeNotificationEmailWorkerPayload,
): Promise<WakeNotificationEmailWorkerResult> {
  assertServerOnly("wakeNotificationEmailWorker");

  const bearerToken = getNotificationWorkerBearerToken();
  if (!bearerToken) {
    return {
      error: "Notification email worker bearer token is not configured.",
      status: 500,
      success: false,
    };
  }

  return invokeSupabaseEdgeFunction(
    PROCESS_NOTIFICATION_EMAIL_FUNCTION,
    {
      ...payload,
    } satisfies Json,
    {
      headers: {
        "X-Notification-Worker-Token": bearerToken,
      },
    },
  );
}
