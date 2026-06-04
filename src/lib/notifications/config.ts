import "server-only";
import { assertServerOnly } from "@/lib/server/assertServerOnly";

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
