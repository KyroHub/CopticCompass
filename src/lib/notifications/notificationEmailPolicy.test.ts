import { describe, expect, it } from "vitest";

import {
  buildNotificationEmailIdempotencyKey,
  classifyNotificationProviderFailure,
  getNotificationRetryDelaySeconds,
} from "../../../supabase/functions/_shared/notificationEmailPolicy";

describe("notification email retry policy", () => {
  it("classifies retryable provider outcomes", () => {
    for (const status of [408, 429, 500, 502, 503]) {
      expect(
        classifyNotificationProviderFailure({
          errorText: "Temporary provider failure",
          status,
        }),
      ).toMatchObject({
        kind: "retryable",
        status,
      });
    }

    expect(
      classifyNotificationProviderFailure({
        errorText: JSON.stringify({ name: "concurrent_idempotent_requests" }),
        status: 409,
      }),
    ).toMatchObject({
      kind: "retryable",
      status: 409,
    });
  });

  it("classifies permanent provider outcomes", () => {
    for (const status of [400, 401, 403, 422]) {
      expect(
        classifyNotificationProviderFailure({
          errorText: "Invalid request",
          status,
        }),
      ).toMatchObject({
        kind: "permanent",
        status,
      });
    }

    expect(
      classifyNotificationProviderFailure({
        errorText: JSON.stringify({ name: "invalid_idempotent_request" }),
        status: 409,
      }),
    ).toMatchObject({
      kind: "permanent",
      status: 409,
    });
  });

  it("keeps retry delays bounded and stable per job", () => {
    const firstDelay = getNotificationRetryDelaySeconds({
      attemptCount: 1,
      jobId: "job_123",
    });
    const repeatedDelay = getNotificationRetryDelaySeconds({
      attemptCount: 1,
      jobId: "job_123",
    });
    const exhaustedScheduleDelay = getNotificationRetryDelaySeconds({
      attemptCount: 99,
      jobId: "job_123",
    });

    expect(firstDelay).toBe(repeatedDelay);
    expect(firstDelay).toBeGreaterThanOrEqual(30);
    expect(exhaustedScheduleDelay).toBeGreaterThan(30_000);
  });

  it("builds stable Resend idempotency keys from event and job identity", () => {
    const key = buildNotificationEmailIdempotencyKey({
      jobId: "job_123",
      notificationEventId: "event_123",
    });

    expect(key).toBe("notification-email/event_123/job_123");
    expect(key.length).toBeLessThanOrEqual(256);
  });
});
