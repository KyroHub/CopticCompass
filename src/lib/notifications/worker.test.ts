import { beforeEach, describe, expect, it, vi } from "vitest";

import { wakeNotificationEmailWorker } from "./worker";

const mocks = vi.hoisted(() => ({
  getNotificationWorkerBearerToken: vi.fn(),
  invokeSupabaseEdgeFunction: vi.fn(),
}));

vi.mock("@/lib/notifications/config", () => ({
  getNotificationWorkerBearerToken: mocks.getNotificationWorkerBearerToken,
}));

vi.mock("@/lib/supabase/functions", () => ({
  invokeSupabaseEdgeFunction: mocks.invokeSupabaseEdgeFunction,
}));

describe("notification worker wake-up helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails closed when the dedicated worker bearer token is missing", async () => {
    mocks.getNotificationWorkerBearerToken.mockReturnValue(null);

    await expect(
      wakeNotificationEmailWorker({ jobId: "job_123" }),
    ).resolves.toEqual({
      error: "Notification email worker bearer token is not configured.",
      status: 500,
      success: false,
    });

    expect(mocks.invokeSupabaseEdgeFunction).not.toHaveBeenCalled();
  });

  it("wakes the notification worker with the dedicated bearer token", async () => {
    mocks.getNotificationWorkerBearerToken.mockReturnValue(
      "notification-worker-token-1234567890",
    );
    mocks.invokeSupabaseEdgeFunction.mockResolvedValue({
      data: { jobId: "job_123", limit: 1, queued: true, success: true },
      status: 202,
      success: true,
    });

    await expect(
      wakeNotificationEmailWorker({ jobId: "job_123" }),
    ).resolves.toEqual({
      data: { jobId: "job_123", limit: 1, queued: true, success: true },
      status: 202,
      success: true,
    });

    expect(mocks.invokeSupabaseEdgeFunction).toHaveBeenCalledWith(
      "process-notification-email",
      { jobId: "job_123" },
      {
        headers: {
          "X-Notification-Worker-Token": "notification-worker-token-1234567890",
        },
      },
    );
  });
});
