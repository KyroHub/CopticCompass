import "server-only";
import { assertServerOnly } from "@/lib/server/assertServerOnly";

const MIN_WORKER_BEARER_TOKEN_LENGTH = 32;

/**
 * Returns the notification-email environment only when the required Resend and
 * sender configuration is present.
 */
export function getNotificationEmailEnv() {
  assertServerOnly("getNotificationEmailEnv");

  const resendApiKey = process.env.RESEND_API_KEY;
  const notificationFromEmail = process.env.NOTIFICATION_FROM_EMAIL;

  if (!resendApiKey || !notificationFromEmail) {
    return null;
  }

  return {
    resendApiKey,
    ownerAlertEmail: process.env.OWNER_ALERT_EMAIL ?? null,
    notificationFromEmail,
  };
}

/**
 * Reports whether notification email delivery is configured in the current
 * environment.
 */
function _hasNotificationEmailEnv() {
  return getNotificationEmailEnv() !== null;
}

/**
 * Returns the shared auth token used to wake the queued notification worker.
 * The service-role key is still used for database access, but it is no longer
 * reused as this function-to-function caller secret.
 */
export function getNotificationWorkerBearerToken() {
  assertServerOnly("getNotificationWorkerBearerToken");

  const token = process.env.NOTIFICATION_WORKER_BEARER_TOKEN?.trim();
  if (!token || token.length < MIN_WORKER_BEARER_TOKEN_LENGTH) {
    return null;
  }

  return token;
}
