export type NotificationProviderFailureKind = "permanent" | "retryable";

export type NotificationProviderFailure = {
  error: string;
  kind: NotificationProviderFailureKind;
  status: number | null;
};

const RETRY_DELAYS_SECONDS = [60, 300, 1_800, 7_200, 43_200] as const;

function getProviderErrorCode(errorText: string) {
  try {
    const parsed = JSON.parse(errorText) as {
      error?: unknown;
      message?: unknown;
      name?: unknown;
    };
    const candidates = [parsed.name, parsed.error, parsed.message];
    return candidates.find(
      (candidate): candidate is string =>
        typeof candidate === "string" && candidate.trim().length > 0,
    );
  } catch {
    return errorText;
  }
}

export function classifyNotificationProviderFailure(options: {
  errorText: string;
  status: number | null;
}): NotificationProviderFailure {
  const error = options.errorText || "Failed to send notification email.";
  const providerCode = (getProviderErrorCode(error) ?? error).toLowerCase();

  if (options.status === null) {
    return { error, kind: "retryable", status: null };
  }

  if (options.status === 408 || options.status === 429) {
    return { error, kind: "retryable", status: options.status };
  }

  if (options.status === 409) {
    return {
      error,
      kind: providerCode.includes("concurrent_idempotent_requests")
        ? "retryable"
        : "permanent",
      status: options.status,
    };
  }

  if (options.status >= 500) {
    return { error, kind: "retryable", status: options.status };
  }

  return { error, kind: "permanent", status: options.status };
}

function getStableJitterRatio(seed: string) {
  let hash = 0;
  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) % 10_000;
  }

  return (hash / 10_000 - 0.5) * 0.2;
}

export function getNotificationRetryDelaySeconds(options: {
  attemptCount: number;
  jobId: string;
}) {
  const scheduleIndex = Math.max(
    0,
    Math.min(options.attemptCount - 1, RETRY_DELAYS_SECONDS.length - 1),
  );
  const baseDelay = RETRY_DELAYS_SECONDS[scheduleIndex];
  const jitteredDelay = baseDelay * (1 + getStableJitterRatio(options.jobId));

  return Math.max(30, Math.round(jitteredDelay));
}

export function buildNotificationEmailIdempotencyKey(options: {
  jobId: string;
  notificationEventId: string;
}) {
  return `notification-email/${options.notificationEventId}/${options.jobId}`;
}
